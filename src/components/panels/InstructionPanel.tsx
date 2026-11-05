/**
 * Minimized Guided Instruction Panel
 * Compact, high-contrast single-row HUD optimized for 11" iPad landscape and tablets.
 * Maximizes vertical space for the 3D surgical viewports.
 */

import React from 'react';
import { Compass, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { MissionStep } from '../../types/simulation';

interface InstructionPanelProps {
  taskTitle: string;
  missionNumber: number;
  missionTitle: string;
  step?: MissionStep;
  stepIndex: number;
  totalSteps: number;
  isStepSuccess: boolean;
  stepSuccessMsg: string;
  elapsedTime: number;
  instructionFlash?: boolean;
}

export const InstructionPanel: React.FC<InstructionPanelProps> = ({
  taskTitle,
  missionNumber,
  missionTitle,
  step,
  stepIndex,
  totalSteps,
  isStepSuccess,
  stepSuccessMsg,
  elapsedTime,
  instructionFlash,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className={`w-full rounded-xl px-3 py-2 transition-all duration-200 border shadow-xs select-none ${
        isStepSuccess
          ? 'bg-emerald-600 text-white border-emerald-500'
          : instructionFlash
          ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Mission Pill & Step Counter */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider font-mono ${
              isStepSuccess
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
            }`}
          >
            M{missionNumber}: {missionTitle}
          </span>

          <span
            className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
              isStepSuccess ? 'bg-emerald-700/60 text-white' : 'bg-slate-100 text-slate-700 font-semibold'
            }`}
          >
            Step {stepIndex + 1}/{totalSteps}
          </span>
        </div>

        {/* Center: Primary Instruction or Success Notification */}
        <div className="flex-1 px-2 text-center truncate">
          {isStepSuccess ? (
            <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span className="truncate">{stepSuccessMsg || 'Target Reached!'}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-slate-950 truncate">
              <span className="truncate">{step?.instruction}</span>
              {step?.detailedHint && (
                <span className="hidden xl:inline text-[11px] font-medium text-slate-600 truncate">
                  ({step.detailedHint})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Step Dots & Timer */}
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          {/* Compact Step Progress Dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i < stepIndex || (i === stepIndex && isStepSuccess)
                    ? isStepSuccess
                      ? 'bg-white w-3'
                      : 'bg-emerald-600 w-3'
                    : i === stepIndex
                    ? isStepSuccess
                      ? 'bg-white/80 w-4'
                      : 'bg-emerald-600 w-4 ring-1 ring-emerald-300'
                    : isStepSuccess
                    ? 'bg-emerald-700 w-1.5'
                    : 'bg-slate-200 w-1.5'
                }`}
              />
            ))}
          </div>

          <div
            className={`flex items-center gap-1 font-mono text-[11px] ${
              isStepSuccess ? 'text-emerald-100' : 'text-slate-500'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{formatTime(elapsedTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
