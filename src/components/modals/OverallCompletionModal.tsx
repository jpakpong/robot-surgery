/**
 * Overall Curriculum Completion Modal
 * Displayed when both Task 1 and Task 2 are completed.
 * Features Student Name-Surname, Student ID, total attempts, combined time, and scores.
 */

import React, { useEffect } from 'react';
import {
  Trophy,
  Award,
  Clock,
  RotateCcw,
  Home,
  CheckCircle2,
  Printer,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProgressData } from '../../types/simulation';

interface OverallCompletionModalProps {
  isOpen: boolean;
  progress: UserProgressData;
  onClose: () => void;
  onRedoTask: (taskId: 1 | 2 | 3) => void;
  onResetAll?: () => void;
}

export const OverallCompletionModal: React.FC<OverallCompletionModalProps> = ({
  isOpen,
  progress,
  onClose,
  onRedoTask,
  onResetAll,
}) => {
  useEffect(() => {
    if (isOpen) {
      const end = Date.now() + 2.5 * 1000;
      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 60,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 60,
          origin: { x: 1 },
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    if (!secs) return '00:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalTime =
    (progress.task1.bestTimeSeconds || 0) +
    (progress.task2.bestTimeSeconds || 0) +
    (progress.task3?.bestTimeSeconds || 0);
  const totalScore =
    (progress.task1.bestScore || 0) +
    (progress.task2.bestScore || 0) +
    (progress.task3?.bestScore || 0);
  const totalAttempts =
    (progress.task1.attemptsCount || 1) +
    (progress.task2.attemptsCount || 1) +
    (progress.task3?.attemptsCount || 0);

  const studentName = progress.studentInfo?.fullName || 'Baby Doe';
  const studentId = progress.studentInfo?.studentId || '69050123';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-center my-6 print:shadow-none print:border-none print:max-w-none">
        
        {/* Top Trophy Banner */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 text-amber-500 border border-amber-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Curriculum Mastery Certificate</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
          SURGICAL ROBOTICS MASTERY
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
          All missions in Basic Instrument Control, Object Manipulation, and Tri-Color Sequential Sorting have been successfully accomplished.
        </p>

        {/* Student Credential Badge */}
        <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5 mb-5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-900 font-bold uppercase tracking-wider block font-mono">
                Student Name - Surname
              </span>
              <span className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                {studentName}
              </span>
            </div>
          </div>

          <div className="border-t sm:border-t-0 sm:border-l border-emerald-200/90 pt-2 sm:pt-0 sm:pl-4">
            <span className="text-[10px] text-emerald-900 font-bold uppercase tracking-wider block font-mono">
              Student ID
            </span>
            <span className="text-base sm:text-lg font-black text-slate-950 font-mono leading-tight">
              {studentId}
            </span>
          </div>
        </div>

        {/* Aggregate Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 rounded-2xl p-3 sm:p-4 mb-5 border border-slate-100 text-center">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Combined Score</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-0.5">
              {totalScore} / 150
            </span>
            <span className="text-[10px] text-slate-500 font-medium">100% Complete</span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-200">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Combined Time</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono mt-0.5">
              {formatTime(totalTime)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">All 3 Modules</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-500 font-bold uppercase">Total Attempts</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-0.5">
              #{totalAttempts}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Recorded Locally</span>
          </div>
        </div>

        {/* Task by Task Performance Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-left">
          
          {/* Task 1 Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Task 1: Control
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Missions:</span>
              <span className="font-bold text-slate-800 font-mono">5 / 5 Done</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Score:</span>
              <span className="font-bold text-emerald-600 font-mono">{progress.task1.bestScore} / 50 PTS</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Best Time:</span>
              <span className="font-bold text-slate-800 font-mono">{formatTime(progress.task1.bestTimeSeconds)}</span>
            </div>
          </div>

          {/* Task 2 Card (Brown) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Task 2: Grasp
              </span>
              <CheckCircle2 className="w-4 h-4 text-amber-800" />
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Missions:</span>
              <span className="font-bold text-slate-800 font-mono">5 / 5 Done</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Score:</span>
              <span className="font-bold text-emerald-600 font-mono">{progress.task2.bestScore} / 50 PTS</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Best Time:</span>
              <span className="font-bold text-slate-800 font-mono">{formatTime(progress.task2.bestTimeSeconds)}</span>
            </div>
          </div>

          {/* Task 3 Card (Purple) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Task 3: Sorting
              </span>
              <CheckCircle2 className="w-4 h-4 text-purple-700" />
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Missions:</span>
              <span className="font-bold text-slate-800 font-mono">3 / 3 Done</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Score:</span>
              <span className="font-bold text-emerald-600 font-mono">{progress.task3?.bestScore || 0} / 50 PTS</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Best Time:</span>
              <span className="font-bold text-slate-800 font-mono">{formatTime(progress.task3?.bestTimeSeconds || 0)}</span>
            </div>
          </div>

        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-col gap-2 print:hidden">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
            >
              <Home className="w-4 h-4" />
              <span>Return to Task Menu</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
          </div>

          {onResetAll && (
            <button
              onClick={onResetAll}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Refresh Training & Register New Student</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
