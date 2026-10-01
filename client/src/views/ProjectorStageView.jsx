import React from "react";
import { Clock, Trophy, Sparkles } from "lucide-react";
import WildCardModal from "../components/WildCardModal";

export default function ProjectorStageView({ stats }) {
  const topPlayers = (stats?.leaderboard || []).slice(0, 10);
  const activeCount = stats?.active || 0;
  const escapedCount = stats?.escaped || 0;
  const eliminatedCount = stats?.eliminated || 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#04060d] text-slate-900 dark:text-white p-6 lg:p-10 select-none overflow-hidden relative font-sans transition-colors">
      {/* Background Animated Quantum Grid */}
      <div className="absolute inset-0 quantum-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Wild Card Overlay on Stage if active */}
      {stats?.wildCard?.active && (
        <WildCardModal
          wildCardData={stats.wildCard}
          currentUserUSN=""
          isHost={true}
        />
      )}

      {/* Top Arena Header */}
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-cyan-500/30 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
            <Clock className="w-8 h-8 text-black animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-black font-mono tracking-wider text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-300 dark:via-white dark:to-purple-300">
              TIME LOOP // ARENA LIVE
            </h1>
            <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">
              Official Tournament Big-Screen Telemetry
            </p>
          </div>
        </div>

        {/* Global Live Counters */}
        <div className="flex items-center gap-4 font-mono">
          <div className="px-4 py-2 rounded-xl glass-panel text-center">
            <div className="text-[10px] text-slate-500 dark:text-gray-400 uppercase">ACTIVE</div>
            <div className="text-xl font-bold text-cyan-600 dark:text-cyan-300">{activeCount}</div>
          </div>
          <div className="px-4 py-2 rounded-xl glass-panel text-center">
            <div className="text-[10px] text-slate-500 dark:text-gray-400 uppercase">ESCAPED</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">{escapedCount}</div>
          </div>
          <div className="px-4 py-2 rounded-xl glass-panel text-center">
            <div className="text-[10px] text-slate-500 dark:text-gray-400 uppercase">VANISHED</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">{eliminatedCount}</div>
          </div>
        </div>
      </div>

      {/* Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Top 3 Podium & Survival Status */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top 3 Finalists Podium */}
          <div className="glass-panel-glow rounded-3xl p-6 border-cyan-500/40">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider mb-6 pb-2 border-b border-slate-200 dark:border-gray-800">
              <Trophy className="w-4 h-4" />
              <span>PROJECTED DIRECT FINALISTS (TOP 3)</span>
            </div>

            <div className="space-y-3">
              {[0, 1, 2].map((idx) => {
                const p = topPlayers[idx];
                const medals = ["🥇", "🥈", "🥉"];
                const borders = ["border-amber-400/80", "border-slate-300/80", "border-amber-700/80"];

                if (!p) {
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-gray-800 flex items-center justify-between text-slate-400 dark:text-gray-600 font-mono text-xs">
                      <span>{medals[idx]} POSITION UNCLAIMED</span>
                      <span>--</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.usn}
                    className={`p-4 rounded-2xl glass-panel border ${borders[idx]} flex items-center justify-between shadow-lg transition-transform hover:scale-[1.02]`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{medals[idx]}</span>
                      <div>
                        <div className="text-base font-bold text-slate-900 dark:text-white font-mono">{p.name}</div>
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-mono">{p.usn} • {p.department}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-cyan-600 dark:text-cyan-300">L{p.level} (Q{p.attempt})</div>
                      <div className="text-[10px] text-slate-500 dark:text-gray-400">{p.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level Distribution Bar on Stage */}
          <div className="glass-panel rounded-3xl p-6">
            <div className="text-xs font-mono text-slate-700 dark:text-gray-300 font-bold uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>SURVIVOR PROGRESSION PYRAMID</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-mono">Levels 1 → 4 (15 Min / Level)</span>
            </div>

            <div className="space-y-2">
              {[4, 3, 2, 1].map((lvl) => {
                const count = stats?.levelCounts?.[lvl] || 0;
                const widthPercent = Math.min(100, Math.max(8, (count / Math.max(1, activeCount)) * 100));

                return (
                  <div key={lvl} className="flex items-center gap-3 font-mono text-xs">
                    <span className="w-16 text-slate-500 dark:text-gray-400">Level {lvl}</span>
                    <div className="flex-1 h-6 bg-slate-200 dark:bg-black/60 rounded-lg overflow-hidden border border-slate-300 dark:border-gray-800 p-0.5">
                      <div
                        className="h-full rounded bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-end pr-2 text-[10px] font-bold text-white dark:text-black transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    </div>
                    <span className="w-8 text-right font-bold text-slate-900 dark:text-white">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Top 10 Leaderboard Table */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-6 lg:p-8">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-temporal-border">
            <h3 className="text-base font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>LIVE TOURNAMENT LEADERBOARD</span>
            </h3>
            <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 animate-pulse font-bold">
              ● REAL-TIME SYNCHRONIZED
            </span>
          </div>

          <div className="space-y-2.5">
            {topPlayers.map((p, idx) => {
              const isTop3 = idx < 3;

              return (
                <div
                  key={p.usn}
                  className={`p-3.5 rounded-2xl flex items-center justify-between border transition-all ${
                    isTop3
                      ? "bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-400/50"
                      : "bg-slate-50/80 dark:bg-temporal-card/60 border-slate-200 dark:border-temporal-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl font-mono text-xs font-bold flex items-center justify-center ${
                      idx === 0
                        ? "bg-amber-400 text-black shadow-lg shadow-amber-400/30"
                        : idx === 1
                        ? "bg-slate-300 text-black"
                        : idx === 2
                        ? "bg-amber-700 text-white"
                        : "bg-slate-200 dark:bg-gray-800 text-slate-600 dark:text-gray-400"
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">{p.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">{p.usn} • {p.department}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono">
                    <div className="text-right">
                      <div className="text-xs font-bold text-cyan-600 dark:text-cyan-300">Level {p.level}</div>
                      <div className="text-[10px] text-slate-500 dark:text-gray-400">Attempt {p.attempt}/6</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      p.status === "ESCAPED"
                        ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700"
                        : p.status === "ACTIVE"
                        ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                        : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
