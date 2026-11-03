/**
 * Task Completion Summary Modal
 * Shows full breakdown of all 5 missions, score out of 50, attempts, and redo options.
 */

import React, { useEffect } from 'react';
import { Award, Clock, RotateCcw, Home, CheckCircle, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Mission, TaskRecord } from '../../types/simulation';

interface TaskCompletionModalProps {
  isOpen: boolean;
  taskId: 1 | 2 | 3;
  taskTitle: string;
  missions: Mission[];
  taskRecord: TaskRecord;
  totalTimeSeconds: number;
  onRedoTask: () => void;
  onBackToMenu: () => void;
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
  isOpen,
  taskId,
  taskTitle,
  missions,
  taskRecord,
  totalTimeSeconds,
  onRedoTask,
  onBackToMenu,
}) => {
  useEffect(() => {
    if (isOpen) {
      const end = Date.now() + 2 * 1000;
      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
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
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-center my-8">
        {/* Top Trophy Banner */}
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-500 border border-amber-200/80 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Trophy className="w-10 h-10" />
        </div>

        <span className="text-xs font-black tracking-widest text-sky-700 bg-sky-50 px-3.5 py-1.5 rounded-full uppercase border border-sky-200">
          Task {taskId} Completed
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3 mb-1">
          TASK COMPLETED!
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
          {taskId === 3
            ? 'Congratulations! You have successfully mastered all sequential barrier sorting missions in ' + taskTitle + '.'
            : 'Congratulations! You have successfully mastered all five clinical robotic maneuvers in ' + taskTitle + '.'}
        </p>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-medium">Final Score</span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5">50 / 50</span>
            <span className="text-[10px] text-slate-400">100% Accuracy</span>
          </div>

          <div className="flex flex-col items-center border-x border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium">Total Time</span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5">
              {formatTime(totalTimeSeconds || taskRecord.bestTimeSeconds || 60)}
            </span>
            <span className="text-[10px] text-slate-400">Best: {formatTime(taskRecord.bestTimeSeconds || totalTimeSeconds || 60)}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-medium">Attempts</span>
            <span className="text-2xl font-black text-sky-600 mt-0.5">
              #{taskRecord.attemptsCount || 1}
            </span>
            <span className="text-[10px] text-slate-400">Recorded Locally</span>
          </div>
        </div>

        {/* Completed Missions Breakdown */}
        <div className="text-left mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Mission Performance Breakdown
          </h4>
          <div className="space-y-2">
            {missions.map((m, idx) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-800">
                    Mission {idx + 1}: {m.title}
                  </span>
                </div>
                <span className="font-bold text-emerald-600 font-mono">
                  +{m.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRedoTask}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REDO TASK</span>
          </button>

          <button
            onClick={onBackToMenu}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>BACK TO TASK MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
