import React, { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import PlayerLoginView from "./views/PlayerLoginView";
import WaitingRoomView from "./views/WaitingRoomView";
import GamePlayView from "./views/GamePlayView";
import FinalStageView from "./views/FinalStageView";
import EliminatedView from "./views/EliminatedView";
import EscapedView from "./views/EscapedView";
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

  // Navigation Route: 'home' | 'organizer'
  const [route, setRoute] = useState(() => {
    return window.location.hash === "#/organizer" ? "organizer" : "home";
  });

  // Authentication State
  const [organizer, setOrganizer] = useState(null);
  const [team, setTeam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [eventStatus, setEventStatus] = useState("LOBBY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [countdown, setCountdown] = useState(null);

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
          total_questions: q.total_questions !== undefined ? q.total_questions : state.total_questions
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
      }),
      wsClient.on("game_resumed", () => {
        setEventStatus("RUNNING");
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
      wsClient.on("final_stage_opened", () => {
        setEventStatus("FINAL_STAGE");
        refreshPlayerState();
      })
    ];

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [organizer, team, refreshPlayerState]);

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
  const handleSubmitAnswer = async (answer) => {
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
          tokens: res.tokens_remaining ?? res.team?.tokens_remaining ?? res.next_question.tokens
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
  };

  const handleTimeout = async () => {
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
          tokens: res.tokens_remaining ?? res.team?.tokens_remaining ?? res.next_question.tokens
        });
      } else if (res.status === "ELIMINATED") {
        setCurrentQuestion(null);
      }
    } catch (err) {
      console.error("Timeout trigger error:", err);
    }
  };

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
