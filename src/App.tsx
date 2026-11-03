/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProgressData } from './types/simulation';
import {
  loadUserProgress,
  recordMissionCompletion,
  recordTaskCompletion,
  resetTaskProgress,
  updateStudentInfo,
  clearAllProgress,
} from './utils/storage';
import { getMissionsForTask } from './missions/missionEngine';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { TaskSelectionScreen } from './components/screens/TaskSelectionScreen';
import { TaskIntroModal } from './components/screens/TaskIntroModal';
import { SimulationScreen } from './components/screens/SimulationScreen';
import { OverallCompletionModal } from './components/modals/OverallCompletionModal';
import { ConfirmResetModal } from './components/modals/ConfirmResetModal';

type ScreenState = 'welcome' | 'task_selection' | 'task_intro' | 'simulation';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('welcome');
  const [activeTaskId, setActiveTaskId] = useState<1 | 2 | 3>(1);
  const [progress, setProgress] = useState<UserProgressData>(() => loadUserProgress());
  const [showOverallSummary, setShowOverallSummary] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Reload progress on mount
  useEffect(() => {
    setProgress(loadUserProgress());
  }, []);

  const handleStart = () => {
    setScreen('task_selection');
  };

  const handleUpdateStudentInfo = (info: { fullName: string; studentId: string }) => {
    setProgress((prev) => updateStudentInfo(prev, info));
  };

  const handleSelectTask = (taskId: 1 | 2 | 3) => {
    setActiveTaskId(taskId);
    setScreen('task_intro');
  };

  const handleStartSimulation = () => {
    setScreen('simulation');
  };

  const handleMissionCompleted = (missionId: string, score: number, timeSeconds: number) => {
    setProgress((prev) =>
      recordMissionCompletion(prev, activeTaskId, missionId, score, timeSeconds)
    );
  };

  const handleTaskCompleted = (taskId: 1 | 2 | 3, finalScore: number, timeSeconds: number) => {
    setProgress((prev) =>
      recordTaskCompletion(prev, taskId, finalScore, timeSeconds)
    );
  };

  const handleRedoTask = (taskId: 1 | 2 | 3) => {
    setProgress((prev) => resetTaskProgress(prev, taskId));
  };

  const handleClearProgress = () => {
    setShowResetConfirm(true);
  };

  const handleExecuteReset = () => {
    const reset = clearAllProgress();
    setProgress(reset);
    setShowResetConfirm(false);
    setShowOverallSummary(false);
    setScreen('welcome');
  };

  const handleBackToMenu = () => {
    setScreen('task_selection');
  };

  const handleBackToWelcome = () => {
    setScreen('welcome');
  };

  const hasStoredProgress =
    (progress.task1.bestScore || 0) > 0 ||
    (progress.task2.bestScore || 0) > 0 ||
    (progress.task3?.bestScore || 0) > 0;

  const currentTaskTitle =
    activeTaskId === 1
      ? 'Basic Instrument Control'
      : activeTaskId === 2
      ? 'Object Manipulation'
      : 'Tri-Color Sequential Sorting';
  const currentMissions = getMissionsForTask(activeTaskId);

  return (
    <div className="w-full min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      {screen === 'welcome' && (
        <WelcomeScreen
          onStart={handleStart}
          onClearProgress={handleClearProgress}
          hasStoredProgress={hasStoredProgress}
          studentInfo={progress.studentInfo}
        />
      )}

      {screen === 'task_selection' && (
        <TaskSelectionScreen
          progress={progress}
          onSelectTask={handleSelectTask}
          onUpdateStudentInfo={handleUpdateStudentInfo}
          onBackToWelcome={handleBackToWelcome}
          onOpenOverallSummary={() => setShowOverallSummary(true)}
        />
      )}

      {screen === 'task_intro' && (
        <TaskIntroModal
          taskId={activeTaskId}
          taskTitle={currentTaskTitle}
          missions={currentMissions}
          onStartSimulation={handleStartSimulation}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {screen === 'simulation' && (
        <SimulationScreen
          taskId={activeTaskId}
          progress={progress}
          onMissionCompleted={handleMissionCompleted}
          onTaskCompleted={handleTaskCompleted}
          onRedoTask={handleRedoTask}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {/* Global Overall Completion Summary Modal */}
      <OverallCompletionModal
        isOpen={showOverallSummary}
        progress={progress}
        onClose={() => setShowOverallSummary(false)}
        onRedoTask={handleRedoTask}
        onResetAll={handleClearProgress}
      />

      {/* In-App Confirmation Modal for Refresh/Reset */}
      <ConfirmResetModal
        isOpen={showResetConfirm}
        onConfirm={handleExecuteReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
