/**
 * Mission Success Modal
 * Displays score awarded (+10 points), elapsed time, and navigation to the next mission.
 */

import React from 'react';
import { Award, ArrowRight, RotateCcw, Clock, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MissionSuccessModalProps {
  isOpen: boolean;
  missionNumber: number;
  missionTitle: string;
  pointsAwarded: number;
  timeSeconds: number;
  hasNextMission: boolean;
  onNextMission: () => void;
  onRepeatMission: () => void;
  onViewTaskSummary: () => void;
}

export const MissionSuccessModal: React.FC<MissionSuccessModalProps> = ({
  isOpen,
  missionNumber,
  missionTitle,
  pointsAwarded,
  timeSeconds,
  hasNextMission,
  onNextMission,
  onRepeatMission,
  onViewTaskSummary,
}) => {
  React.useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#10b981', '#38bdf8', '#f59e0b'],
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 text-center overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 rounded-full bg-emerald-500" />

        {/* Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Mission {missionNumber} Completed!
        </span>

        <h3 className="text-xl font-bold text-slate-900 mt-3 mb-1">
          {missionTitle}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          You demonstrated accurate robotic instrument positioning and surgical control.
        </p>

        {/* Score & Time Badges */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-3.5 mb-6 border border-slate-100">
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Score Earned
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-0.5">
              +{pointsAwarded} pts
            </span>
          </div>

          <div className="flex flex-col items-center justify-center border-l border-slate-200">
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Duration
            </span>
            <span className="text-2xl font-black text-slate-800 font-mono mt-0.5">
              {formatTime(timeSeconds)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {hasNextMission ? (
            <button
              onClick={onNextMission}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98"
            >
              <span>Continue to Mission {missionNumber + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onViewTaskSummary}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98"
            >
              <span>View Task Completion Summary</span>
              <Award className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onRepeatMission}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Repeat This Mission</span>
          </button>
        </div>
      </div>
    </div>
  );
};
