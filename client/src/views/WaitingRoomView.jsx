import React, { useState } from "react";
import { Clock, Users, Volume2, Shield, Flame, Sparkles, CheckCircle2 } from "lucide-react";
import { sounds } from "../audio/soundEngine";

export default function WaitingRoomView({ player, stats }) {
  const [soundTested, setSoundTested] = useState(false);

  const handleTestSound = () => {
    sounds.init();
    sounds.playCountdownBeep(3);
    setTimeout(() => sounds.playCountdownBeep(2), 300);
    setTimeout(() => sounds.playCountdownBeep(1), 600);
    setTimeout(() => sounds.playLevelCleared(), 900);
    setSoundTested(true);
  };

  const connectedCount = stats?.online || stats?.totalRegistered || 1;

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 py-8">
      <div className="max-w-3xl w-full">
        {/* Top Status Banner */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-transparent border border-cyan-500/40 flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-12 h-12 text-cyan-500 dark:text-cyan-400 animate-spin-slow" />
            </div>
            <div className="absolute -bottom-1 right-2 w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-black flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white mb-2">
            WAITING FOR HOST
          </h1>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 font-mono text-sm shadow-lg shadow-cyan-500/10">
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Players Connected: <strong className="font-bold text-slate-900 dark:text-white">{connectedCount}</strong></span>
          </div>

          <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-3">
            The tournament will commence automatically once the organizers trigger the start signal.
          </p>
        </div>

        {/* Player Identity Card */}
        <div className="glass-panel rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-950 border border-cyan-400 dark:border-cyan-600 flex items-center justify-center text-2xl">
              {player.avatar || "⚡"}
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white">{player.name}</div>
              <div className="text-xs text-cyan-600 dark:text-cyan-400 font-mono">
                {player.usn} • {player.department}
              </div>
            </div>
          </div>

          {/* Sound Check Trigger */}
          <button
            onClick={handleTestSound}
            className={`px-4 py-2.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
              soundTested
                ? "bg-green-100 dark:bg-green-950/80 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300"
                : "bg-slate-100 dark:bg-temporal-card hover:bg-slate-200 dark:hover:bg-temporal-cardLight border-slate-300 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300"
            }`}
          >
            {soundTested ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
            <span>{soundTested ? "Audio Synth Ready ✓" : "Test Ticking Sound & Audio"}</span>
          </button>
        </div>

        {/* Tournament Rules Briefing */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <h3 className="text-sm font-mono font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>CRITICAL TIME LOOP PROTOCOLS</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-temporal-border">
              <div className="text-cyan-700 dark:text-cyan-400 font-mono font-bold text-xs uppercase mb-1">
                01. 6 QUESTIONS PER LEVEL
              </div>
              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                In each level, you must attempt and solve all <strong>6 questions</strong> sequentially before advancing to the next level.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 dark:bg-black/40 border border-purple-200 dark:border-purple-900/40">
              <div className="text-purple-700 dark:text-purple-400 font-mono font-bold text-xs uppercase mb-1">
                02. 15 MIN GLOBAL LEVEL LIMIT
              </div>
              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                You have a 15-minute global countdown per level to complete all 6 questions. If time expires, you are eliminated.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-50 dark:bg-black/40 border border-red-200 dark:border-red-900/40">
              <div className="text-red-700 dark:text-red-400 font-mono font-bold text-xs uppercase mb-1">
                03. ZERO CHEATING
              </div>
              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                Tab switching, clipboard copying, or window blurs trigger auto-strikes and immediate disqualification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
