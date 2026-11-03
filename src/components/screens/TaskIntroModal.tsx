/**
 * Task Introduction Briefing Modal
 * Prepares the medical student with goals, mission objectives, and control tips before simulation begins.
 */

import React from 'react';
import { ArrowRight, Compass, Grab, Check, ArrowLeft, Layers } from 'lucide-react';
import { Mission } from '../../types/simulation';

interface TaskIntroModalProps {
  taskId: 1 | 2 | 3;
  taskTitle: string;
  missions: Mission[];
  onStartSimulation: () => void;
  onBackToMenu: () => void;
}

export const TaskIntroModal: React.FC<TaskIntroModalProps> = ({
  taskId,
  taskTitle,
  missions,
  onStartSimulation,
  onBackToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 my-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Task Menu</span>
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
            Task {taskId} Briefing
          </span>
        </div>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
            {taskId === 1 ? (
              <Compass className="w-6 h-6" />
            ) : taskId === 2 ? (
              <Grab className="w-6 h-6" />
            ) : (
              <Layers className="w-6 h-6 text-purple-600" />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {taskTitle}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {taskId === 3
                ? '3 Progressive Missions • 50 Points Max (10 + 20 + 20 PTS)'
                : '5 Guided Missions • 10 Points per Mission • 50 Points Max'}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {taskId === 1
            ? 'Master fundamental laparoscopic maneuvers. You will practice navigating along lateral (X), vertical (Y), and depth (Z) axes to position the robotic surgical instrument inside target zones.'
            : taskId === 2
            ? 'Practice fine mechanical manipulation. You will align the instrument jaws over a specimen, clamp and lift the object, transfer it across the surgical field, and release it in the sterile receptacle.'
            : 'Master multi-specimen classification and sequential robotic sorting. You must move 3 colored specimens in strict order: 1) Red with no barrier (10 pts), 2) Amber crossing low barrier (20 pts), and 3) Cyan crossing high barrier (20 pts).'}
        </p>

        {/* Missions Checklist Preview */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Mission Sequence
          </h4>
          <div className="space-y-2.5">
            {missions.map((m, idx) => (
              <div key={m.id} className="flex items-start justify-between gap-2.5 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800">{m.title}: </span>
                    <span className="text-slate-500">{m.shortDescription}</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-600 text-xs shrink-0 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  +{m.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls Reminder Note */}
        <div className="bg-sky-50/70 rounded-2xl p-3.5 mb-6 border border-sky-200/60 text-xs text-sky-900 flex items-center gap-2.5">
          <Check className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <strong>Touch & Mouse Support:</strong> Press and hold buttons to move; release to stop. Highlighted buttons show what to press next.
          </span>
        </div>

        {/* Start Button */}
        <button
          onClick={onStartSimulation}
          className="w-full py-4 px-6 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-sky-600/25 transition-all active:scale-98"
        >
          <span>Begin Simulation</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
