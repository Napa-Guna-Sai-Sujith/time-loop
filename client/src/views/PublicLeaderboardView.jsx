import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { wsClient } from "../utils/ws";
import { Trophy, ShieldAlert, Award, Clock, Users, ArrowUpRight, Flame, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function PublicLeaderboardView() {
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
      setLastRefreshed(new Date());
      setError("");
    } catch (err) {
      console.error("Leaderboard load error:", err);
      setError("Failed to load standings. Will retry shortly.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 4000);

    const unsub = wsClient.on("leaderboard_update", () => {
      fetchLeaderboard();
    });

    return () => {
      clearInterval(interval);
      unsub?.();
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-temporal-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-500">
              PUBLIC TOURNAMENT TELEMETRY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
            LIVE LEADERBOARD & STANDINGS
          </h1>
          <p className="text-xs sm:text-sm font-mono text-slate-500 dark:text-gray-400 mt-1">
            Real-time rankings, level conquests, score telemetry, and proctor standing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeaderboard}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-temporal-card hover:bg-slate-200 dark:hover:bg-temporal-cardLight border border-slate-200 dark:border-temporal-border text-xs font-mono text-slate-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-500 animate-spin-slow" />
            <span>Updated {lastRefreshed.toLocaleTimeString()}</span>
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      {leaderboard?.rankings && leaderboard.rankings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {leaderboard.rankings.slice(0, 3).map((team, idx) => {
            const medalColors = [
              "border-amber-400/80 bg-amber-500/5 text-amber-500",
              "border-slate-400/80 bg-slate-400/5 text-slate-300",
              "border-amber-700/80 bg-amber-700/5 text-amber-600"
            ];
            const medalLabels = ["1ST PLACE", "2ND PLACE", "3RD PLACE"];

            return (
              <div
                key={team.team_id}
                className={`glass-panel rounded-3xl p-5 border relative overflow-hidden flex flex-col justify-between ${medalColors[idx]}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 border border-current">
                    {medalLabels[idx]}
                  </span>
                  <span className="text-2xl font-mono font-black">#{team.rank}</span>
                </div>

                <div className="flex items-center gap-3 my-2">
                  <span className="text-3xl">{team.avatar || "⚡"}</span>
                  <div>
                    <h3 className="font-mono font-bold text-base text-slate-900 dark:text-white leading-tight">
                      {team.team_name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-gray-400">{team.department}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-gray-800 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">SCORE</span>
                    <strong className="text-cyan-400 font-black">{team.total_score} PTS</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">LEVEL</span>
                    <strong className="text-purple-400">L{team.current_level}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">PROCTOR</span>
                    <strong className={team.proctor_strikes >= 3 ? "text-red-500" : "text-green-400"}>
                      {team.proctor_chances ?? (3 - (team.proctor_strikes || 0))}/3
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Table */}
      <div className="glass-panel rounded-3xl border border-slate-200 dark:border-temporal-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-100 dark:bg-black/40 text-slate-500 dark:text-gray-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-gray-800">
              <tr>
                <th className="py-3 px-4 text-center">Rank</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Level</th>
                <th className="py-3 px-4 text-center">Solved</th>
                <th className="py-3 px-4 text-center">Tokens</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Proctor Standing</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
              {loading && (!leaderboard?.rankings || leaderboard.rankings.length === 0) ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Synchronizing live standings...
                  </td>
                </tr>
              ) : leaderboard?.rankings?.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No teams registered yet. Standings will appear once teams join.
                  </td>
                </tr>
              ) : (
                leaderboard?.rankings?.map((team) => {
                  const strikes = team.proctor_strikes || 0;
                  const chances = team.proctor_chances !== undefined ? team.proctor_chances : Math.max(0, 3 - strikes);
                  const isDisqualified = strikes >= 3 || team.eliminated_by_proctor;

                  return (
                    <tr
                      key={team.team_id}
                      className="hover:bg-slate-50 dark:hover:bg-cyan-950/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-bold">
                        {team.rank === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-black inline-flex items-center justify-center font-black text-xs">
                            1
                          </span>
                        ) : team.rank === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-slate-300 text-black inline-flex items-center justify-center font-black text-xs">
                            2
                          </span>
                        ) : team.rank === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-700 text-white inline-flex items-center justify-center font-black text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400">#{team.rank}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl shrink-0">{team.avatar || "⚡"}</span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {team.team_name}
                            </div>
                            <div className="text-[10px] text-cyan-600 dark:text-cyan-400">{team.team_id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-gray-300 max-w-[180px] truncate">
                        {team.department}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-800 text-[11px]">
                          L{team.current_level}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-700 dark:text-gray-300">
                        {team.questions_solved}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-cyan-500">
                          {team.tokens_used !== undefined ? 3 - (team.tokens_used % 3) : 3}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-slate-900 dark:text-white">
                        {team.total_score}
                      </td>

                      {/* Proctor Chances Standing Column */}
                      <td className="py-3.5 px-4 text-center">
                        {isDisqualified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 font-bold text-[10px]">
                            <XCircle className="w-3 h-3" />
                            0/3 (DQ)
                          </span>
                        ) : chances === 3 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            3/3 Chances
                          </span>
                        ) : chances === 2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            2/3 (1 Strike)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            1/3 (2 Strikes)
                          </span>
                        )}
                      </td>

                      {/* Team Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {team.status === "ESCAPED" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold border border-green-500/40 text-[10px]">
                            🏆 ESCAPED
                          </span>
                        ) : team.status === "ELIMINATED" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/40 text-[10px]">
                            ELIMINATED
                          </span>
                        ) : team.status === "ACTIVE" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40 text-[10px] animate-pulse">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 font-bold border border-slate-500/40 text-[10px]">
                            WAITING
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
