import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { sounds } from "../audio/soundEngine";

export default function AdminPasscodeModal({ isOpen, onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    sounds.init();

    if (pin.trim() === "107") {
      sounds.playLevelCleared();
      onSuccess();
    } else {
      sounds.playGlitchBuzz();
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in select-none">
      <div className="max-w-md w-full glass-panel-glow rounded-3xl p-6 sm:p-8 relative border-purple-500/50 shadow-2xl">
        {/* Cancel / Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-200 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Security Lock Header */}
        <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <KeyRound className="w-8 h-8 text-purple-300" />
        </div>

        <h2 className="text-2xl font-black font-mono tracking-tight text-center text-slate-900 dark:text-white mb-1">
          ADMIN AUTHENTICATION
        </h2>

        <p className="text-xs text-slate-500 dark:text-gray-400 font-mono text-center mb-6">
          HOST COMMAND CENTER RESTRICTED AREA
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              Enter Admin Passcode
            </label>
            <div className="relative">
              <input
                type="password"
                autoFocus
                maxLength={10}
                placeholder="Enter 3-digit PIN..."
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(false);
                }}
                className={`w-full px-4 py-3.5 rounded-xl bg-slate-100 dark:bg-black/60 border text-center font-mono text-2xl tracking-[0.5em] font-black outline-none transition-all ${
                  error
                    ? "border-red-500 text-red-500 ring-2 ring-red-500/30 animate-shake"
                    : "border-slate-300 dark:border-cyan-700/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-slate-900 dark:text-cyan-300"
                }`}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-300 font-mono text-xs flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>ACCESS DENIED // INVALID KEY</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-xl border border-slate-300 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-mono text-xs uppercase font-bold hover:bg-slate-200 dark:hover:bg-gray-700 transition-all"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!pin.trim()}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-mono text-xs uppercase font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all"
            >
              <span>UNLOCK</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-6 pt-3 border-t border-slate-200 dark:border-temporal-border text-center text-[10px] font-mono text-slate-400 dark:text-gray-500">
          SECURE PROTOCOL // 107
        </div>
      </div>
    </div>
  );
}
