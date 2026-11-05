/**
 * Welcome Screen
 * Modern medical education landing page introducing first-year students
 * to surgical robotics, dual perspectives, and iPad touchscreen controls.
 */

import React from 'react';
import {
  Play,
  Activity,
  Layers,
  Touchpad,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
  Sparkles,
  User,
} from 'lucide-react';
import { StudentInfo } from '../../types/simulation';

interface WelcomeScreenProps {
  onStart: () => void;
  onClearProgress: () => void;
  hasStoredProgress: boolean;
  studentInfo?: StudentInfo;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStart,
  onClearProgress,
  hasStoredProgress,
  studentInfo,
}) => {
  const hasStudent = !!studentInfo?.fullName?.trim();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block leading-tight">
                SURGICAL ROBOTICS SIMULATION
              </span>
              <span className="text-[11px] text-slate-500 font-medium block">
                Educational Medical Simulation • da Vinci 5 Inspired
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {hasStudent && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 text-xs font-semibold border border-emerald-200 max-w-[180px] sm:max-w-xs truncate">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{studentInfo?.fullName}</span>
                {studentInfo?.studentId && (
                  <span className="text-emerald-700/80 font-mono text-[11px] shrink-0">
                    • ID: {studentInfo.studentId}
                  </span>
                )}
              </div>
            )}

            {(hasStoredProgress || hasStudent) && (
              <button
                onClick={onClearProgress}
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Refresh training progress and reset student credentials"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Refresh Training & Student Info</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Heading & Call to action */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Designed for First-Year Medical Students</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                Surgical Robotics Simulation
              </h1>
              <p className="text-lg sm:text-xl font-bold text-emerald-800 leading-snug">
                An Interactive Introduction to Robotic Instrument Control
              </p>
            </div>

            <p className="text-base text-slate-700 leading-relaxed max-w-xl font-normal">
              Experience the core mechanics of robot-assisted surgery. Master multi-planar instrument positioning, endoscopic depth perception, and specimen gripping through guided, hands-on 3D missions.
            </p>

            {/* Launch Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                onClick={onStart}
                className="py-4 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/35 transition-all active:scale-98"
              >
                <span>Start Simulation</span>
                <Play className="w-5 h-5 fill-current" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium px-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero setup required • Runs in browser</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Concept Preview Cards */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Dual Synchronized Perspectives Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Layers className="w-4 h-4" />
                </div>
                <span>Two Synchronized Perspectives</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-1 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Doctor View
                  </span>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    Stereo endoscope camera view showing surgical workspace, targets, and instrument tip.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800 text-white space-y-1 border border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                    Robot View
                  </span>
                  <p className="text-slate-300 font-medium leading-relaxed">
                    External 3D robotic arm model with 6 revolute joints, cannula trocar, and rotatable camera.
                  </p>
                </div>
              </div>
            </div>

            {/* iPad & Touch Friendly Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-md space-y-3">
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <Touchpad className="w-4 h-4" />
                </div>
                <span>Intuitive Touchscreen Operation</span>
              </div>

              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                  <span><strong>Press & Hold:</strong> Hold directional buttons to move; release to stop immediately.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                  <span><strong>Guided Visual Cues:</strong> Glowing buttons and target halos guide each step.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                  <span><strong>Optimized for iPad:</strong> Designed for tablets in landscape or portrait orientation.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </main>

      {/* Footer / Educational Disclaimer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Educational demonstration inspired by robotic surgical systems. Designed for preclinical medical education.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Client-side Simulation</span>
            <span>•</span>
            <span>Version 1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
