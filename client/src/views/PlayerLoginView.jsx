import React, { useState, useEffect } from "react";
import { Clock, ShieldCheck, ArrowRight, UserPlus, LogIn, Users, Lock } from "lucide-react";
import { api } from "../services/api";

const AVATARS = ["⚡", "⏳", "🌀", "🔥", "🔮", "🚀", "🪐", "💎", "👾", "🤖"];
const DEPARTMENTS = [
  "Computer Science & Engg",
  "Information Science",
  "Artificial Intelligence & ML",
  "Electronics & Communication",
  "Data Science & Cybersecurity",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical & Electronics",
  "Other"
];

export default function PlayerLoginView({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    team_name: "",
    team_id: "",
    password: "",
    avatar: "⚡",
    department: DEPARTMENTS[0]
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Automatically fetch next unique sequential Team ID when in registration mode
  useEffect(() => {
    if (isRegister) {
      api.getNextTeamId()
        .then((res) => {
          if (res?.next_team_id) {
            setFormData((prev) => ({ ...prev, team_id: res.next_team_id }));
          }
        })
        .catch(() => {
          setFormData((prev) => ({ ...prev, team_id: prev.team_id || "TEAM-01" }));
        });
    }
  }, [isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (isRegister) {
        const team = await api.teamRegister(formData);
        const assignedId = team.team_id || formData.team_id;
        const loginRes = await api.teamLogin(assignedId, formData.password);
        localStorage.setItem("loop_token", loginRes.token);
        localStorage.setItem("loop_role", "team");
        onLoginSuccess(team, "team");
      } else {
        const res = await api.teamLogin(formData.team_id, formData.password);
        localStorage.setItem("loop_token", res.token);
        localStorage.setItem("loop_role", "team");
        onLoginSuccess(res.team, "team");
      }
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Title & Tagline */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">
            <Clock className="w-3.5 h-3.5 animate-spin-slow" />
            <span>FUTURISTIC TEAM TOURNAMENT</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white mb-2">
            TIME <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-300">LOOP</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-cyan-300/80 font-mono max-w-md mx-auto italic">
            "Every Second Counts. Every Answer Saves the Timeline."
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 relative shadow-2xl border border-cyan-500/30">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200 dark:border-temporal-border">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-800 dark:text-cyan-300">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{isRegister ? "REGISTER NEW TEAM" : "TEAM ACCESS PORTAL"}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg("");
              }}
              className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {isRegister ? "Existing team? Log in" : "Need to register? Sign up"}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-mono text-xs">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quantum Solvers"
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white font-medium outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                  {isRegister ? "Assigned Team ID" : "Team ID / Username *"}
                </label>
                {isRegister && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700">
                    <Lock className="w-2.5 h-2.5" />
                    <span>SYSTEM ASSIGNED • LOCKED</span>
                  </span>
                )}
              </div>

              {isRegister ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={formData.team_id || "GENERATING..."}
                    className="w-full px-4 py-3 rounded-xl bg-slate-200 dark:bg-black/90 border-2 border-cyan-500/60 text-cyan-700 dark:text-cyan-300 font-mono font-black text-lg tracking-wider uppercase outline-none select-none cursor-not-allowed shadow-inner"
                  />
                  <div className="absolute right-3.5 top-3.5 text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 font-mono text-xs font-bold pointer-events-none">
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">LOCKED</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono mt-1.5">
                    This unique ID is permanently bound to your team. Save it for tournament identification.
                  </p>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. TEAM-01"
                  value={formData.team_id}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono font-bold uppercase outline-none transition-all placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-gray-600"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                Access Password *
              </label>
              <input
                type="password"
                required
                placeholder="Enter password..."
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600"
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 text-slate-800 dark:text-gray-200 text-sm outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-gray-200">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Team Sigil (Avatar)
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {AVATARS.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: av })}
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center shrink-0 border transition-all ${
                          formData.avatar === av
                            ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 scale-110 shadow-lg shadow-cyan-500/30"
                            : "bg-slate-100 dark:bg-temporal-card border-slate-300 dark:border-temporal-border"
                        }`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white dark:text-black font-extrabold font-mono text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              <span>{isRegister ? "REGISTER & ENTER LOBBY" : "LOGIN TO GAME SESSION"}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-temporal-border flex items-center justify-between text-xs font-mono text-slate-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> Secure Isolated Session
            </span>
            <a href="#/organizer" className="text-purple-600 dark:text-purple-400 hover:underline">
              Organizer Login →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
