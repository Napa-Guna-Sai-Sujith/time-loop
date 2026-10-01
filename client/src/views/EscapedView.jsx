import React, { useEffect, useState } from "react";
import { sounds } from "../audio/soundEngine";
import confetti from "canvas-confetti";
import CertificateModal from "../components/CertificateModal";
import { Unlock, Trophy, Award, Sparkles } from "lucide-react";

export default function EscapedView({ player, stats }) {
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    sounds.init();
    sounds.playLevelCleared();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 }
    });
  }, []);

  const escapedRank = stats?.topEscaped?.findIndex(e => e.usn === player.usn) + 1 || 1;
  const isFinalist = escapedRank <= 3;

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      {/* Certificate Modal */}
      {showCertificate && (
        <CertificateModal
          player={player}
          rankTitle={isFinalist ? "TOP 3 FINALIST" : "TIME LOOP ESCAPEE"}
          rankPosition={escapedRank}
          onClose={() => setShowCertificate(false)}
        />
      )}

      <div className="max-w-xl w-full text-center">
        {/* Unlocked Icon */}
        <div className="w-24 h-24 rounded-3xl bg-green-100 dark:bg-green-950/80 border-2 border-green-500 dark:border-green-400 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-400/40 animate-bounce">
          <Unlock className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>

        {/* Level 4 Cleared */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-950/80 border border-green-400 dark:border-green-500 text-green-800 dark:text-green-300 font-mono text-xs uppercase tracking-widest mb-3">
          <Sparkles className="w-4 h-4" />
          <span>ALL 4 LEVELS CONQUERED</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white mb-2">
          YOU HAVE ESCAPED THE LOOP
        </h1>

        <p className="text-sm text-slate-600 dark:text-gray-300 font-sans max-w-md mx-auto mb-8">
          Outstanding performance! You solved through all 4 levels and shattered the quantum barrier.
        </p>

        {/* Telemetry Card */}
        <div className="glass-panel rounded-2xl p-6 text-left mb-6 font-mono text-xs border-green-300 dark:border-green-500/30">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-temporal-border mb-3">
            <span className="text-slate-500 dark:text-gray-400">FINISHER RANK:</span>
            <span className="text-green-600 dark:text-green-300 font-bold text-sm">#{escapedRank} OVERALL</span>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-temporal-border mb-3">
            <span className="text-slate-500 dark:text-gray-400">PARTICIPANT:</span>
            <span className="font-bold text-slate-900 dark:text-white">{player.name} ({player.usn})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-gray-400">TOTAL SCORE ACCUMULATED:</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold">{player.score || 600} PTS</span>
          </div>
        </div>

        {/* Top 3 Finalist Standby vs Certificate */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setShowCertificate(true)}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white dark:text-black font-bold font-mono text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Award className="w-4 h-4" />
            <span>VIEW OFFICIAL CERTIFICATE</span>
          </button>

          {isFinalist && (
            <div className="p-3.5 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-500 text-purple-800 dark:text-purple-200 font-mono text-xs flex items-center justify-center gap-2 animate-pulse">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>DIRECT FINALIST (BREAK THE LOOP STANDBY)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
