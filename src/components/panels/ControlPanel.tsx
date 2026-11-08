/**
 * Streamlined Master Console Control Pendant
 * Redesigned for 11" iPad landscape and tablet screens:
 * - Left Circle: Resized compact depth dial (FORWARD on top, BACKWARD on bottom)
 * - Right Circle: Resized compact planar 4-way dial (UP, DOWN, LEFT, RIGHT arrows)
 * - Center: Compact gripper actuation, status telemetry, and minimal utility bar
 * - Press-and-hold continuous movement with immediate stop on release.
 */

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Sliders,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  Pause,
  Play,
  Home,
  CheckCircle2,
  Crosshair,
} from 'lucide-react';
import { DirectionKey, ControlKey } from '../../types/simulation';

interface ControlPanelProps {
  requiredControl?: ControlKey;
  activeDirection: DirectionKey | null;
  gripperRatio: number;
  speedMode: 'normal' | 'fine';
  soundEnabled: boolean;
  isPaused: boolean;
  isGrasped?: boolean;
  isContactingObject?: boolean;
  onStartMove: (dir: DirectionKey) => void;
  onStopMove: (dir?: DirectionKey) => void;
  onOpenGripper: () => void;
  onCloseGripper: () => void;
  onToggleSpeed: () => void;
  onToggleSound: () => void;
  onTogglePause: () => void;
  onResetMission: () => void;
  onRecalibrate: () => void;
  onShowInstructionAgain: () => void;
  onBackToMenu: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  requiredControl,
  activeDirection,
  gripperRatio,
  speedMode,
  soundEnabled,
  isPaused,
  isGrasped,
  isContactingObject,
  onStartMove,
  onStopMove,
  onOpenGripper,
  onCloseGripper,
  onToggleSpeed,
  onToggleSound,
  onTogglePause,
  onResetMission,
  onRecalibrate,
  onShowInstructionAgain,
  onBackToMenu,
}) => {
  const handlePointerDown = (dir: DirectionKey, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onStartMove(dir);
  };

  const handlePointerUp = (dir: DirectionKey, e: React.PointerEvent) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    onStopMove(dir);
  };

  const handlePointerCancel = (dir: DirectionKey) => {
    onStopMove(dir);
  };

  const isHighlighted = (key: ControlKey) => requiredControl === key;

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl shadow-xs px-3 py-2 sm:px-4 sm:py-2 select-none shrink-0">
      <div className="flex items-center justify-center gap-3 sm:gap-5 md:gap-7 max-w-4xl mx-auto">

        {/* -------------------------------------------------------------
            LEFT CIRCLE: RESIZED DEPTH PENDANT (FORWARD / BACKWARD)
           ------------------------------------------------------------- */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-100 p-1.5 border-2 border-slate-200 shadow-inner flex flex-col items-center justify-between overflow-hidden">
            
            {/* Top: FORWARD */}
            <button
              onPointerDown={(e) => handlePointerDown('forward', e)}
              onPointerUp={(e) => handlePointerUp('forward', e)}
              onPointerCancel={() => handlePointerCancel('forward')}
              className={`w-full h-[47%] rounded-t-full flex items-center justify-center transition-all shadow-xs active:scale-95 touch-none pb-1 ${
                activeDirection === 'forward'
                  ? 'bg-teal-700 text-white shadow-md ring-2 ring-teal-400'
                  : isHighlighted('forward')
                  ? 'bg-teal-600 text-white ring-2 ring-teal-300 animate-pulse'
                  : 'bg-white hover:bg-teal-50 text-slate-800 border-b border-slate-200'
              }`}
              title="Move Forward into Depth"
            >
              <ChevronsUp className="w-6 h-6 stroke-[2.5]" />
            </button>

            {/* Center Dial Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-200 border-2 border-white shadow-xs flex flex-col items-center justify-center z-10 pointer-events-none text-slate-700">
              <span className="text-[8px] font-mono font-black leading-none">DEPTH</span>
            </div>

            {/* Bottom: BACKWARD */}
            <button
              onPointerDown={(e) => handlePointerDown('backward', e)}
              onPointerUp={(e) => handlePointerUp('backward', e)}
              onPointerCancel={() => handlePointerCancel('backward')}
              className={`w-full h-[47%] rounded-b-full flex items-center justify-center transition-all shadow-xs active:scale-95 touch-none pt-1 ${
                activeDirection === 'backward'
                  ? 'bg-teal-700 text-white shadow-md ring-2 ring-teal-400'
                  : isHighlighted('backward')
                  ? 'bg-teal-600 text-white ring-2 ring-teal-300 animate-pulse'
                  : 'bg-white hover:bg-teal-50 text-slate-800 border-t border-slate-200'
              }`}
              title="Retract Backward"
            >
              <ChevronsDown className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-mono">
            Z-Axis
          </span>
        </div>

        {/* -------------------------------------------------------------
            CENTER: GRIPPER CONTROLS + COMPACT UTILITY TOOLBAR
           ------------------------------------------------------------- */}
        <div className="w-56 sm:w-64 flex flex-col items-center px-1 shrink-0">
          
          {/* Gripper Actuation Row */}
          <div className="w-full flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Gripper
            </span>
            <span
              className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                gripperRatio > 0.5 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {isGrasped && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
              {gripperRatio > 0.5 ? 'OPEN' : 'CLAMPED'} ({Math.round(gripperRatio * 100)}%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full mb-2">
            <button
              onClick={onOpenGripper}
              className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold transition-all shadow-xs active:scale-95 ${
                isHighlighted('gripper_open')
                  ? 'bg-amber-500 text-white ring-2 ring-amber-300 animate-pulse shadow-md'
                  : gripperRatio > 0.5
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wide">OPEN</span>
              <span className="text-[8px] font-normal opacity-70">Release</span>
            </button>

            <button
              onClick={onCloseGripper}
              className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-bold transition-all shadow-xs active:scale-95 ${
                isHighlighted('gripper_close')
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 animate-pulse shadow-md'
                  : gripperRatio <= 0.2
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wide">CLOSE</span>
              <span className="text-[8px] font-normal opacity-70">Grasp</span>
            </button>
          </div>

          {/* Status Badge */}
          {isGrasped ? (
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1.5">
              ● Specimen grasped
            </span>
          ) : isContactingObject ? (
            <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse mb-1.5">
              ⚠️ In contact with specimen
            </span>
          ) : (
            <div className="h-4 mb-1 text-[9px] text-slate-400">Position jaws near specimen to grasp</div>
          )}

          {/* Compact Mini Toolbar */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleSpeed}
              className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
              title="Toggle precision speed"
            >
              <Sliders className="w-3 h-3" />
              <span>{speedMode === 'normal' ? '1x' : '0.5x'}</span>
            </button>

            <button
              onClick={onShowInstructionAgain}
              className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
              title="Show hint"
            >
              <HelpCircle className="w-3 h-3 text-emerald-700" />
              <span>Hint</span>
            </button>

            <button
              onClick={onTogglePause}
              className={`p-1 rounded-lg transition-colors ${
                isPaused ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onResetMission}
              className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title="Reset current mission"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleSound}
              className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

        </div>

        {/* -------------------------------------------------------------
            RIGHT CIRCLE: RESIZED PLANAR PENDANT (UP, DOWN, LEFT, RIGHT)
           ------------------------------------------------------------- */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-100 p-1.5 border-2 border-slate-200 shadow-inner flex items-center justify-center">
            
            {/* UP BUTTON */}
            <button
              onPointerDown={(e) => handlePointerDown('up', e)}
              onPointerUp={(e) => handlePointerUp('up', e)}
              onPointerCancel={() => handlePointerCancel('up')}
              className={`absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95 touch-none z-10 ${
                activeDirection === 'up'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                  : isHighlighted('up')
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200'
              }`}
              title="Move Up"
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>

            {/* DOWN BUTTON */}
            <button
              onPointerDown={(e) => handlePointerDown('down', e)}
              onPointerUp={(e) => handlePointerUp('down', e)}
              onPointerCancel={() => handlePointerCancel('down')}
              className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95 touch-none z-10 ${
                activeDirection === 'down'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                  : isHighlighted('down')
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200'
              }`}
              title="Move Down"
            >
              <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>

            {/* LEFT BUTTON */}
            <button
              onPointerDown={(e) => handlePointerDown('left', e)}
              onPointerUp={(e) => handlePointerUp('left', e)}
              onPointerCancel={() => handlePointerCancel('left')}
              className={`absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95 touch-none z-10 ${
                activeDirection === 'left'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                  : isHighlighted('left')
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200'
              }`}
              title="Move Left"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>

            {/* RIGHT BUTTON */}
            <button
              onPointerDown={(e) => handlePointerDown('right', e)}
              onPointerUp={(e) => handlePointerUp('right', e)}
              onPointerCancel={() => handlePointerCancel('right')}
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all shadow-xs active:scale-95 touch-none z-10 ${
                activeDirection === 'right'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                  : isHighlighted('right')
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200'
              }`}
              title="Move Right"
            >
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>

            {/* Center Dial Hub: Recenter */}
            <button
              onClick={onRecalibrate}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 border-2 border-white shadow-xs flex items-center justify-center z-20 text-emerald-800 active:scale-95 transition-all"
              title="Center Instrument Tip"
            >
              <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-800" />
            </button>
          </div>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-mono">
            X / Y Axis
          </span>
        </div>

      </div>
    </div>
  );
};
