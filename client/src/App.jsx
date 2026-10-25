import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import PlayerLoginView from "./views/PlayerLoginView";
import WaitingRoomView from "./views/WaitingRoomView";
import GamePlayView from "./views/GamePlayView";
import FinalStageView from "./views/FinalStageView";
import EliminatedView from "./views/EliminatedView";
import EscapedView from "./views/EscapedView";
import PublicLeaderboardView from "./views/PublicLeaderboardView";
import OrganizerLoginView from "./views/OrganizerLoginView";
import OrganizerDashboardView from "./views/OrganizerDashboardView";
import CountdownModal from "./components/CountdownModal";
import { api } from "./services/api";
import { wsClient } from "./utils/ws";
import { sounds } from "./audio/soundEngine";
import { Radio } from "lucide-react";

export default function App() {
  // Theme state (Dark Mode Default)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("loop_theme");
    return saved !== null ? saved === "dark" : true;
  });

  // Navigation Route: 'home' | 'organizer' | 'leaderboard'
  const [route, setRoute] = useState(() => {
    if (window.location.hash === "#/organizer") return "organizer";
    if (window.location.hash === "#/leaderboard") return "leaderboard";
    return "home";
  });

  // Authentication State
  const [organizer, setOrganizer] = useState(null);
  const [team, setTeam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [eventStatus, setEventStatus] = useState("LOBBY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [proctorEnabled, setProctorEnabled] = useState(true);

  // Sync theme with HTML document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("loop_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("loop_theme", "light");
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Sync route with window hash
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#/organizer") {
        setRoute("organizer");
      } else if (window.location.hash === "#/leaderboard") {
        setRoute("leaderboard");
      } else {
        setRoute("home");
      }
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleNavigate = (newRoute) => {
    if (newRoute === "organizer") {
      setRoute("organizer");
      window.location.hash = "#/organizer";
    } else if (newRoute === "leaderboard") {
      setRoute("leaderboard");
      window.location.hash = "#/leaderboard";
    } else {
      setRoute("home");
      window.location.hash = "";
    }
  };

  // Session Restoration
  useEffect(() => {
    const restoreSession = async () => {
      const role = localStorage.getItem("loop_role");
      const token = localStorage.getItem("loop_token");
      if (!token) return;

      if (role === "organizer") {
        try {
          const org = await api.getOrganizerMe();
          setOrganizer(org);
        } catch {
          localStorage.removeItem("loop_token");
          localStorage.removeItem("loop_role");
        }
      } else if (role === "team") {
        try {
          const tm = await api.getTeamMe();
          setTeam(tm);
          await refreshPlayerState();
        } catch {
          localStorage.removeItem("loop_token");
          localStorage.removeItem("loop_role");
        }
      }
    };

    restoreSession();
  }, []);

  // Fetch / Refresh Team Gameplay State
  const refreshPlayerState = useCallback(async () => {
    try {
      const state = await api.getPlayerState();
      setEventStatus(state.event_status);
      if (state.proctor_enabled !== undefined) {
        setProctorEnabled(state.proctor_enabled);
      }
      if (state.team) {
        setTeam(state.team);
      }
      const q = state.current_question || state.active_question;
      if (q) {
        setCurrentQuestion({
          ...q,
          remaining_seconds: q.remaining_seconds !== undefined ? q.remaining_seconds : state.remaining_seconds,
          tokens: q.tokens !== undefined ? q.tokens : state.tokens,
          question_number: q.question_number !== undefined ? q.question_number : state.question_number,
          total_questions: q.total_questions !== undefined ? q.total_questions : state.total_questions,
          question_results: q.question_results !== undefined ? q.question_results : state.question_results,
          attempt_number: q.attempt_number !== undefined ? q.attempt_number : (state.attempt_number || 1),
          level_solved_count: q.level_solved_count !== undefined ? q.level_solved_count : (state.level_solved_count || 0),
          level_target: q.level_target !== undefined ? q.level_target : (state.level_target || 6)
        });
      }
    } catch {
      // Ignore if unauthenticated or lobby
    }
  }, []);

  // WebSocket Connection & Real-Time Listeners
  useEffect(() => {
    const role = organizer ? "organizer" : team ? "team" : "guest";
    const identifier = organizer ? organizer.username : team ? team.team_id : "";
    wsClient.connect(role, identifier);

    const unsubs = [
      wsClient.on("game_started", () => {
        setEventStatus("RUNNING");
        refreshPlayerState();
      }),
      wsClient.on("game_paused", () => {
        setEventStatus("PAUSED");
        refreshPlayerState();
      }),
      wsClient.on("game_resumed", () => {
        setEventStatus("RUNNING");
        refreshPlayerState();
      }),
      wsClient.on("event_reset", () => {
        setEventStatus("LOBBY");
        refreshPlayerState();
      }),
      wsClient.on("database_purged", () => {
        localStorage.removeItem("loop_token");
        localStorage.removeItem("loop_role");
        setTeam(null);
        setOrganizer(null);
        setCurrentQuestion(null);
        setEventStatus("LOBBY");
      }),
      wsClient.on("emergency_announcement", (data) => {
        if (data?.message) {
          setEmergencyAlert(data.message);
          sounds.playGlitchBuzz();
          setTimeout(() => setEmergencyAlert(null), 8000);
        }
      }),
      wsClient.on("proctor_settings_updated", (data) => {
        if (data?.proctor_enabled !== undefined) {
          setProctorEnabled(data.proctor_enabled);
        }
      }),
      wsClient.on("proctor_restored", () => {
        refreshPlayerState();
      }),
      wsClient.on("final_stage_opened", () => {
        setEventStatus("FINAL_STAGE");
        refreshPlayerState();
      })
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [organizer, team, refreshPlayerState]);

  // Fast Auto-Refresh Feature: Instantly detects when admin starts or resumes the game without manual reload!
  useEffect(() => {
    if (!team) return;

    // Fast 1.5s auto-poll when paused, lobby, or waiting; 5s fallback during active gameplay
    const pollIntervalMs = (eventStatus === "PAUSED" || eventStatus === "LOBBY" || team?.status === "WAITING") ? 1500 : 5000;

    const interval = setInterval(() => {
      refreshPlayerState();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [team?.status, eventStatus, refreshPlayerState]);

  // Auth Handlers
  const handleOrganizerLogin = (org) => {
    setOrganizer(org);
    setRoute("organizer");
  };

  const handleOrganizerLogout = async () => {
    await api.organizerLogout();
    setOrganizer(null);
    handleNavigate("home");
  };

  const handleTeamLogin = (tm) => {
    setTeam(tm);
    refreshPlayerState();
  };

  const handleTeamLogout = async () => {
    await api.teamLogout();
    setTeam(null);
    setCurrentQuestion(null);
  };

  // Gameplay Handlers
  const handleSubmitAnswer = useCallback(async (answer) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.submitAnswer(answer);
      if (res.team) {
        setTeam(res.team);
      } else if (res.current_level !== undefined) {
        setTeam((prev) => prev ? {
          ...prev,
          current_level: res.current_level,
          tokens_remaining: res.tokens_remaining !== undefined ? res.tokens_remaining : prev.tokens_remaining,
          total_score: res.total_score !== undefined ? res.total_score : prev.total_score,
          status: (res.status === "ESCAPED" || res.status === "ELIMINATED") ? res.status : prev.status
        } : prev);
      }
      if (res.next_question) {
        setCurrentQuestion({
          ...res.next_question,
          tokens: res.tokens_remaining ?? res.team?.tokens_remaining ?? res.next_question.tokens,
          question_results: res.next_question.question_results ?? res.question_results,
          attempt_number: res.next_question.attempt_number ?? res.attempt_number ?? 1,
          level_solved_count: res.next_question.level_solved_count ?? res.level_solved_count ?? 0,
          level_target: res.next_question.level_target ?? res.level_target ?? 6
        });
      } else if (res.status === "ESCAPED" || res.status === "ELIMINATED") {
        setCurrentQuestion(null);
      }
      return res;
    } catch (err) {
      console.error("Submit answer error:", err);
      return { correct: false, message: err.message || "Failed to submit answer." };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  const handleTimeout = useCallback(async () => {
    try {
      const res = await api.triggerTimeout();
      if (res.team) {
        setTeam(res.team);
      } else if (res.current_level !== undefined) {
        setTeam((prev) => prev ? {
          ...prev,
          current_level: res.current_level,
          tokens_remaining: res.tokens_remaining !== undefined ? res.tokens_remaining : prev.tokens_remaining,
          total_score: res.total_score !== undefined ? res.total_score : prev.total_score,
          status: (res.status === "ESCAPED" || res.status === "ELIMINATED") ? res.status : prev.status
        } : prev);
      }
      if (res.next_question) {
        setCurrentQuestion({
          ...res.next_question,
          tokens: res.tokens_remaining ?? res.team?.tokens_remaining ?? res.next_question.tokens,
          question_results: res.next_question.question_results ?? [],
          attempt_number: res.next_question.attempt_number ?? 1,
          level_solved_count: res.next_question.level_solved_count ?? res.level_solved_count ?? 0,
          level_target: res.next_question.level_target ?? res.level_target ?? 6
        });
      } else if (res.status === "ELIMINATED") {
        setCurrentQuestion(null);
      }
    } catch (err) {
      console.error("Timeout trigger error:", err);
    }
  }, []);

  // View Resolution for Participants
  const renderParticipantView = () => {
    if (!team) {
      return <PlayerLoginView onLoginSuccess={handleTeamLogin} />;
    }

    if (team.status === "ELIMINATED") {
      return <EliminatedView team={team} />;
    }

    if (team.status === "ESCAPED") {
      if ((eventStatus === "FINAL_STAGE" || team.level === 5) && team.is_finalist) {
        return (
          <FinalStageView
            team={team}
            question={currentQuestion}
            onSubmitAnswer={handleSubmitAnswer}
            isSubmitting={isSubmitting}
          />
        );
      }
      return <EscapedView team={team} />;
    }

    if (eventStatus === "LOBBY") {
      return <WaitingRoomView team={team} onLogout={handleTeamLogout} />;
    }

    // PAUSED STATE: Organizers paused tournament -> Hide questions & freeze time
    if (eventStatus === "PAUSED") {
      return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel rounded-3xl p-8 border-2 border-amber-500/50 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/30">
              <span className="text-3xl animate-pulse">⏸️</span>
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40 inline-block mb-3">
              TIMELINE FROZEN
            </span>

            <h2 className="text-2xl font-mono font-black text-slate-900 dark:text-white mb-2">
              GAME PAUSED BY ORGANIZER
            </h2>

            <p className="text-xs sm:text-sm font-mono text-slate-600 dark:text-gray-300 mb-6 leading-relaxed">
              The organizer has temporarily paused the tournament. All questions are hidden and the countdown timer is paused.
            </p>

            <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 text-left font-mono text-xs text-gray-300 space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className="text-gray-400">TEAM:</span>
                <strong className="text-cyan-400">{team?.team_name}</strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className="text-gray-400">CURRENT LEVEL:</span>
                <strong className="text-purple-400">Level {team?.current_level || 1}</strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400">STATUS:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  STAND BY FOR RESUME SIGNAL
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (team.status === "WAITING") {
      if (eventStatus === "RUNNING") {
        refreshPlayerState();
      }
      return <WaitingRoomView team={team} onLogout={handleTeamLogout} />;
    }

    if (team.level === 5) {
      return (
        <FinalStageView
          team={team}
          question={currentQuestion}
          onSubmitAnswer={handleSubmitAnswer}
          isSubmitting={isSubmitting}
        />
      );
    }

    if (currentQuestion) {
      return (
        <GamePlayView
          team={team}
          currentQuestion={currentQuestion}
          onSubmitAnswer={handleSubmitAnswer}
          onTimeout={handleTimeout}
          isSubmitting={isSubmitting}
          isPaused={eventStatus === "PAUSED"}
          proctorEnabled={proctorEnabled}
          onProctorEliminated={() => refreshPlayerState()}
        />
      );
    }

    // If game is running but question is loading, show syncing indicator
    if (eventStatus === "RUNNING") {
      return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center mb-4 animate-spin">
            <span className="text-2xl">⚡</span>
          </div>
          <h2 className="text-xl font-mono font-bold text-slate-900 dark:text-white mb-1">SYNCHRONIZING TIMELINE...</h2>
          <p className="text-xs font-mono text-cyan-600 dark:text-cyan-400">Loading your Level {team.level || 1} challenge...</p>
        </div>
      );
    }

    return <WaitingRoomView team={team} onLogout={handleTeamLogout} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060913] text-slate-900 dark:text-gray-100 font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-300">
      {/* Top Navigation */}
      <Navbar
        team={team}
        eventStatus={eventStatus}
        currentRoute={route}
        onNavigate={handleNavigate}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onLogoutPlayer={handleTeamLogout}
      />

      {/* Emergency Announcement Banner */}
      {emergencyAlert && (
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 px-4 py-2 text-white dark:text-black font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg animate-pulse sticky top-14 z-50">
          <Radio className="w-4 h-4 animate-spin" />
          <span>ANNOUNCEMENT: {emergencyAlert}</span>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <CountdownModal
          countdown={countdown}
          onComplete={() => setCountdown(null)}
        />
      )}

      {/* Main Routed Area */}
      <main className="flex-1">
        {route === "organizer" ? (
          organizer ? (
            <OrganizerDashboardView onLogout={handleOrganizerLogout} />
          ) : (
            <OrganizerLoginView onLoginSuccess={handleOrganizerLogin} />
          )
        ) : route === "leaderboard" ? (
          <PublicLeaderboardView />
        ) : (
          renderParticipantView()
        )}
      </main>

      {/* Modern Responsive Footer */}
      <footer className="border-t border-slate-200 dark:border-temporal-border/50 py-4 px-6 text-center font-mono text-[11px] text-slate-500 dark:text-gray-500 transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
          <div>LOOP // Futuristic Time-Based Team Tournament</div>
          <div className="text-slate-600 dark:text-gray-400">
            Every Second Counts • Every Answer Saves the Timeline
          </div>
        </div>
      </footer>
    </div>
  );
}
