/**
 * In-App Confirmation Modal for Refreshing Training and Student Credentials.
 * Replaces window.confirm to guarantee 100% reliability in iframe and iPad environments.
 */

import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ConfirmResetModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 text-center">
        {/* Close corner */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Refresh Training & Reset Student Info?
        </h3>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
          This will permanently reset all recorded task scores, attempts, and clear the current student Name and ID. The station will be ready for a new student registration.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Yes, Reset Everything</span>
          </button>

          <button
            onClick={onCancel}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
