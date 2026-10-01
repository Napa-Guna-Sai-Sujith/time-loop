import React, { useState } from "react";
import { socket } from "../utils/socket";
import { 
  Terminal, Play, RotateCcw, Sparkles, Download, ShieldAlert, 
  Users, CheckCircle2, Skull, Unlock, Flame, Send, Search,
  Award, Eye, RefreshCw, KeyRound, Radio, Lock, BookOpen, Edit3, Save, Check,
  Database, Trash2, AlertOctagon
} from "lucide-react";

export default function HostDashboardView({ stats, onLockAdmin }) {
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'questions'
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState(0);
  const [questionFormData, setQuestionFormData] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementType, setAnnouncementType] = useState("INFO");

  const currentLevelQuestions = stats?.questions?.[selectedLevel] || [];
  const currentEditingQ = currentLevelQuestions[editingQuestionIdx] || null;

  const handleStartEvent = () => {
    if (window.confirm("Start TIME LOOP Tournament? This triggers the 3-2-1 countdown for all players.")) {
      socket.emit("host_start_event");
    }
  };

  const handleTriggerWildCard = () => {
    if (window.confirm("Launch Wild Card Draw for the last 3 eliminated players?")) {
      socket.emit("host_trigger_wild_card");
    }
  };

  const handleStartFinalRound = () => {
    if (window.confirm("Initiate Final Round (Break the Loop) for Top 3 + Wild Card finalist?")) {
      socket.emit("host_start_final_round");
    }
  };

  const handleResetEvent = () => {
    if (window.confirm("RESET ALL EVENT PROGRESS? This resets levels and player progress.")) {
      socket.emit("host_reset_event");
    }
  };

  const handlePurgeDatabase = () => {
    const confirmation = window.confirm(
      "⚠️ DANGER: COMPLETE DATABASE RESET\n\nThis will permanently delete all registered participants, live scores, anti-cheat violations, and reset all 24 questions to default in the PostgreSQL database.\n\nAre you sure you want to completely wipe the database?"
    );
    if (confirmation) {
      socket.emit("host_purge_database", (res) => {
        if (res?.success) {
          alert("✅ PostgreSQL Database completely wiped and factory reset!");
        } else {
          alert("Database reset error: " + (res?.error || "Unknown"));
        }
      });
    }
  };

  const handleBroadcastAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    socket.emit("host_broadcast_announcement", {
      message: announcementText.trim(),
      type: announcementType
    });
    setAnnouncementText("");
    alert("Emergency alert broadcasted to all screens!");
  };

  const handlePlayerAction = (usn, action) => {
    socket.emit("host_manage_player", { usn, action });
  };

  // Question editing handlers
  const handleSelectQuestionToEdit = (idx) => {
    setEditingQuestionIdx(idx);
    const q = currentLevelQuestions[idx];
    if (q) {
      setQuestionFormData({
        id: q.id,
        category: q.category || "",
        type: q.type || "mcq",
        question: q.question || "",
        options: q.options ? [...q.options] : ["", "", "", ""],
        answer: q.answer || "",
        explanation: q.explanation || ""
      });
    }
  };

  // Switch level in editor
  const handleSelectLevel = (lvl) => {
    setSelectedLevel(lvl);
    setEditingQuestionIdx(0);
    const q = stats?.questions?.[lvl]?.[0];
    if (q) {
      setQuestionFormData({
        id: q.id,
        category: q.category || "",
        type: q.type || "mcq",
        question: q.question || "",
        options: q.options ? [...q.options] : ["", "", "", ""],
        answer: q.answer || "",
        explanation: q.explanation || ""
      });
    }
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (!questionFormData) return;

    socket.emit("host_update_question", {
      level: selectedLevel,
      index: editingQuestionIdx,
      questionData: questionFormData
    }, (res) => {
      if (res?.success) {
        setSaveSuccessMsg(`Question ${editingQuestionIdx + 1} (Level ${selectedLevel}) Saved Successfully!`);
        setTimeout(() => setSaveSuccessMsg(""), 3000);
      }
    });
  };

  const handleResetQuestionsToDefault = () => {
    if (window.confirm("Reset all 24 questions (Levels 1-4) to default curated set?")) {
      socket.emit("host_reset_questions", (res) => {
        if (res?.success) {
          setSaveSuccessMsg("All questions reset to default!");
          setTimeout(() => setSaveSuccessMsg(""), 3000);
          handleSelectLevel(selectedLevel);
        }
      });
    }
  };

  const filteredLeaderboard = (stats?.leaderboard || []).filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.usn.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Header & Event Director Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-temporal-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 border border-purple-400 dark:border-purple-500 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-purple-700 dark:text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                HOST COMMAND CENTER
              </h1>
              <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 text-[10px] font-mono uppercase font-bold">
                AUTHORIZED [PIN: 107]
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
              Live Tournament State: <strong className="text-cyan-600 dark:text-cyan-400">{stats?.status || "LOBBY"}</strong> • 4 Levels (15 min each)
            </p>
          </div>
        </div>

        {/* Global Action Switches */}
        <div className="flex flex-wrap items-center gap-2">
          {stats?.status === "LOBBY" && (
            <button
              onClick={handleStartEvent}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white dark:text-black font-extrabold font-mono text-xs uppercase flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START EVENT</span>
            </button>
          )}

          <button
            onClick={handleTriggerWildCard}
            className="px-4 py-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/80 hover:bg-purple-200 dark:hover:bg-purple-800 border border-purple-300 dark:border-purple-500 text-purple-800 dark:text-purple-200 font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>WILD CARD</span>
          </button>

          <button
            onClick={handleStartFinalRound}
            className="px-4 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-500 text-amber-800 dark:text-amber-200 font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>BREAK THE LOOP</span>
          </button>

          <a
            href="/api/export-csv"
            download
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-temporal-card hover:bg-slate-200 dark:hover:bg-temporal-cardLight border border-slate-300 dark:border-temporal-border text-slate-700 dark:text-gray-300 font-mono text-xs flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>EXPORT CSV</span>
          </a>

          <button
            onClick={onLockAdmin}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-temporal-card border border-slate-300 dark:border-temporal-border text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-all"
            title="Lock Admin Console"
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetEvent}
            className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 transition-all"
            title="Reset Active Tournament Session Progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handlePurgeDatabase}
            className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs uppercase font-extrabold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all border border-red-400"
            title="Permanently erase all participants, scores, and questions stored in PostgreSQL"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>RESET DATABASE</span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs: Overview vs Question Editor */}
      <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-temporal-border pb-3">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all ${
            activeTab === "overview"
              ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
              : "bg-slate-100 dark:bg-temporal-card text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-slate-200 dark:border-temporal-border"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Dashboard & Telemetry</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("questions");
            handleSelectLevel(selectedLevel);
          }}
          className={`px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase flex items-center gap-2 transition-all ${
            activeTab === "questions"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-100 dark:bg-temporal-card text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white border border-slate-200 dark:border-temporal-border"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Question Bank Editor (4 Levels × 6 Qs)</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TELEMETRY */}
      {activeTab === "overview" && (
        <>
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="glass-panel rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 uppercase">Registered</div>
              <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-300 mt-1">{stats?.totalRegistered || 0}</div>
            </div>

            <div className="glass-panel rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 uppercase">Online</div>
              <div className="text-2xl font-black font-mono text-green-600 dark:text-green-400 mt-1">{stats?.online || 0}</div>
            </div>

            <div className="glass-panel rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 uppercase">Active Loop</div>
              <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">{stats?.active || 0}</div>
            </div>

            <div className="glass-panel rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 uppercase">Escaped L4</div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-300 mt-1">{stats?.escaped || 0}</div>
            </div>

            <div className="glass-panel rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 uppercase">Eliminated</div>
              <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-1">{stats?.eliminated || 0}</div>
            </div>

            <div className="glass-panel rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 uppercase">Security Flags</div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">{stats?.antiCheatLogs?.length || 0}</div>
            </div>
          </div>

          {/* Live 4-Level Distribution Bar */}
          <div className="glass-panel rounded-2xl p-5 mb-6">
            <h3 className="text-xs font-mono font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>LIVE PLAYER DISTRIBUTION (LEVELS 1-4 • 15 MIN PER LEVEL)</span>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-normal">Active in loop: {stats?.active || 0}</span>
            </h3>

            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((lvl) => {
                const count = stats?.levelCounts?.[lvl] || 0;
                const maxCount = Math.max(1, stats?.active || 1);
                const heightPercent = Math.min(100, Math.max(15, (count / maxCount) * 100));

                return (
                  <div key={lvl} className="flex flex-col items-center bg-slate-100 dark:bg-black/40 rounded-xl p-3 border border-slate-200 dark:border-temporal-border">
                    <div className="text-base font-bold font-mono text-slate-900 dark:text-white mb-1">{count}</div>
                    <div className="w-full h-12 bg-slate-200 dark:bg-gray-800/60 rounded-md overflow-hidden flex items-end">
                      <div
                        className="w-full bg-gradient-to-t from-cyan-500 to-purple-600 transition-all duration-500"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 mt-2 font-bold">Level {lvl}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Broadcast Marquee Box */}
          <form onSubmit={handleBroadcastAnnouncement} className="glass-panel rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>STAGE BROADCAST:</span>
            </div>
            <input
              type="text"
              placeholder="Type live announcement for all participant screens..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs uppercase flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>BROADCAST</span>
            </button>
          </form>

          {/* Leaderboard & Anti-Cheat Incident Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 glass-panel rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-temporal-border">
                <h3 className="text-sm font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>LIVE PARTICIPANT REGISTRY ({filteredLeaderboard.length})</span>
                </h3>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <input
                      type="text"
                      placeholder="Search USN / Name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 absolute left-2.5 top-2" />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border text-xs font-mono text-slate-800 dark:text-gray-300 outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ESCAPED">Escaped</option>
                    <option value="ELIMINATED">Eliminated</option>
                    <option value="DISQUALIFIED">Disqualified</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-gray-800">
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Participant</th>
                      <th className="py-2.5 px-3">USN</th>
                      <th className="py-2.5 px-3">Level / Att</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Strikes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-gray-900">
                    {filteredLeaderboard.map((p) => {
                      const isTop3 = p.rank <= 3;

                      return (
                        <tr key={p.usn} className="hover:bg-slate-50 dark:hover:bg-temporal-cardLight/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className={`font-bold ${isTop3 ? "text-amber-500 dark:text-amber-400" : "text-slate-500 dark:text-gray-400"}`}>
                              #{p.rank}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900 dark:text-gray-200">
                            {p.name}
                            <div className="text-[10px] text-slate-400 dark:text-gray-500 font-normal">{p.department}</div>
                          </td>
                          <td className="py-3 px-3 text-cyan-600 dark:text-cyan-400 font-bold">{p.usn}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-black border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300">
                              L{p.level} (Q{p.attempt})
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "ESCAPED"
                                ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700"
                                : p.status === "ACTIVE"
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                                : p.status === "ELIMINATED"
                                ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
                                : p.status === "DISQUALIFIED"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                : "bg-slate-100 dark:bg-gray-900 text-slate-500 dark:text-gray-400"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={p.strikes > 0 ? "text-red-500 font-bold" : "text-slate-400 dark:text-gray-600"}>
                              {p.strikes}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.status === "DISQUALIFIED" ? (
                                <button
                                  onClick={() => handlePlayerAction(p.usn, "PARDON")}
                                  className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/60 hover:bg-green-200 text-green-800 dark:text-green-300 text-[10px]"
                                >
                                  Pardon
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePlayerAction(p.usn, "DISQUALIFY")}
                                  className="px-2 py-1 rounded bg-red-100 dark:bg-red-950 hover:bg-red-200 text-red-800 dark:text-red-300 text-[10px]"
                                >
                                  Disqualify
                                </button>
                              )}
                              {p.status === "ELIMINATED" && (
                                <button
                                  onClick={() => handlePlayerAction(p.usn, "REVIVE")}
                                  className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-950 hover:bg-purple-200 text-purple-800 dark:text-purple-300 text-[10px]"
                                >
                                  Revive
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Anti-Cheat Incident Feed */}
            <div className="lg:col-span-4 glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-temporal-border text-sm font-mono text-red-500 font-bold">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>INTEGRITY & ANTI-CHEAT FEED</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {(stats?.antiCheatLogs || []).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-gray-500 font-mono text-xs">
                    No security violations detected. Clean session.
                  </div>
                ) : (
                  (stats?.antiCheatLogs || []).map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400 mb-1">
                        <span className="font-bold text-slate-900 dark:text-white">{v.name} ({v.usn})</span>
                        <span className="text-[10px] text-red-500 font-bold">Strike {v.strikes}</span>
                      </div>
                      <div className="text-red-600 dark:text-red-300 font-semibold">{v.type}</div>
                      <div className="text-[10px] text-slate-600 dark:text-gray-400 mt-1">{v.details}</div>
                      <div className="text-[9px] text-slate-400 dark:text-gray-600 mt-1">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: QUESTION BANK EDITOR */}
      {activeTab === "questions" && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-temporal-border">
            <div>
              <h2 className="text-xl font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>EDIT QUESTION BANK (4 LEVELS • 6 QUESTIONS EACH)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-1">
                Edit questions in real-time. Changes are instantly updated in the live game engine.
              </p>
            </div>

            <button
              onClick={handleResetQuestionsToDefault}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-slate-700 dark:text-gray-300 text-xs font-mono border border-slate-300 dark:border-gray-700 transition-all"
            >
              Reset All to Defaults
            </button>
          </div>

          {/* Level Selector Tabs (1, 2, 3, 4) */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleSelectLevel(lvl)}
                className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all shrink-0 ${
                  selectedLevel === lvl
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/40"
                    : "bg-slate-100 dark:bg-temporal-card text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-temporal-border hover:border-purple-400"
                }`}
              >
                Level {lvl} (6 Questions)
              </button>
            ))}
          </div>

          {/* Question Navigator (Q1 to Q6) */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const q = currentLevelQuestions[idx];
              const isEditing = editingQuestionIdx === idx;

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectQuestionToEdit(idx)}
                  className={`p-3 rounded-xl font-mono text-xs text-left border transition-all ${
                    isEditing
                      ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 text-slate-900 dark:text-cyan-200 font-bold ring-2 ring-cyan-500/30"
                      : "bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:border-slate-400"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400">Q{idx + 1}</div>
                  <div className="truncate text-[11px] mt-0.5">{q?.category || `Question ${idx + 1}`}</div>
                </button>
              );
            })}
          </div>

          {/* Active Question Editor Form */}
          {questionFormData ? (
            <form onSubmit={handleSaveQuestion} className="space-y-4 bg-slate-50/60 dark:bg-black/40 p-6 rounded-2xl border border-slate-200 dark:border-temporal-border">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-gray-800">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  Editing: Level {selectedLevel} — Question {editingQuestionIdx + 1} ({questionFormData.id})
                </span>

                {saveSuccessMsg && (
                  <span className="px-3 py-1 rounded-lg bg-green-100 dark:bg-green-950 border border-green-400 text-green-800 dark:text-green-300 font-mono text-xs flex items-center gap-1.5 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    <span>{saveSuccessMsg}</span>
                  </span>
                )}
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={questionFormData.category}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Question Type
                  </label>
                  <select
                    value={questionFormData.type}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-purple-500"
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="numerical">Numerical Entry</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Question Prompt (Supports Markdown & ```code```)
                </label>
                <textarea
                  rows={4}
                  value={questionFormData.question}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs font-mono leading-relaxed outline-none focus:border-purple-500"
                />
              </div>

              {/* Options if MCQ */}
              {questionFormData.type === "mcq" && (
                <div className="space-y-3">
                  <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    MCQ Options (A, B, C, D)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["A", "B", "C", "D"].map((letter, optIdx) => (
                      <div key={letter} className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <input
                          type="text"
                          value={questionFormData.options[optIdx] || ""}
                          onChange={(e) => {
                            const newOpts = [...questionFormData.options];
                            newOpts[optIdx] = e.target.value;
                            setQuestionFormData({ ...questionFormData, options: newOpts });
                          }}
                          placeholder={`Option ${letter}`}
                          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-purple-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct Answer & Explanation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Correct Answer *
                  </label>
                  <input
                    type="text"
                    required
                    value={questionFormData.answer}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, answer: e.target.value })}
                    placeholder="Must match exact option text or numerical value"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-cyan-300 text-xs font-mono font-bold outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Explanation
                  </label>
                  <input
                    type="text"
                    value={questionFormData.explanation}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                    placeholder="Rationale behind solution"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-black border border-slate-300 dark:border-gray-700 text-slate-900 dark:text-white text-xs font-mono outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Submit / Save Button */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-mono text-xs uppercase font-extrabold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>SAVE QUESTION CHANGES</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-12 text-slate-400 dark:text-gray-500 font-mono text-xs">
              Select a question above to edit.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
