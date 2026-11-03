/**
 * Main Simulation Screen
 * Redesigned for 11" iPad landscape and tablet screens:
 * 1. Automatic mission advancement: when a mission is finished, it auto-advances to the next mission.
 * 2. Minimized navigation header and mission instruction banner.
 * 3. 100% viewport fit (zero vertical scroll required on 11" display).
 * 4. Resized circular pendants.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Trophy,
  CheckCircle2,
  Sparkles,
  User,
} from 'lucide-react';
import { Mission, UserProgressData } from '../../types/simulation';
import { getMissionsForTask } from '../../missions/missionEngine';
import { useRobotSimulation } from '../../hooks/useRobotSimulation';
import { useMissionEngine } from '../../hooks/useMissionEngine';
import { DoctorView } from '../views/DoctorView';
import { RobotView } from '../views/RobotView';
import { InstructionPanel } from '../panels/InstructionPanel';
import { ControlPanel } from '../panels/ControlPanel';
import { TaskCompletionModal } from '../modals/TaskCompletionModal';
import { OverallCompletionModal } from '../modals/OverallCompletionModal';
import { soundManager } from '../../utils/audio';

interface SimulationScreenProps {
  taskId: 1 | 2 | 3;
  progress: UserProgressData;
  onMissionCompleted: (missionId: string, score: number, timeSeconds: number) => void;
  onTaskCompleted: (taskId: 1 | 2 | 3, finalScore: number, timeSeconds: number) => void;
  onRedoTask: (taskId: 1 | 2 | 3) => void;
  onBackToMenu: () => void;
}

export const SimulationScreen: React.FC<SimulationScreenProps> = ({
  taskId,
  progress,
  onMissionCompleted,
  onTaskCompleted,
  onRedoTask,
  onBackToMenu,
}) => {
  const missions = getMissionsForTask(taskId);
  const [currentMissionIndex, setCurrentMissionIndex] = useState<number>(0);
  const currentMission: Mission = missions[currentMissionIndex] || missions[0];

  const taskTitle =
    taskId === 1
      ? 'Basic Instrument Control'
      : taskId === 2
      ? 'Object Manipulation'
      : 'Tri-Color Sequential Sorting';

  const [soundOn, setSoundOn] = useState<boolean>(progress.soundEnabled);
  const [showTaskCompletion, setShowTaskCompletion] = useState<boolean>(false);
  const [showOverallSummary, setShowOverallSummary] = useState<boolean>(false);
  const [totalTaskTime, setTotalTaskTime] = useState<number>(0);
  const [autoAdvanceBanner, setAutoAdvanceBanner] = useState<{
    visible: boolean;
    completedMissionNum: number;
    nextMissionNum: number;
  }>({ visible: false, completedMissionNum: 1, nextMissionNum: 2 });

  const autoAdvanceTimerRef = useRef<number | null>(null);

  // Initialize shared robot simulation state
  const {
    robotState,
    objectState,
    objectsState,
    targets,
    obstacles,
    hasCollided,
    collisionWarning,
    isContactingObject,
    speedMode,
    setSpeedMode,
    startMove,
    stopMove,
    openGripper,
    closeGripper,
    recalibratePosition,
    loadMissionState,
  } = useRobotSimulation(currentMission);

  const currentMissionIndexRef = useRef<number>(0);
  currentMissionIndexRef.current = currentMissionIndex;

  // Switch missions cleanly
  const switchMission = useCallback(
    (index: number) => {
      const nextMission = missions[index];
      if (nextMission) {
        currentMissionIndexRef.current = index;
        setCurrentMissionIndex(index);
        loadMissionState(nextMission);
        setAutoAdvanceBanner({ visible: false, completedMissionNum: index + 1, nextMissionNum: index + 2 });
      }
    },
    [missions, loadMissionState]
  );

  // When task changes
  useEffect(() => {
    switchMission(0);
    setShowTaskCompletion(false);
  }, [taskId, switchMission]);

  // Handle mission completion and automatic advancement
  const handleMissionFinish = useCallback(
    (missionId: string, score: number, timeSeconds: number) => {
      const activeIdx = currentMissionIndexRef.current;
      onMissionCompleted(missionId, score, timeSeconds);
      setTotalTaskTime((prev) => prev + timeSeconds);

      // If it's NOT the last mission, automatically continue to next mission!
      if (activeIdx < missions.length - 1) {
        const nextIdx = activeIdx + 1;
        setAutoAdvanceBanner({
          visible: true,
          completedMissionNum: activeIdx + 1,
          nextMissionNum: nextIdx + 1,
        });

        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
        }

        autoAdvanceTimerRef.current = window.setTimeout(() => {
          switchMission(nextIdx);
        }, 1200);
      } else {
        // Last mission (Mission 5) completed: finalize task!
        onTaskCompleted(taskId, 50, totalTaskTime + timeSeconds);
        const t1Done = taskId === 1 ? true : progress.task1.isCompleted;
        const t2Done = taskId === 2 ? true : progress.task2.isCompleted;
        const t3Done = taskId === 3 ? true : progress.task3.isCompleted;
        const allDone = t1Done && t2Done && t3Done;

        setTimeout(() => {
          if (allDone) {
            setShowOverallSummary(true);
          } else {
            setShowTaskCompletion(true);
          }
        }, 800);
      }
    },
    [missions.length, onMissionCompleted, onTaskCompleted, switchMission, taskId, totalTaskTime, progress]
  );

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const {
    currentStep,
    currentStepIndex,
    totalSteps,
    isStepSuccess,
    stepSuccessMsg,
    isPaused,
    elapsedTime,
    instructionFlash,
    pauseSimulation,
    resumeSimulation,
    resetCurrentMission,
    flashInstructionAgain,
  } = useMissionEngine({
    mission: currentMission,
    tipPos: robotState.cartesianPosition,
    gripperRatio: robotState.gripperOpenRatio,
    object: objectState,
    objects: objectsState,
    targets,
    obstacles,
    hasCollided,
    onMissionCompleted: handleMissionFinish,
  });

  const toggleSound = () => {
    const nextVal = !soundOn;
    setSoundOn(nextVal);
    soundManager.setEnabled(nextVal);
  };

  const handleRedoTask = () => {
    setShowTaskCompletion(false);
    onRedoTask(taskId);
    switchMission(0);
  };

  const handleRepeatCurrentMission = () => {
    loadMissionState(currentMission);
    resetCurrentMission();
  };

  const currentTaskRecord =
    taskId === 1 ? progress.task1 : taskId === 2 ? progress.task2 : progress.task3;

  return (
    <div className="h-screen max-h-screen w-full bg-slate-100 flex flex-col justify-between overflow-hidden select-none p-2 sm:p-2.5">
      
      {/* 1. Minimized Top Clinical Ribbon */}
      <header className="bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shrink-0 shadow-2xs mb-1.5 flex items-center justify-between gap-2">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-none truncate max-w-[200px] sm:max-w-none">
              {taskTitle}
            </h1>
          </div>
        </div>

        {/* Center: Compact Mission Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
          {missions.map((m, idx) => {
            const isDone = currentTaskRecord.completedMissions.includes(m.id);
            const isCurrent = idx === currentMissionIndex;
            return (
              <button
                key={m.id}
                onClick={() => switchMission(idx)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-white text-sky-700 shadow-2xs font-bold'
                    : isDone
                    ? 'text-emerald-700 hover:bg-white/60'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title={m.title}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold ${
                    isCurrent
                      ? 'bg-sky-600 text-white'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="hidden md:inline">{m.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Student Info, Score Badge & Audio Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Student Name & ID Badge shown right before score box */}
          {progress.studentInfo?.fullName && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200/80 truncate max-w-[130px] sm:max-w-xs">
              <User className="w-3 h-3 text-sky-600 shrink-0" />
              <span className="truncate">{progress.studentInfo.fullName}</span>
              {progress.studentInfo.studentId && (
                <span className="text-slate-400 font-mono text-[10px] shrink-0 hidden sm:inline">
                  • ID: {progress.studentInfo.studentId}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold font-mono shrink-0">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span>{currentTaskRecord.latestScore || currentTaskRecord.bestScore}/50</span>
          </div>

          <button
            onClick={toggleSound}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title={soundOn ? 'Mute' : 'Unmute'}
          >
            {soundOn ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </header>

      {/* 2. Minimized Instruction Banner */}
      <div className="shrink-0 mb-1.5">
        <InstructionPanel
          taskTitle={taskTitle}
          missionNumber={currentMissionIndex + 1}
          missionTitle={currentMission.title}
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          isStepSuccess={isStepSuccess}
          stepSuccessMsg={stepSuccessMsg}
          elapsedTime={elapsedTime}
          instructionFlash={instructionFlash}
        />
      </div>

      {/* 3. Dual 3D Viewports (Doctor View on Left, Robot View on Right) */}
      <main className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-2 gap-2 mb-1.5 relative">
        
        {/* Doctor View */}
        <div className="w-full h-full relative min-h-0">
          <DoctorView
            tipPos={robotState.cartesianPosition}
            gripperRatio={robotState.gripperOpenRatio}
            targets={targets}
            obstacles={obstacles}
            object={objectState}
            objects={objectsState}
            highlightTargetId={currentStep?.highlightTargetId}
            highlightObjectId={currentStep?.highlightObjectId}
            isColliding={hasCollided}
            isContactingObject={isContactingObject}
          />
        </div>

        {/* Robot View */}
        <div className="w-full h-full relative min-h-0">
          <RobotView
            joints={robotState.joints}
            tipPos={robotState.cartesianPosition}
            gripperRatio={robotState.gripperOpenRatio}
            targets={targets}
            obstacles={obstacles}
            object={objectState}
            objects={objectsState}
            highlightTargetId={currentStep?.highlightTargetId}
            highlightObjectId={currentStep?.highlightObjectId}
            isColliding={hasCollided}
            isContactingObject={isContactingObject}
          />
        </div>

        {/* Automatic Mission Advance Celebration Banner Overlay */}
        {autoAdvanceBanner.visible && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-emerald-600/95 text-white px-5 py-2.5 rounded-2xl shadow-xl border border-emerald-400 backdrop-blur-md animate-fadeIn flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 animate-bounce" />
            <div>
              <span className="font-bold text-sm block">
                Mission {autoAdvanceBanner.completedMissionNum} Complete! (+10 pts)
              </span>
              <span className="text-[11px] text-emerald-100 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" />
                Auto-continuing to Mission {autoAdvanceBanner.nextMissionNum}...
              </span>
            </div>
          </div>
        )}
      </main>

      {/* 4. Streamlined Master Console Pendant (Height-fitted for 11" iPad) */}
      <ControlPanel
        requiredControl={currentStep?.requiredControl}
        activeDirection={robotState.activeDirection}
        gripperRatio={robotState.gripperOpenRatio}
        speedMode={speedMode}
        soundEnabled={soundOn}
        isPaused={isPaused}
        isGrasped={objectState?.isGrasped}
        isContactingObject={isContactingObject}
        onStartMove={startMove}
        onStopMove={stopMove}
        onOpenGripper={openGripper}
        onCloseGripper={closeGripper}
        onToggleSpeed={() => setSpeedMode((prev) => (prev === 'normal' ? 'fine' : 'normal'))}
        onToggleSound={toggleSound}
        onTogglePause={isPaused ? resumeSimulation : pauseSimulation}
        onResetMission={handleRepeatCurrentMission}
        onRecalibrate={recalibratePosition}
        onShowInstructionAgain={flashInstructionAgain}
        onBackToMenu={onBackToMenu}
      />

      {/* Task Completion Summary Modal (Single Task finished) */}
      <TaskCompletionModal
        isOpen={showTaskCompletion && !showOverallSummary}
        taskId={taskId}
        taskTitle={taskTitle}
        missions={missions}
        taskRecord={currentTaskRecord}
        totalTimeSeconds={totalTaskTime}
        onRedoTask={handleRedoTask}
        onBackToMenu={onBackToMenu}
      />

      {/* Overall Curriculum Mastery Modal (Both Tasks completed) */}
      <OverallCompletionModal
        isOpen={showOverallSummary}
        progress={progress}
        onClose={onBackToMenu}
        onRedoTask={handleRedoTask}
        onResetAll={onBackToMenu}
      />
    </div>
  );
};
