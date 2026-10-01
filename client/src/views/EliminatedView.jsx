import React, { useEffect } from "react";
import { sounds } from "../audio/soundEngine";
import { AlertOctagon, Sparkles, Clock } from "lucide-react";

export default function EliminatedView({ player, wildCardData }) {
  useEffect(() => {
    sounds.init();
    sounds.playElimination();
  }, []);

  const isCandidate = wildCardData?.candidates?.some(c => c.usn === player.usn);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Disintegration Icon */}
        <div className="w-24 h-24 rounded-3xl bg-red-100 dark:bg-red-950/80 border-2 border-red-500/80 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/40 animate-pulse">
          <AlertOctagon className="w-12 h-12 text-red-500" />
        </div>

        {/* Big Elimination Title */}
        <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-red-600 dark:text-red-500 mb-2 drop-shadow-[0_0_20px_rgba(255,42,95,0.4)]">
          TIME LOOP FAILED
        </h1>

        <p className="text-base text-slate-700 dark:text-gray-300 font-mono mb-2">
          You couldn't escape Level {player.level}.
        </p>

        <p className="text-sm text-red-600 dark:text-red-400 font-mono uppercase tracking-widest mb-8 font-bold">
          You have vanished from the event.
        </p>

        {/* Stats card */}
        <div className="glass-panel-danger rounded-2xl p-6 text-left mb-6 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-red-200 dark:border-red-900/60 mb-3">
            <span className="text-slate-500 dark:text-gray-400">PARTICIPANT:</span>
            <span className="font-bold text-slate-900 dark:text-white">{player.name} ({player.usn})</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-red-200 dark:border-red-900/60 mb-3">
            <span className="text-slate-500 dark:text-gray-400">FINAL LEVEL REACHED:</span>
            <span className="text-red-600 dark:text-red-300 font-bold">Level {player.level}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-gray-400">TOTAL ATTEMPTS FAILED:</span>
            <span className="text-red-600 dark:text-red-400 font-bold">6 of 6 in Level {player.level}</span>
          </div>
        </div>

        {/* Wild Card Standby Notice */}
        <div className="glass-panel rounded-2xl p-6 border-purple-300 dark:border-purple-500/40 relative overflow-hidden">
          <div className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-400 font-mono text-xs font-bold uppercase tracking-widest mb-2">
            <Sparkles className="w-4 h-4" />
            <span>THE WILD CARD STANDBY</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-gray-300 font-sans leading-relaxed mb-4">
            "You were eliminated. But the TIME LOOP isn't finished with you."
            <br />
            The organizers will resurrect the <strong className="text-slate-900 dark:text-white">Last 3 Eliminated Players</strong> for a high-stakes <span className="text-amber-600 dark:text-amber-300">👑 KING</span> vs <span className="text-red-600 dark:text-red-300">💣 BOMB</span> card reveal.
          </p>

          {isCandidate ? (
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-400 text-purple-900 dark:text-purple-200 font-mono text-xs animate-bounce font-bold">
              🔥 YOU HAVE BEEN SELECTED FOR THE WILD CARD DRAW!
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-gray-500">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Awaiting Host Wild Card Phase...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
