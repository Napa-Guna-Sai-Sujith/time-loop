import React, { useState, useEffect } from "react";
import {
  Terminal, Play, Pause, RotateCcw, Download, Upload, Plus, Trash2, Edit3,
  Copy, Eye, Search, Filter, ShieldCheck, Trophy, Settings, Users,
  BookOpen, HelpCircle, AlertCircle, Save, Check, RefreshCw, KeyRound,
  FileSpreadsheet, Lock, LogOut, Sliders, X, ShieldAlert, CheckCircle2, XCircle, UserCheck
} from "lucide-react";
import { api } from "../services/api";
import StartGameModal from "../components/StartGameModal";

const CATEGORIES = [
  "Mathematics",
  "Logical Reasoning",
  "Aptitude",
  "Python Coding",
  "Debugging",
  "DSA Concept MCQs"
];

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

export default function OrganizerDashboardView({ onLogout }) {
  const [activeTab, setActiveTab] = useState("leaderboard"); // leaderboard, questions, categories, teams, settings, audit
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Question filters & state
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [importStatus, setImportStatus] = useState("");

  // Start modal confirmation
  const [showStartModal, setShowStartModal] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState(null);
  const [catDistribution, setCatDistribution] = useState({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Organizer password change
  const [passForm, setPassForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passMsg, setPassMsg] = useState("");

  // Team Edit Modal State
  const [editingTeam, setEditingTeam] = useState(null);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [teamSaveError, setTeamSaveError] = useState("");

  // Initial data load
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadRealTimeStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      const [statsRes, setRes, lbRes, qRes, tRes, logsRes] = await Promise.all([
        api.getOrganizerStats(),
        api.getEventSettings(),
        api.getLeaderboard(),
        api.getQuestions(),
        api.getTeams(),
        api.getAuditLogs()
      ]);
      setStats(statsRes);
      setSettings(setRes);
      setSettingsForm(setRes);
      setCatDistribution(setRes.category_distribution || {});
      setLeaderboard(lbRes.rankings || []);
      setQuestions(qRes || []);
      setTeams(tRes || []);
      setAuditLogs(logsRes || []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  const loadRealTimeStats = async () => {
    try {
      const [statsRes, lbRes] = await Promise.all([
        api.getOrganizerStats(),
        api.getLeaderboard()
      ]);
      setStats(statsRes);
      setLeaderboard(lbRes.rankings || []);
    } catch (_) {}
  };

  // --- Controls ---
  const handleStartGame = async () => {
    try {
      await api.startGame();
      setShowStartModal(false);
      loadAllData();
      alert("✅ GAME ACTIVATED! Level 1 started for all connected teams.");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (stats?.event_status === "RUNNING") {
        await api.pauseGame();
      } else {
        await api.resumeGame();
      }
      loadAllData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetGame = async () => {
    if (window.confirm("RESET COMPETITION PROGRESS? Teams will return to Lobby and scores/attempts will reset to zero.")) {
      try {
        await api.resetGame();
        loadAllData();
        alert("Tournament reset to Lobby.");
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handlePurgeDatabase = async () => {
    const confirmation = window.confirm(
      "⚠️ DANGER: COMPLETE DATABASE PURGE\n\nThis will permanently delete all registered teams, active attempts, and reset the question bank to the default curated set.\n\nAre you sure you want to completely wipe the database?"
    );
    if (confirmation) {
      try {
        await api.purgeDatabase();
        loadAllData();
        alert("✅ Database completely wiped and factory reset!");
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleOpenFinalStage = async () => {
    if (window.confirm("Authorize Level 5 (The Final) for the Top 3 qualified teams?")) {
      try {
        const res = await api.openFinalStage();
        loadAllData();
        alert(`🏆 Final Stage opened for Top 3: ${res.finalists.map(f => f.team_name).join(", ")}`);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // --- Questions ---
  const handleSaveQuestion = async (qData) => {
    try {
      if (qData.id) {
        await api.updateQuestion(qData.id, qData);
      } else {
        await api.createQuestion(qData);
      }
      setEditingQuestion(null);
      setIsCreatingQuestion(false);
      const updated = await api.getQuestions({ level: selectedLevel });
      setQuestions(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm("Delete this question from the bank?")) {
      try {
        await api.deleteQuestion(id);
        setQuestions(questions.filter(q => q.id !== id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleDuplicateQuestion = async (id) => {
    try {
      await api.duplicateQuestion(id);
      const updated = await api.getQuestions({ level: selectedLevel });
      setQuestions(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setImportStatus("Importing...");
      const res = await api.importQuestions(formData);
      setImportStatus(`Successfully imported ${res.imported_count} questions!`);
      const updated = await api.getQuestions({ level: selectedLevel });
      setQuestions(updated);
      setTimeout(() => setImportStatus(""), 4000);
    } catch (err) {
      setImportStatus("Error: " + err.message);
    }
  };

  // --- Category Distribution ---
  const handleSaveCategories = async () => {
    const sum = Object.values(catDistribution).reduce((a, b) => Number(a) + Number(b), 0);
    const target = settings?.questions_per_attempt || 6;
    if (sum !== target) {
      alert(`Category question counts must sum exactly to ${target} (currently ${sum}).`);
      return;
    }
    try {
      await api.updateEventSettings({ category_distribution: catDistribution });
      setSaveSuccessMsg("Category distribution saved!");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Settings ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.updateEventSettings(settingsForm);
      setSaveSuccessMsg("Event settings saved successfully!");
      setTimeout(() => setSaveSuccessMsg(""), 3000);
    } catch (err) {
      alert(err.message);
    }
  };

  // --- Proctor Mode & Capacity Handlers ---
  const handleToggleProctor = async () => {
    try {
      const current = settings?.proctor_enabled !== false;
      await api.updateEventSettings({ proctor_enabled: !current });
      setSettings(prev => ({ ...prev, proctor_enabled: !current }));
      setSettingsForm(prev => ({ ...prev, proctor_enabled: !current }));
      alert(`🛡️ Proctoring is now ${!current ? "ACTIVATED (Full-screen & Tab switch detection enforced)" : "DEACTIVATED (No proctoring on website)"}.`);
      loadAllData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleRestoreProctor = async (teamId, teamName) => {
    if (window.confirm(`Restore proctor access for ${teamName}? This will reset strikes to 0 (3 chances remaining) and reinstate the team.`)) {
      try {
        await api.restoreTeamProctor(teamId);
        alert(`✅ Proctor access restored for ${teamName}! Chances reset to 3.`);
        loadAllData();
      } catch (err) {
        alert("Error: " + err.message);
      }
    }
  };

  const [auditFilter, setAuditFilter] = useState("ALL");

  // --- Password Change ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.changeOrganizerPassword(passForm.current_password, passForm.new_password, passForm.confirm_password);
      setPassMsg("Organizer password updated successfully!");
      setPassForm({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setPassMsg(""), 3000);
    } catch (err) {
      setPassMsg("Error: " + err.message);
    }
  };

  // --- Team Update Handler ---
  const handleSaveTeam = async (teamData) => {
    setIsSavingTeam(true);
    setTeamSaveError("");
    try {
      await api.updateTeam(teamData.team_id, teamData);
      setEditingTeam(null);
      await loadAllData();
    } catch (err) {
      setTeamSaveError(err.message || "Failed to update team settings.");
    } finally {
      setIsSavingTeam(false);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchLevel = selectedLevel ? q.level === selectedLevel : true;
    const matchCat = selectedCategory ? q.category === selectedCategory : true;
    const matchSearch = searchQuery
      ? q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.custom_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchLevel && matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Start Game Modal */}
      <StartGameModal
        isOpen={showStartModal}
        activeTeamsCount={stats?.total_teams || 0}
        onConfirm={handleStartGame}
        onCancel={() => setShowStartModal(false)}
      />

      {/* Top Header & Event Master Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-temporal-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/90 border border-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Terminal className="w-6 h-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                LOOP COMMAND CENTER
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                stats?.event_status === "RUNNING"
                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : stats?.event_status === "PAUSED"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
              }`}>
                STATUS: {stats?.event_status || "LOBBY"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-0.5">
              Live Connected Teams: <strong className="text-cyan-400">{stats?.total_teams || 0}</strong> • 4 Levels (15 Min / Level) • Level 5 Final
            </p>
          </div>
        </div>

        {/* Master Game Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Always show START GAME button if in LOBBY or not running */}
          {stats?.event_status !== "RUNNING" && (
            <button
              onClick={() => setShowStartModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-extrabold font-mono text-xs uppercase flex items-center gap-2 shadow-lg shadow-green-500/25 transition-all animate-pulse"
              title="Start Tournament & Activate Level 1"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START GAME</span>
            </button>
          )}

          {/* Running State Controls: Pause & Restart */}
          {stats?.event_status === "RUNNING" && (
            <>
              <button
                onClick={handlePauseResume}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20"
                title="Pause active tournament countdown"
              >
                <Pause className="w-4 h-4" />
                <span>PAUSE GAME</span>
              </button>
              <button
                onClick={() => setShowStartModal(true)}
                className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all"
                title="Trigger Start / Restart"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START / RESTART</span>
              </button>
            </>
          )}

          {/* Paused State Controls */}
          {stats?.event_status === "PAUSED" && (
            <button
              onClick={handlePauseResume}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all shadow-lg"
              title="Resume tournament"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME GAME</span>
            </button>
          )}

          {/* Global Proctor Mode On/Off Toggle Button */}
          <button
            onClick={handleToggleProctor}
            className={`px-3.5 py-2.5 rounded-xl font-mono text-xs uppercase font-extrabold flex items-center gap-1.5 transition-all shadow-lg ${
              settings?.proctor_enabled !== false
                ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black shadow-green-500/25 ring-2 ring-green-400/50"
                : "bg-slate-700 hover:bg-slate-600 text-gray-300 border border-gray-600"
            }`}
            title="Toggle Proctor Mode (Fullscreen enforcement, Tab switch tracking, 3 chances per player)"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>PROCTOR: {settings?.proctor_enabled !== false ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={handleOpenFinalStage}
            className="px-4 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-400 text-amber-300 font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>OPEN FINAL</span>
          </button>

          <button
            onClick={handleResetGame}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-temporal-card hover:bg-slate-200 dark:hover:bg-temporal-cardLight border border-slate-300 dark:border-temporal-border text-slate-700 dark:text-gray-300 transition-all"
            title="Reset Game to Lobby"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handlePurgeDatabase}
            className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/30"
            title="Complete Wipe & Factory Reset"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>PURGE DB</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-temporal-card border border-slate-300 dark:border-temporal-border text-slate-600 dark:text-gray-400 hover:text-white transition-all"
            title="Lock Console / Logout"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 dark:border-temporal-border pb-3">
        {[
          { id: "leaderboard", label: "Private Leaderboard", icon: Trophy },
          { id: "questions", label: "Question Management", icon: BookOpen },
          { id: "categories", label: "Category Distribution", icon: Sliders },
          { id: "teams", label: "Team Management", icon: Users },
          { id: "settings", label: "Event Settings", icon: Settings },
          { id: "audit", label: "Audit Logs", icon: ShieldCheck }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                isActive
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105"
                  : "bg-slate-100 dark:bg-temporal-card text-slate-600 dark:text-gray-400 hover:text-white hover:bg-slate-200 dark:hover:bg-temporal-cardLight"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: PRIVATE LEADERBOARD --- */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {/* Prominent Tournament Live Control Card */}
          <div className="glass-panel-glow rounded-3xl p-5 border border-cyan-500/40 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-mono shadow-lg ${
                stats?.event_status === "RUNNING"
                  ? "bg-green-500/20 border border-green-500 text-green-400 animate-pulse"
                  : stats?.event_status === "PAUSED"
                  ? "bg-amber-500/20 border border-amber-500 text-amber-400"
                  : "bg-cyan-500/20 border border-cyan-500 text-cyan-400"
              }`}>
                {stats?.event_status === "RUNNING" ? "▶" : stats?.event_status === "PAUSED" ? "⏸" : "⏱"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                    TOURNAMENT PROTOCOL
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    stats?.event_status === "RUNNING"
                      ? "bg-green-500/20 text-green-400 border border-green-500/50"
                      : stats?.event_status === "PAUSED"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                  }`}>
                    {stats?.event_status || "LOBBY"}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {stats?.event_status === "RUNNING"
                    ? "Tournament is actively running across all connected devices."
                    : stats?.event_status === "PAUSED"
                    ? "Tournament is currently paused."
                    : `${stats?.waiting_teams !== undefined ? stats.waiting_teams : (stats?.total_teams || 0)} Team(s) waiting in Lobby for Start Signal`}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
              <button
                onClick={() => setShowStartModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-black font-mono text-xs uppercase flex items-center gap-2 shadow-xl shadow-green-500/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START GAME</span>
              </button>

              {stats?.event_status === "RUNNING" && (
                <button
                  onClick={handlePauseResume}
                  className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs uppercase flex items-center gap-1.5 transition-all shadow-lg"
                >
                  <Pause className="w-4 h-4" />
                  <span>PAUSE</span>
                </button>
              )}

              {stats?.event_status === "PAUSED" && (
                <button
                  onClick={handlePauseResume}
                  className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono text-xs uppercase flex items-center gap-1.5 transition-all shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>RESUME</span>
                </button>
              )}

              <button
                onClick={handleResetGame}
                className="px-3.5 py-3 rounded-xl bg-slate-100 dark:bg-temporal-card hover:bg-slate-200 dark:hover:bg-temporal-cardLight border border-slate-300 dark:border-temporal-border text-slate-700 dark:text-gray-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
                title="Reset tournament back to Lobby mode"
              >
                <RotateCcw className="w-4 h-4" />
                <span>RESET</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-temporal-border">
            <div>
              <h3 className="text-base font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>CONFIDENTIAL ORGANIZER LEADERBOARD</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                Formula: (10 × Q) − (5 × T) − (t / 60) • Tie-breaker: Less Total Time
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadRealTimeStats}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-temporal-border text-xs font-mono flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-temporal-card"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <a
                href="/api/leaderboard/export"
                download
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </a>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-temporal-border">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-100 dark:bg-black/60 text-slate-500 dark:text-gray-400 border-b border-slate-200 dark:border-temporal-border uppercase">
                <tr>
                  <th className="p-3.5">Rank</th>
                  <th className="p-3.5">Team</th>
                  <th className="p-3.5">Level</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Solved</th>
                  <th className="p-3.5">Tokens Used</th>
                  <th className="p-3.5">Time (s)</th>
                  <th className="p-3.5 text-center">Proctor</th>
                  <th className="p-3.5 text-right">Score</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-temporal-border">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-gray-500">
                      No participating teams registered yet.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((team, idx) => (
                    <tr
                      key={team.team_id}
                      className={`hover:bg-slate-50 dark:hover:bg-temporal-card/60 transition-colors ${
                        idx < 3 ? "bg-purple-950/10 dark:bg-purple-950/20" : ""
                      }`}
                    >
                      <td className="p-3.5 font-bold">
                        {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{team.avatar}</span>
                          <span>{team.team_name}</span>
                          {team.is_qualified && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500 text-black font-extrabold">
                              FINALIST
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">{team.team_id} • {team.department}</div>
                      </td>
                      <td className="p-3.5 font-bold text-cyan-400">Level {team.current_level}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          team.status === "ACTIVE"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : team.status === "ELIMINATED"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        }`}>
                          {team.status}
                        </span>
                      </td>
                      <td className="p-3.5">{team.questions_solved}</td>
                      <td className="p-3.5">{team.tokens_used}</td>
                      <td className="p-3.5">{team.total_time_seconds}s</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          (team.proctor_strikes || 0) >= 3 || team.eliminated_by_proctor
                            ? "bg-red-950/80 border-red-500 text-red-300"
                            : (team.proctor_strikes || 0) > 0
                            ? "bg-amber-950/80 border-amber-500 text-amber-300"
                            : "bg-green-950/80 border-green-500 text-green-300"
                        }`}>
                          {team.proctor_chances ?? (3 - (team.proctor_strikes || 0))}/3
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-cyan-400 text-sm">
                        {team.total_score}
                      </td>
                      <td className="p-3.5 text-center">
                        {(team.eliminated_by_proctor || team.status === "ELIMINATED" || (team.proctor_strikes || 0) > 0) && (
                          <button
                            onClick={() => handleRestoreProctor(team.team_id, team.team_name)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 font-mono text-[10px] font-bold transition-all shadow-sm shadow-cyan-500/20"
                            title="Restore Proctor Access & Reset 3 Chances"
                          >
                            Unban / Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 2: QUESTION MANAGEMENT --- */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-temporal-border">
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-all ${
                    selectedLevel === lvl
                      ? "bg-cyan-500 text-black border-cyan-400 shadow-md"
                      : "bg-slate-100 dark:bg-temporal-card border-slate-300 dark:border-temporal-border text-slate-700 dark:text-gray-300"
                  }`}
                >
                  {lvl === 5 ? "Level 5 (Final)" : `Level ${lvl}`} ({stats?.question_counts?.[lvl] || 0})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsCreatingQuestion(true)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>

              <label className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Import CSV/JSON
                <input type="file" accept=".csv,.json" onChange={handleFileUpload} className="hidden" />
              </label>

              <a
                href="/api/organizer/questions/sample-template"
                download
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-temporal-border text-xs font-mono text-slate-600 dark:text-gray-400 hover:text-white"
              >
                Sample Template
              </a>

              <a
                href="/api/organizer/questions/export?format=csv"
                download
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-temporal-border text-xs font-mono text-slate-600 dark:text-gray-400 hover:text-white flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Export CSV
              </a>
            </div>
          </div>

          {importStatus && (
            <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500 text-cyan-300 font-mono text-xs">
              {importStatus}
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border text-xs font-mono text-white outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border text-xs font-mono text-white outline-none"
            >
              <option value="">All 6 Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Question List */}
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-mono text-xs border border-dashed rounded-2xl">
                No questions found matching criteria. Click "+ Add Question" or "Import CSV/JSON".
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-temporal-border hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{q.custom_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                        {q.category}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-gray-900 border border-gray-800">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewQuestion(q)}
                        className="p-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-300"
                        title="Preview as player"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateQuestion(q.id)}
                        className="p-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-300"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="p-1.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-cyan-400"
                        title="Edit Question"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg border border-gray-700 hover:bg-red-950 text-red-400"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-white mb-2 whitespace-pre-line">{q.question_text}</p>
                  {q.code_snippet && (
                    <pre className="p-2.5 rounded-xl bg-black/80 border border-gray-800 text-cyan-300 font-mono text-xs mb-2 overflow-x-auto">
                      <code>{q.code_snippet}</code>
                    </pre>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400 mt-2">
                    {q.options?.map((opt, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg border ${
                          opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
                            ? "border-green-500 bg-green-950/40 text-green-300 font-bold"
                            : "border-gray-800 bg-black/30"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}. {opt} {opt.trim().toLowerCase() === q.correct_answer.trim().toLowerCase() ? "✓" : ""}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: CATEGORY DISTRIBUTION EDITOR --- */}
      {activeTab === "categories" && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/40 max-w-2xl">
          <h3 className="text-lg font-mono font-bold text-white mb-2 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <span>CATEGORY DISTRIBUTION PER ATTEMPT</span>
          </h3>
          <p className="text-xs text-gray-400 font-mono mb-6">
            Configure how many questions from each category appear in a 6-question attempt. Must total exactly {settings?.questions_per_attempt || 6}.
          </p>

          <div className="space-y-4">
            {CATEGORIES.map(cat => (
              <div key={cat} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-black/40 border border-gray-800">
                <span className="font-mono text-xs font-bold text-cyan-300">{cat}</span>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={catDistribution[cat] !== undefined ? catDistribution[cat] : 1}
                  onChange={(e) => setCatDistribution({ ...catDistribution, [cat]: parseInt(e.target.value, 10) || 0 })}
                  className="w-20 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white font-mono text-center text-sm outline-none"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-800">
            <div className="font-mono text-xs text-gray-400">
              Total Allocated: <strong className="text-cyan-400">
                {Object.values(catDistribution).reduce((a, b) => Number(a) + Number(b), 0)}
              </strong> / {settings?.questions_per_attempt || 6}
            </div>
            <button
              onClick={handleSaveCategories}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold shadow-lg"
            >
              Save Distribution
            </button>
          </div>
        </div>
      )}

      {/* --- TAB 4: TEAM MANAGEMENT --- */}
      {activeTab === "teams" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <h3 className="text-base font-mono font-bold text-white">REGISTERED TEAMS ({teams.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(t => (
              <div key={t.team_id} className="glass-panel rounded-2xl p-5 border border-gray-800 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.avatar}</span>
                    <span className="font-bold text-white font-mono">{t.team_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${t.is_active ? "bg-green-950 text-green-300 border border-green-800" : "bg-red-950 text-red-300"}`}>
                      {t.is_active ? "ACTIVE" : "DISABLED"}
                    </span>
                  </div>
                  <div className="text-xs text-cyan-400 font-mono mt-1">ID: {t.team_id} • {t.department}</div>
                  <div className="text-xs text-gray-400 font-mono mt-1">
                    Level {t.current_level} • Score: {t.total_score} pts • Tokens: {t.tokens_remaining}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-gray-400">🕒 Registered: {t.created_at ? new Date(t.created_at).toLocaleString() : "N/A"}</span>
                    <span>•</span>
                    <span className={(t.proctor_strikes || 0) >= 3 || t.eliminated_by_proctor ? "text-red-400 font-bold" : "text-green-400"}>
                      🛡️ Proctor: {t.proctor_chances ?? (3 - (t.proctor_strikes || 0))}/3 Chances ({t.proctor_strikes || 0} Strikes)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(t.eliminated_by_proctor || t.status === "ELIMINATED" || (t.proctor_strikes || 0) > 0) && (
                    <button
                      onClick={() => handleRestoreProctor(t.team_id, t.team_name)}
                      className="p-2 rounded-xl border border-cyan-500/50 hover:bg-cyan-950 text-cyan-300"
                      title="Restore Proctor Access & Reset 3 Chances"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const newP = window.prompt(`Reset password for team ${t.team_name}:`);
                      if (newP && newP.trim()) {
                        await api.updateTeam(t.team_id, { new_password: newP.trim() });
                        alert("Password reset!");
                      }
                    }}
                    className="p-2 rounded-xl border border-gray-800 hover:bg-gray-800 text-gray-300"
                    title="Reset Password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingTeam({ ...t, new_password: "" });
                      setTeamSaveError("");
                    }}
                    className="p-2 rounded-xl border border-gray-800 hover:bg-amber-950/60 text-amber-400 hover:text-amber-300 transition-colors"
                    title="Edit Team Settings & Progress"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete team ${t.team_name}?`)) {
                        await api.deleteTeam(t.team_id);
                        loadAllData();
                      }
                    }}
                    className="p-2 rounded-xl border border-gray-800 hover:bg-red-950 text-red-400"
                    title="Delete Team"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 5: EVENT SETTINGS & PASSWORD CHANGE --- */}
      {activeTab === "settings" && settingsForm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSaveSettings} className="glass-panel rounded-3xl p-6 border border-gray-800 space-y-4">
            <h3 className="text-base font-mono font-bold text-white mb-2">EVENT RULES CONFIGURATION</h3>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Event Title</label>
              <input
                type="text"
                value={settingsForm.title || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Event Tagline</label>
              <input
                type="text"
                value={settingsForm.tagline || ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Timer (Seconds)</label>
                <input
                  type="number"
                  value={settingsForm.timer_duration_seconds || 900}
                  onChange={(e) => setSettingsForm({ ...settingsForm, timer_duration_seconds: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Tokens Per Level</label>
                <input
                  type="number"
                  value={settingsForm.starting_tokens || 3}
                  onChange={(e) => setSettingsForm({ ...settingsForm, starting_tokens: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Score Weight Q</label>
                <input
                  type="number"
                  value={settingsForm.score_weight_q || 10}
                  onChange={(e) => setSettingsForm({ ...settingsForm, score_weight_q: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Token Penalty T</label>
                <input
                  type="number"
                  value={settingsForm.score_weight_t || 5}
                  onChange={(e) => setSettingsForm({ ...settingsForm, score_weight_t: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Time Penalty t/60</label>
                <input
                  type="number"
                  value={settingsForm.score_weight_time || 1}
                  onChange={(e) => setSettingsForm({ ...settingsForm, score_weight_time: parseFloat(e.target.value) })}
                  className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Max Teams Limit (Capacity)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={settingsForm.max_teams_limit || 20}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_teams_limit: parseInt(e.target.value, 10) || 20 })}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Global Proctoring</label>
                <button
                  type="button"
                  onClick={() => setSettingsForm({ ...settingsForm, proctor_enabled: settingsForm.proctor_enabled === false ? true : false })}
                  className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold border transition-all ${
                    settingsForm.proctor_enabled !== false
                      ? "bg-green-950/80 border-green-500 text-green-300"
                      : "bg-red-950/80 border-red-500 text-red-300"
                  }`}
                >
                  {settingsForm.proctor_enabled !== false ? "PROCTOR ACTIVE (ON)" : "PROCTOR DISABLED (OFF)"}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={settingsForm.registration_open || false}
                  onChange={(e) => setSettingsForm({ ...settingsForm, registration_open: e.target.checked })}
                />
                Registration Open
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={settingsForm.show_explanations || false}
                  onChange={(e) => setSettingsForm({ ...settingsForm, show_explanations: e.target.checked })}
                />
                Show Answer Explanations
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs uppercase font-extrabold shadow-lg"
            >
              Save Event Rules
            </button>
          </form>

          {/* Change Organizer Password Box */}
          <form onSubmit={handleChangePassword} className="glass-panel rounded-3xl p-6 border border-gray-800 space-y-4">
            <h3 className="text-base font-mono font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>CHANGE ORGANIZER PASSWORD</span>
            </h3>

            {passMsg && (
              <div className="p-3 rounded-xl bg-purple-950/80 border border-purple-500 text-purple-300 font-mono text-xs">
                {passMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passForm.current_password}
                onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                value={passForm.new_password}
                onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={passForm.confirm_password}
                onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-gray-700 text-white font-mono text-xs outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs uppercase font-extrabold shadow-lg"
            >
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* --- TAB 6: AUDIT & REGISTRATION LOGS --- */}
      {activeTab === "audit" && (
        <div className="glass-panel rounded-3xl p-6 border border-gray-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
            <div>
              <h3 className="text-base font-mono font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>ACTIVITY, REGISTRATION & PROCTOR AUDIT LOGS</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Complete forensic timestamps for team registrations, proctor strikes, and admin events.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              {[
                { id: "ALL", label: `ALL (${auditLogs.length})` },
                { id: "REGISTER", label: `REGISTRATIONS (${auditLogs.filter(l => l.action === "TEAM_REGISTERED").length})` },
                { id: "PROCTOR", label: `PROCTOR (${auditLogs.filter(l => l.action?.includes("PROCTOR")).length})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAuditFilter(f.id)}
                  className={`px-3 py-1 rounded-lg border font-bold transition-all ${
                    auditFilter === f.id
                      ? "bg-cyan-500 text-black border-cyan-400 shadow-sm"
                      : "bg-black/40 border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {auditLogs
              .filter(l => {
                if (auditFilter === "REGISTER") return l.action === "TEAM_REGISTERED";
                if (auditFilter === "PROCTOR") return l.action?.includes("PROCTOR");
                return true;
              })
              .map(l => {
                const isReg = l.action === "TEAM_REGISTERED";
                const isProctorViol = l.action === "PROCTOR_VIOLATION";
                const isProctorDQ = l.action === "PROCTOR_DISQUALIFIED";
                const isProctorRestore = l.action === "PROCTOR_RESTORED";

                const badgeColor = isReg
                  ? "bg-green-950 text-green-300 border-green-700"
                  : isProctorDQ
                  ? "bg-red-950 text-red-300 border-red-700 animate-pulse"
                  : isProctorViol
                  ? "bg-amber-950 text-amber-300 border-amber-700"
                  : isProctorRestore
                  ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                  : "bg-purple-950 text-purple-300 border-purple-800";

                return (
                  <div key={l.id} className="p-3 rounded-xl bg-black/40 border border-gray-800/80 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-gray-700 transition-colors">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider shrink-0 ${badgeColor}`}>
                        {l.action}
                      </span>
                      <span className="text-gray-200">{l.details}</span>
                    </div>
                    <div className="text-[11px] text-gray-400 shrink-0 sm:text-right font-medium pl-1">
                      <span className="text-gray-500">{l.actor} • </span>
                      <span className="text-cyan-400 font-bold">{new Date(l.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Question Create / Edit Modal */}
      {(isCreatingQuestion || editingQuestion) && (
        <QuestionEditModal
          question={editingQuestion}
          defaultLevel={selectedLevel}
          onSave={handleSaveQuestion}
          onClose={() => {
            setEditingQuestion(null);
            setIsCreatingQuestion(false);
          }}
        />
      )}

      {/* Question Player Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <span className="font-mono text-xs text-cyan-400">PLAYER PREVIEW MODE</span>
              <button onClick={() => setPreviewQuestion(null)} className="text-gray-400 hover:text-white font-mono text-xs">
                ✕ Close Preview
              </button>
            </div>
            <div className="glass-panel rounded-3xl p-6 border border-cyan-400">
              <div className="text-xs font-mono text-purple-400 mb-2">{previewQuestion.category} • Level {previewQuestion.level}</div>
              <p className="text-base font-medium text-white mb-4 whitespace-pre-line">{previewQuestion.question_text}</p>
              {previewQuestion.code_snippet && (
                <pre className="p-3 rounded-xl bg-black border border-gray-800 text-cyan-300 font-mono text-xs mb-4">
                  <code>{previewQuestion.code_snippet}</code>
                </pre>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {previewQuestion.options?.map((opt, i) => (
                  <div key={i} className="p-3 rounded-xl border border-gray-700 bg-gray-900 text-white">
                    {String.fromCharCode(65 + i)}. {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Settings / Edit Modal */}
      {editingTeam && (
        <TeamEditModal
          team={editingTeam}
          onSave={handleSaveTeam}
          onClose={() => setEditingTeam(null)}
          isSaving={isSavingTeam}
          errorMsg={teamSaveError}
        />
      )}
    </div>
  );
}

// Modal Form for editing team settings and tournament progress
function TeamEditModal({ team, onSave, onClose, isSaving, errorMsg }) {
  const [formData, setFormData] = useState({
    team_id: team?.team_id || "",
    team_name: team?.team_name || "",
    avatar: team?.avatar || "⚡",
    department: team?.department || DEPARTMENTS[0],
    status: team?.status || "WAITING",
    is_active: team?.is_active !== undefined ? team.is_active : true,
    current_level: team?.current_level || 1,
    tokens_remaining: team?.tokens_remaining !== undefined ? team.tokens_remaining : 3,
    total_score: team?.total_score || 0,
    new_password: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="max-w-xl w-full glass-panel-glow rounded-3xl p-6 sm:p-8 border border-amber-500/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-xl">
              {formData.avatar}
            </div>
            <div>
              <h3 className="text-lg font-mono font-bold text-white">EDIT TEAM: {formData.team_name}</h3>
              <p className="text-[11px] text-gray-400 font-mono">ID: {formData.team_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/80 border border-red-500 text-red-300 font-mono text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-gray-400 uppercase mb-1">Team Name</label>
            <input
              type="text"
              required
              value={formData.team_name}
              onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-400 uppercase mb-1">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white"
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 uppercase mb-1">Tournament Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-amber-300 font-bold"
              >
                <option value="WAITING">WAITING (Lobby)</option>
                <option value="ACTIVE">ACTIVE (In Game)</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ESCAPED">ESCAPED (Cleared Level 4)</option>
                <option value="ELIMINATED">ELIMINATED</option>
                <option value="QUALIFIED_FINAL">QUALIFIED_FINAL (Top 3)</option>
              </select>
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-gray-400 uppercase mb-1">Team Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(av => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar: av })}
                  className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center transition-all ${
                    formData.avatar === av
                      ? "border-cyan-400 bg-cyan-950/60 scale-110 shadow-lg shadow-cyan-500/30"
                      : "border-gray-800 bg-black/40 hover:border-gray-600"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Controls: Level, Tokens, Score */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-gray-400 uppercase mb-1">Level (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.current_level}
                onChange={(e) => setFormData({ ...formData, current_level: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-gray-400 uppercase mb-1">Tokens (0-3)</label>
              <input
                type="number"
                min="0"
                max="3"
                value={formData.tokens_remaining}
                onChange={(e) => setFormData({ ...formData, tokens_remaining: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-cyan-300 font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-gray-400 uppercase mb-1">Total Score</label>
              <input
                type="number"
                step="0.1"
                value={formData.total_score}
                onChange={(e) => setFormData({ ...formData, total_score: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-green-300 font-bold text-center"
              />
            </div>
          </div>

          {/* Active status & New password */}
          <div className="pt-2 border-t border-gray-800 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500"
              />
              <span className="text-white font-bold">Team Account Active (Can log in & play)</span>
            </label>

            <div>
              <label className="block text-gray-400 uppercase mb-1">Reset Password (Leave blank to keep unchanged)</label>
              <input
                type="text"
                placeholder="Enter new password if changing..."
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white font-mono"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl border border-gray-700 bg-gray-800 text-gray-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold shadow-lg flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Team Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Form for creating / editing questions
function QuestionEditModal({ question, defaultLevel = 1, onSave, onClose }) {
  const [formData, setFormData] = useState({
    id: question?.id,
    custom_id: question?.custom_id || "",
    level: question?.level || defaultLevel,
    category: question?.category || CATEGORIES[0],
    difficulty: question?.difficulty || "Intermediate",
    type: question?.type || "mcq",
    question_text: question?.question_text || "",
    code_snippet: question?.code_snippet || "",
    options: question?.options ? [...question.options] : ["", "", "", ""],
    correct_answer: question?.correct_answer || "",
    explanation: question?.explanation || "",
    is_active: question ? question.is_active : true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.question_text.trim() || !formData.correct_answer.trim()) {
      alert("Question text and correct answer are required.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl select-none">
      <div className="max-w-2xl w-full glass-panel-glow rounded-3xl p-6 sm:p-8 border border-cyan-500/50 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-mono font-bold text-white mb-4">
          {question ? `EDIT QUESTION (${question.custom_id})` : "CREATE NEW QUESTION"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-400 mb-1">Level (1-5)</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white"
              >
                {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white"
              >
                {["Easy", "Intermediate", "Hard"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Question Prompt *</label>
            <textarea
              rows={3}
              required
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-white font-sans text-sm"
              placeholder="Enter question text..."
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Python Code Snippet (Optional)</label>
            <textarea
              rows={3}
              value={formData.code_snippet}
              onChange={(e) => setFormData({ ...formData, code_snippet: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-cyan-300 font-mono text-xs"
              placeholder="# Python code snippet for output prediction or debugging..."
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Answer Options (4 choices)</label>
            <div className="grid grid-cols-2 gap-2">
              {formData.options.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...formData.options];
                    newOpts[i] = e.target.value;
                    setFormData({ ...formData, options: newOpts });
                  }}
                  className="px-3 py-2 rounded-xl bg-black border border-gray-700 text-white"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-green-400 font-bold mb-1">Correct Answer (Exact match with option) *</label>
            <input
              type="text"
              required
              placeholder="e.g. 193 or [1, 2, 3]"
              value={formData.correct_answer}
              onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black border border-green-500 text-green-300 font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Explanation (Shown after relevant stage if enabled)</label>
            <textarea
              rows={2}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-black border border-gray-700 text-gray-300"
              placeholder="Explain why the answer is correct..."
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-700 bg-gray-800 text-gray-300 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-lg"
            >
              Save Question
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
