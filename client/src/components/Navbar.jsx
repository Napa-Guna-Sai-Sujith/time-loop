import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Sun, Moon, Clock, Terminal, Monitor, User, Lock, KeyRound, LogOut } from "lucide-react";
import { sounds } from "../audio/soundEngine";

export default function Navbar({ 
  player, 
  eventStatus, 
  currentRoute, 
  onNavigate,
  isDark,
  onToggleTheme,
  onLogoutPlayer
}) {
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleMute = () => {
    sounds.init();
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
  };

  return (
    <header className="border-b border-slate-200 dark:border-temporal-border bg-white/90 dark:bg-temporal-bg/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo / Brand */}
        <div 
          onClick={() => onNavigate("home")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5 text-black animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-cyan-400 dark:via-purple-300 dark:to-cyan-200 font-mono text-lg">
                TIME LOOP
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono hidden sm:block">
              4 Levels • 6 Questions / Level • 15 Min / Level
            </p>
          </div>
        </div>

        {/* Center status / Event mode */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-temporal-card border border-slate-200 dark:border-temporal-border text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
          <span className="text-slate-500 dark:text-gray-400">STATE:</span>
          <span className="text-cyan-600 dark:text-cyan-300 font-bold tracking-wider">{eventStatus || "LOBBY"}</span>
          <span className="text-slate-400 dark:text-gray-600">|</span>
          <span className="text-slate-700 dark:text-gray-300">{currentTime}</span>
        </div>

        {/* Right Action Icons & Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Route Switchers - Hidden when participant is actively in the game */}
          {(!player || player.status === "WAITING" || player.status === "ESCAPED") && (
            <div className="flex items-center bg-slate-100 dark:bg-temporal-card p-1 rounded-lg border border-slate-200 dark:border-temporal-border text-xs">
              <button
                onClick={() => onNavigate("home")}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  currentRoute === "home" || currentRoute === "game"
                    ? "bg-cyan-500 text-black font-semibold"
                    : "text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                }`}
                title="Player View"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Player</span>
              </button>
              <button
                onClick={() => onNavigate("host")}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  currentRoute === "host"
                    ? "bg-purple-600 text-white font-semibold"
                    : "text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                }`}
                title="Host Dashboard (PIN: 107)"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Host</span>
                <Lock className="w-2.5 h-2.5 opacity-70" />
              </button>
              <button
                onClick={() => onNavigate("projector")}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  currentRoute === "projector"
                    ? "bg-amber-500 text-black font-semibold"
                    : "text-slate-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                }`}
                title="Auditorium Big Screen Display"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stage</span>
              </button>
            </div>
          )}

          {/* Theme Toggle (Sun / Moon) */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-temporal-border bg-slate-100 dark:bg-temporal-card text-slate-700 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-temporal-cardLight transition-all"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-800" />}
          </button>

          {/* Player Mini Badge if logged in */}
          {player && (
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-temporal-border">
              <span className="text-lg">{player.avatar || "⚡"}</span>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-gray-200 leading-tight">{player.name}</div>
                <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">{player.usn}</div>
              </div>
              {onLogoutPlayer && (!player.status || player.status === "WAITING" || player.status === "ESCAPED" || player.status === "ELIMINATED") && (
                <button
                  onClick={onLogoutPlayer}
                  className="p-1.5 ml-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Switch / Change Participant"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-lg border transition-all ${
              muted
                ? "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                : "bg-slate-100 dark:bg-temporal-card border-slate-200 dark:border-temporal-border text-cyan-600 dark:text-cyan-400 hover:bg-slate-200 dark:hover:bg-temporal-cardLight"
            }`}
            title={muted ? "Unmute Procedural Audio" : "Mute Audio"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
