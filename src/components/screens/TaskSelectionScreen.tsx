/**
 * Task Selection Screen
 * Requires medical students to input their Name - Surname and Student ID.
 * Once entered, credentials are permanently locked during Task 1-2 training.
 * To change student info, students must use the Refresh button on the starting Welcome page.
 */

import React, { useState } from 'react';
import {
  Compass,
  Grab,
  Layers,
  CheckCircle2,
  Trophy,
  Play,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  User,
  IdCard,
  AlertCircle,
  Award,
  Lock,
} from 'lucide-react';
import { UserProgressData } from '../../types/simulation';

interface TaskSelectionScreenProps {
  progress: UserProgressData;
  onSelectTask: (taskId: 1 | 2 | 3) => void;
  onUpdateStudentInfo: (info: { fullName: string; studentId: string }) => void;
  onBackToWelcome: () => void;
  onOpenOverallSummary: () => void;
}

export const TaskSelectionScreen: React.FC<TaskSelectionScreenProps> = ({
  progress,
  onSelectTask,
  onUpdateStudentInfo,
  onBackToWelcome,
  onOpenOverallSummary,
}) => {
  const isRegisteredAndLocked = Boolean(
    progress.studentInfo?.fullName?.trim() && progress.studentInfo?.studentId?.trim()
  );

  const [fullName, setFullName] = useState<string>(progress.studentInfo?.fullName || '');
  const [studentId, setStudentId] = useState<string>(progress.studentInfo?.studentId || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    if (!secs) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalScore =
    (progress.task1.bestScore || 0) +
    (progress.task2.bestScore || 0) +
    (progress.task3.bestScore || 0);
  const allTasksCompleted =
    progress.task1.isCompleted && progress.task2.isCompleted && progress.task3.isCompleted;

  const handleStartTask = (taskId: 1 | 2 | 3) => {
    if (!isRegisteredAndLocked) {
      if (!fullName.trim() || !studentId.trim()) {
        setErrorMsg('Please enter both your Name - Surname and Student ID to begin simulation.');
        return;
      }
      setErrorMsg(null);
      onUpdateStudentInfo({ fullName: fullName.trim(), studentId: studentId.trim() });
    }
    onSelectTask(taskId);
  };

  const activeName = isRegisteredAndLocked ? progress.studentInfo.fullName : fullName;
  const activeId = isRegisteredAndLocked ? progress.studentInfo.studentId : studentId;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            onClick={onBackToWelcome}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-xl shadow-2xs transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-amber-700" />
            <span>Welcome Page</span>
          </button>

          {/* Right Header: Student Info (Shows before score box) & Total Score */}
          <div className="flex items-center gap-2 sm:gap-3">
            {activeName.trim() && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 text-xs font-semibold border border-emerald-200/90 max-w-[200px] sm:max-w-xs truncate">
                {isRegisteredAndLocked ? (
                  <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                )}
                <span className="truncate">{activeName}</span>
                {activeId.trim() && (
                  <span className="text-emerald-800/80 font-mono text-[11px] shrink-0">
                    • ID: {activeId}
                  </span>
                )}
              </div>
            )}

            {/* Score Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold shrink-0">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>{totalScore} / 150 PTS</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 w-full space-y-6">
        
        {/* Title Header */}
        <div className="text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preclinical Medical Education Curriculum</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Surgical Robotics Training Modules
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
            Complete all modules to master directional instrument control, specimen manipulation, and multi-color sequential sorting.
          </p>
        </div>

        {/* Student Credential Registration & Lock Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg ${
                  isRegisteredAndLocked ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isRegisteredAndLocked ? <Lock className="w-4 h-4 text-amber-700" /> : <User className="w-4 h-4 text-amber-700" />}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Student Identification</span>
                  {isRegisteredAndLocked && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Active & Locked During Training
                    </span>
                  )}
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {isRegisteredAndLocked
                    ? 'Student info is locked for active training tasks 1 & 2.'
                    : 'Enter your credentials before beginning simulation. They will be locked for the session.'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Name - Surname
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={activeName}
                  disabled={isRegisteredAndLocked}
                  readOnly={isRegisteredAndLocked}
                  onChange={(e) => {
                    if (!isRegisteredAndLocked) {
                      setFullName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }
                  }}
                  placeholder="Baby Doe"
                  className={`w-full px-3 py-2 pl-8 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                    isRegisteredAndLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-900 cursor-not-allowed select-none font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white'
                  }`}
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {isRegisteredAndLocked && (
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Student ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={activeId}
                  disabled={isRegisteredAndLocked}
                  readOnly={isRegisteredAndLocked}
                  onChange={(e) => {
                    if (!isRegisteredAndLocked) {
                      setStudentId(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }
                  }}
                  placeholder="69050123"
                  className={`w-full px-3 py-2 pl-8 rounded-xl border text-xs sm:text-sm font-mono font-medium transition-all ${
                    isRegisteredAndLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-900 cursor-not-allowed select-none font-bold'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white'
                  }`}
                />
                <IdCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {isRegisteredAndLocked && (
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>
          </div>

          {/* Locked Notice */}
          {isRegisteredAndLocked ? (
            <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Credentials locked during training. To reset student info, use the starting page:</span>
              </span>
              <button
                onClick={onBackToWelcome}
                className="text-rose-600 hover:text-rose-700 font-bold shrink-0 underline ml-1"
              >
                Go to Refresh
              </button>
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-400 font-medium">
              Note: Once simulation begins, credentials cannot be edited until full training summary or reset.
            </div>
          )}

          {errorMsg && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 font-semibold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* All Tasks Completed Mastery Banner */}
        {allTasksCompleted && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 max-w-2xl mx-auto animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-amber-300" />
              </div>
              <div className="text-left">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-200 block">
                  All 3 Modules Accomplished (150/150 PTS)
                </span>
                <span className="font-extrabold text-sm sm:text-base">
                  View Full Mastery Summary & Certificate
                </span>
              </div>
            </div>

            <button
              onClick={onOpenOverallSummary}
              className="py-2.5 px-4 rounded-xl bg-amber-400 text-slate-950 font-black text-xs sm:text-sm hover:bg-amber-300 transition-colors shadow-md shadow-amber-400/30 shrink-0 active:scale-95"
            >
              View Summary
            </button>
          </div>
        )}

        {/* Task Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          
          {/* ----------------- TASK 1 CARD (GREEN) ----------------- */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-green-600" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200">
                  Task 1
                </span>

                {progress.task1.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed (50/50)
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Not Completed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300 shrink-0">
                  <Compass className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Basic Instrument Control
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">5 Sequential Missions</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-4 font-normal">
                Master lateral (X), vertical (Y), and endoscopic depth (Z) robotic positioning around anatomical barriers.
              </p>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 mb-4 text-center text-xs border border-slate-100">
                <div>
                  <span className="text-slate-500 block text-[10px] font-medium">Best Score</span>
                  <span className="font-bold text-emerald-700 text-xs font-mono">
                    {progress.task1.bestScore} / 50
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-slate-500 block text-[10px] font-medium">Best Time</span>
                  <span className="font-bold text-slate-900 text-xs font-mono">
                    {formatTime(progress.task1.bestTimeSeconds)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-medium">Attempts</span>
                  <span className="font-bold text-slate-900 text-xs font-mono">
                    #{progress.task1.attemptsCount || 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStartTask(1)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                progress.task1.isCompleted
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
              }`}
            >
              {progress.task1.isCompleted ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Redo Task 1</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Start Task 1</span>
                </>
              )}
            </button>
          </div>

          {/* ----------------- TASK 2 CARD (BROWN) ----------------- */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-700 to-amber-900" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100/90 text-amber-950 border border-amber-300">
                  Task 2
                </span>

                {progress.task2.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed (50/50)
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Not Completed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-300 shrink-0">
                  <Grab className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                    Object Manipulation
                  </h3>
                  <span className="text-[11px] text-amber-800 font-semibold">5 Sequential Missions</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Learn surgical specimen approach, micro-jaw clamping, elevation, transfer, and controlled release.
              </p>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 mb-4 text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Best Score</span>
                  <span className="font-bold text-emerald-600 text-xs font-mono">
                    {progress.task2.bestScore} / 50
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Best Time</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">
                    {formatTime(progress.task2.bestTimeSeconds)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Attempts</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">
                    #{progress.task2.attemptsCount || 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStartTask(2)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                progress.task2.isCompleted
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                  : 'bg-amber-800 hover:bg-amber-900 text-white shadow-amber-900/25'
              }`}
            >
              {progress.task2.isCompleted ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-amber-900" />
                  <span>Redo Task 2</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Start Task 2</span>
                </>
              )}
            </button>
          </div>

          {/* ----------------- TASK 3 CARD (PURPLE) ----------------- */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-600" />

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-900 border border-purple-200">
                  Task 3
                </span>

                {progress.task3?.isCompleted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed (50/50)
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Not Completed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-300 shrink-0">
                  <Layers className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    Tri-Color Sequential Sorting
                  </h3>
                  <span className="text-[11px] text-purple-700 font-bold">3 Progressive Missions • 50 PTS</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Transfer 3 color-coded specimens in strict order: Red (no barrier, 10 pts), Amber (low barrier, 20 pts), and Cyan (high barrier, 20 pts).
              </p>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-2.5 mb-4 text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Best Score</span>
                  <span className="font-bold text-emerald-600 text-xs font-mono">
                    {progress.task3?.bestScore || 0} / 50
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Best Time</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">
                    {formatTime(progress.task3?.bestTimeSeconds || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Attempts</span>
                  <span className="font-bold text-slate-800 text-xs font-mono">
                    #{progress.task3?.attemptsCount || 0}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStartTask(3)}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                progress.task3?.isCompleted
                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25'
              }`}
            >
              {progress.task3?.isCompleted ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                  <span>Redo Task 3</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>Start Task 3</span>
                </>
              )}
            </button>
          </div>

        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-[11px] text-slate-400">
        Progress and student profile are preserved locally during the session.
      </footer>
    </div>
  );
};
