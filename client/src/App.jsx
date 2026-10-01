import React, { useState, useEffect } from "react";
import { socket } from "./utils/socket";
import Navbar from "./components/Navbar";
import CountdownModal from "./components/CountdownModal";
import WildCardModal from "./components/WildCardModal";
import AdminPasscodeModal from "./components/AdminPasscodeModal";
import RegistrationView from "./views/RegistrationView";
import WaitingRoomView from "./views/WaitingRoomView";
import GameLoopView from "./views/GameLoopView";
import EliminatedView from "./views/EliminatedView";
import EscapedView from "./views/EscapedView";
import FinalRoundView from "./views/FinalRoundView";
import HostDashboardView from "./views/HostDashboardView";
import ProjectorStageView from "./views/ProjectorStageView";
import { sounds } from "./audio/soundEngine";
import { ShieldAlert, Radio } from "lucide-react";

export default function App() {
  // Theme state: dark mode default
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("timeloop_theme");
    return saved !== null ? saved === "dark" : true;
  });

  // Admin authentication state (PIN: 107)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem("timeloop_admin_auth") === "true";
  });
  const [showAdminPasscodeModal, setShowAdminPasscodeModal] = useState(false);

  // Navigation route: 'home', 'host', 'projector'
  const [route, setRoute] = useState("home");
  
  // Participant State
  const [player, setPlayer] = useState(() => {
    const saved = localStorage.getItem("timeloop_player");
    return saved ? JSON.parse(saved) : null;
  });
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [eventStatus, setEventStatus] = useState("LOBBY");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Global Dashboard / Telemetry Data
  const [dashboardStats, setDashboardStats] = useState(null);

  // Modal Overlays
  const [countdown, setCountdown] = useState(null);
  const [emergencyAlert, setEmergencyAlert] = useState(null);

  // Synchronize theme class with documentElement
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("timeloop_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("timeloop_theme", "light");
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Handle Hash Routing
  useEffect(() => {
    const updateRoute = () => {
      const hash = window.location.hash;
      if (hash === "#/host") {
        if (!isAdminAuthenticated) {
          setShowAdminPasscodeModal(true);
        } else {
          setRoute("host");
          socket.emit("join_host");
        }
      } else if (hash === "#/projector" || hash === "#/stage") {
        setRoute("projector");
        socket.emit("join_projector");
      } else {
        setRoute("home");
      }
    };

    updateRoute();
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, [isAdminAuthenticated]);

  const handleNavigate = (newRoute) => {
    if (newRoute === "host") {
      if (!isAdminAuthenticated) {
        setShowAdminPasscodeModal(true);
        return;
      }
      setRoute("host");
      window.location.hash = "#/host";
      socket.emit("join_host");
    } else if (newRoute === "projector") {
      setRoute("projector");
      window.location.hash = "#/projector";
      socket.emit("join_projector");
    } else {
      setRoute("home");
      window.location.hash = "";
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem("timeloop_admin_auth", "true");
    setShowAdminPasscodeModal(false);
    setRoute("host");
    window.location.hash = "#/host";
    socket.emit("join_host");
  };

  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem("timeloop_admin_auth");
    handleNavigate("home");
  };

  // Reconnect player session if stored
  useEffect(() => {
    if (player?.usn) {
      socket.emit("register_player", player, (res) => {
        if (res?.success) {
          setPlayer(res.player);
          setEventStatus(res.eventStatus);
          if (res.currentQuestion) {
            setCurrentQuestion(res.currentQuestion);
          }
        }
      });
    }
  }, []);

  // Global Socket Listeners
  useEffect(() => {
    socket.on("dashboard_update", (stats) => {
      setDashboardStats(stats);
      setEventStatus(stats.status);
      
      if (player?.usn) {
        const updated = stats.leaderboard?.find(p => p.usn === player.usn);
        if (updated && updated.status !== player.status) {
          setPlayer(prev => ({ ...prev, status: updated.status, level: updated.level, attemptIndex: updated.attempt - 1 }));
        }
      }
    });

    socket.on("projector_update", (stats) => {
      setDashboardStats(stats);
      setEventStatus(stats.status);
    });

    socket.on("start_countdown", ({ seconds }) => {
      setCountdown(seconds);
    });

    socket.on("game_started", ({ question, eventStatus }) => {
      setCountdown(null);
      setEventStatus(eventStatus);
      if (question) setCurrentQuestion(question);
      setPlayer(prev => prev ? { ...prev, status: "ACTIVE", level: 1, attemptIndex: 0 } : null);
    });

    socket.on("emergency_announcement", ({ message }) => {
      setEmergencyAlert(message);
      sounds.playGlitchBuzz();
      setTimeout(() => setEmergencyAlert(null), 8000);
    });

    socket.on("disqualified", ({ reason }) => {
      setPlayer(prev => prev ? { ...prev, status: "DISQUALIFIED", disqualifyReason: reason } : null);
      sounds.playElimination();
    });

    socket.on("pardoned", () => {
      setPlayer(prev => prev ? { ...prev, status: "ACTIVE", strikes: 0, disqualifyReason: null } : null);
    });

    socket.on("wild_card_started", (wildCardData) => {
      setDashboardStats(prev => ({ ...prev, wildCard: wildCardData, status: "WILD_CARD" }));
      setEventStatus("WILD_CARD");
    });

    socket.on("final_round_started", () => {
      setEventStatus("FINAL_ROUND");
    });

    socket.on("event_reset", () => {
      setPlayer(prev => prev ? { ...prev, status: "WAITING", level: 1, attemptIndex: 0 } : null);
      setCurrentQuestion(null);
      setEventStatus("LOBBY");
    });

    return () => {
      socket.off("dashboard_update");
      socket.off("projector_update");
      socket.off("start_countdown");
      socket.off("game_started");
      socket.off("emergency_announcement");
      socket.off("disqualified");
      socket.off("pardoned");
      socket.off("wild_card_started");
      socket.off("final_round_started");
      socket.off("event_reset");
    };
  }, [player?.usn]);

  const handleRegister = (formData) => {
    setIsSubmitting(true);
    socket.emit("register_player", formData, (res) => {
      setIsSubmitting(false);
      if (res?.success) {
        setPlayer(res.player);
        setEventStatus(res.eventStatus);
        localStorage.setItem("timeloop_player", JSON.stringify(res.player));
        if (res.currentQuestion) {
          setCurrentQuestion(res.currentQuestion);
        }
      } else {
        alert(res?.error || "Registration failed. Try again.");
      }
    });
  };

  const handleSubmitAnswer = (answerGiven) => {
    if (!player || isSubmitting) return;
    setIsSubmitting(true);

    socket.emit("submit_answer", { usn: player.usn, answer: answerGiven }, (res) => {
      setIsSubmitting(false);
      if (res?.status === "ESCAPED") {
        setPlayer(prev => ({ ...prev, status: "ESCAPED" }));
        setCurrentQuestion(null);
      } else if (res?.status === "LEVEL_CLEARED") {
        setPlayer(prev => ({ ...prev, level: res.level, attemptIndex: 0 }));
        if (res.nextQuestion) setCurrentQuestion(res.nextQuestion);
      } else if (res?.status === "ELIMINATED") {
        setPlayer(prev => ({ ...prev, status: "ELIMINATED" }));
        setCurrentQuestion(null);
      } else if (res?.status === "NEXT_QUESTION" || res?.nextQuestion) {
        setPlayer(prev => ({
          ...prev,
          level: res.level || prev.level,
          attemptIndex: res.attemptNumber !== undefined ? res.attemptNumber - 1 : (prev.attemptIndex || 0) + 1
        }));
        if (res.nextQuestion) setCurrentQuestion(res.nextQuestion);
      }
    });
  };

  const handlePickWildCard = (cardId) => {
    if (!player) return;
    socket.emit("pick_wild_card", { usn: player.usn, cardId }, (res) => {
      if (res?.card?.type === "BOMB") {
        setPlayer(prev => ({ ...prev, status: "FINALIST" }));
      }
    });
  };

  const handleSubmitFinalStage = (stageNum, answer, callback) => {
    if (!player) return;
    setIsSubmitting(true);
    socket.emit("submit_final_stage", { usn: player.usn, stageNum, answer }, (res) => {
      setIsSubmitting(false);
      if (callback) callback(res);
    });
  };

  const renderParticipantView = () => {
    if (!player) {
      return <RegistrationView onRegister={handleRegister} isSubmitting={isSubmitting} />;
    }

    if (player.status === "DISQUALIFIED") {
      return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
          <div className="glass-panel-danger rounded-3xl p-8 max-w-md w-full text-center border-2 border-red-500 shadow-2xl">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-mono font-black text-red-600 dark:text-red-400 mb-2">
              DISQUALIFIED
            </h2>
            <p className="text-sm text-slate-700 dark:text-gray-300 mb-4 font-mono">
              {player.disqualifyReason || "Multiple anti-cheat security violations triggered."}
            </p>
            <div className="text-xs text-red-600 dark:text-red-300 font-mono font-bold">
              SESSION TERMINATED
            </div>
          </div>
        </div>
      );
    }

    if (eventStatus === "FINAL_ROUND" && player.status === "FINALIST") {
      return (
        <FinalRoundView
          player={player}
          finalRoundData={dashboardStats?.finalRound}
          onSubmitStageAnswer={handleSubmitFinalStage}
          isSubmitting={isSubmitting}
        />
      );
    }

    if (player.status === "ESCAPED") {
      return <EscapedView player={player} stats={dashboardStats} />;
    }

    if (player.status === "ELIMINATED") {
      return <EliminatedView player={player} wildCardData={dashboardStats?.wildCard} />;
    }

    if (eventStatus === "LOBBY" || player.status === "WAITING") {
      return <WaitingRoomView player={player} stats={dashboardStats} />;
    }

    if (player.status === "ACTIVE" && currentQuestion) {
      return (
        <GameLoopView
          player={player}
          currentQuestion={currentQuestion}
          onSubmitAnswer={handleSubmitAnswer}
          isSubmitting={isSubmitting}
        />
      );
    }

    return <WaitingRoomView player={player} stats={dashboardStats} />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060913] text-slate-900 dark:text-gray-100 font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar
        player={player}
        eventStatus={eventStatus}
        currentRoute={route}
        onNavigate={handleNavigate}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Admin Passcode Modal (PIN: 107) */}
      <AdminPasscodeModal
        isOpen={showAdminPasscodeModal}
        onSuccess={handleAdminAuthSuccess}
        onCancel={() => {
          setShowAdminPasscodeModal(false);
          if (window.location.hash === "#/host") window.location.hash = "";
        }}
      />

      {/* Emergency Announcement Banner */}
      {emergencyAlert && (
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 px-4 py-2 text-white dark:text-black font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg animate-pulse sticky top-14 z-50">
          <Radio className="w-4 h-4 animate-spin" />
          <span>ANNOUNCEMENT: {emergencyAlert}</span>
        </div>
      )}

      {/* 3-2-1 Synchronized Countdown Overlay */}
      {countdown !== null && (
        <CountdownModal
          countdown={countdown}
          onComplete={() => setCountdown(null)}
        />
      )}

      {/* Interactive Wild Card Overlay for Eliminated Candidates */}
      {dashboardStats?.wildCard?.active && player?.status === "ELIMINATED" && (
        <WildCardModal
          wildCardData={dashboardStats.wildCard}
          currentUserUSN={player?.usn}
          onPickCard={handlePickWildCard}
        />
      )}

      {/* Main Routed Content */}
      <main className="flex-1">
        {route === "host" ? (
          <HostDashboardView stats={dashboardStats} onLockAdmin={handleLockAdmin} />
        ) : route === "projector" ? (
          <ProjectorStageView stats={dashboardStats} />
        ) : (
          renderParticipantView()
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-temporal-border/50 py-4 px-6 text-center font-mono text-[11px] text-slate-500 dark:text-gray-500 transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-2">
          <div>TIME LOOP // Advanced Elimination Tournament Engine</div>
          <div className="text-slate-600 dark:text-gray-400">16s → 14s → 12s → 10s → 8s → 6s</div>
        </div>
      </footer>
    </div>
  );
}
