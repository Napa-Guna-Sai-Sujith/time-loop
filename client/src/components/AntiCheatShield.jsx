import React, { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import { wsClient } from "../utils/ws";
import { sounds } from "../audio/soundEngine";
import { ShieldAlert, AlertTriangle, Lock, Eye, AlertOctagon } from "lucide-react";

export default function AntiCheatShield({ 
  player, 
  isActive = false, 
  proctorEnabled = true,
  onEliminated 
}) {
  const [warningModal, setWarningModal] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastViolationTime = useRef(0);

  // Helper to emit violation with debounce
  const reportViolation = async (type, details = "") => {
    if (!player || !isActive || !proctorEnabled) return;
    const now = Date.now();
    // Debounce duplicate events within 1.5s
    if (now - lastViolationTime.current < 1500) return;
    lastViolationTime.current = now;

    sounds.playGlitchBuzz();
    try {
      const res = await api.reportProctorViolation(type, details);
      if (res && res.strikes !== undefined) {
        setWarningModal({
          strikes: res.strikes,
          chancesRemaining: res.chances_remaining,
          disqualified: res.is_eliminated,
          violationType: type,
          details
        });
        if (res.is_eliminated && onEliminated) {
          onEliminated();
        }
      }
    } catch (err) {
      console.error("Proctor report error:", err);
    }
  };

  // Fullscreen toggle request
  const requestFullscreen = () => {
    if (!proctorEnabled) return;
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }
  };

  // If proctor restored by organizer in real-time, close warning
  useEffect(() => {
    const unsub = wsClient.on("proctor_restored", () => {
      setWarningModal(null);
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    // If proctor is off globally or player is inactive, do nothing
    if (!isActive || !player || !proctorEnabled) return;

    // Auto-request fullscreen when gameplay is active
    requestFullscreen();

    // 1. Visibility change / Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation("TAB_SWITCH", "Participant switched browser tabs or minimized window");
      }
    };

    // 2. Window blur (clicking outside or Alt-Tabbing)
    const handleWindowBlur = () => {
      reportViolation("WINDOW_BLUR", "Browser window lost focus / Alt-Tab detected");
    };

    // 3. Mouse leaving top area (user hovering over browser tab bar)
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) {
        reportViolation("TAB_HOVER", "Cursor moved towards browser tabs / window controls");
      }
    };

    // 4. Fullscreen change listener
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement || !!document.webkitFullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && isActive && proctorEnabled) {
        reportViolation("EXIT_FULLSCREEN", "Exited full-screen exam mode");
      }
    };

    // 5. Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      reportViolation("RIGHT_CLICK_ATTEMPT", "Context menu / Inspect shortcut blocked");
    };

    // 6. Block clipboard copying / cutting / pasting
    const handleCopyPaste = (e) => {
      e.preventDefault();
      reportViolation("CLIPBOARD_ATTEMPT", "Copy, cut, or paste attempt blocked");
    };

    // 7. Block Tab-Switching shortcuts & devtools
    const handleKeyDown = (e) => {
      // Block Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+1..9 (browser tab switches)
      if (
        (e.ctrlKey && e.key === "Tab") ||
        (e.ctrlKey && e.shiftKey && e.key === "Tab") ||
        (e.ctrlKey && !isNaN(parseInt(e.key, 10)) && parseInt(e.key, 10) >= 1 && parseInt(e.key, 10) <= 9) ||
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey && (e.key === "t" || e.key === "T")) ||
        (e.ctrlKey && (e.key === "n" || e.key === "N")) ||
        (e.ctrlKey && (e.key === "w" || e.key === "W"))
      ) {
        e.preventDefault();
        reportViolation("TAB_SWITCH_SHORTCUT", `Blocked tab switch key combo: ${e.key}`);
      }

      // Block Devtools and Inspect shortcuts
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U")) ||
        (e.ctrlKey && (e.key === "c" || e.key === "v"))
      ) {
        e.preventDefault();
        reportViolation("DEVTOOLS_OR_SHORTCUT", `Prohibited shortcut blocked: ${e.key}`);
      }
    };

    // 8. Prevent accidental page reload or back button navigation
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Tournament in progress! Leaving will result in disqualification.";
      return e.returnValue;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActive, player, proctorEnabled]);

  // If proctor is off globally, render nothing
  if (!proctorEnabled || !warningModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="max-w-md w-full glass-panel-danger rounded-3xl p-6 sm:p-8 text-center relative border-2 border-red-500 shadow-2xl shadow-red-500/40">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <ShieldAlert className="w-9 h-9 text-red-500" />
        </div>

        <h2 className="text-2xl font-mono font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
          {warningModal.disqualified ? "DISQUALIFIED BY PROCTOR" : "PROCTOR STRIKE DETECTED"}
        </h2>

        <p className="text-sm text-slate-700 dark:text-gray-300 mb-4 leading-relaxed font-mono">
          {warningModal.disqualified ? (
            <span className="text-red-600 dark:text-red-300 font-bold">
              You have exhausted all 3 proctor chances. Your team is eliminated from the tournament. Please contact the administrator.
            </span>
          ) : (
            <span>
              Prohibited action: <strong className="text-red-400">{warningModal.violationType}</strong>. 
              Switching tabs, losing focus, or exiting full-screen is prohibited.
            </span>
          )}
        </p>

        {/* 3 Chances Indicator */}
        <div className="my-5 p-4 rounded-2xl bg-slate-100 dark:bg-black/60 border border-red-300 dark:border-red-900/60 flex flex-col items-center gap-2 font-mono text-sm">
          <div className="flex items-center justify-between w-full text-xs">
            <span className="text-slate-500 dark:text-gray-400">PROCTOR CHANCES:</span>
            <span className="font-bold text-red-400">
              {warningModal.chancesRemaining} / 3 REMAINING
            </span>
          </div>

          {/* 3 Visual Chance Dots */}
          <div className="flex items-center gap-3 w-full justify-center pt-2">
            {[1, 2, 3].map((num) => {
              const isUsed = num <= warningModal.strikes;
              return (
                <div
                  key={num}
                  className={`flex-1 py-2 rounded-xl text-center font-mono font-black text-xs border transition-all ${
                    isUsed
                      ? "bg-red-600/30 border-red-500 text-red-400"
                      : "bg-green-600/30 border-green-500 text-green-300"
                  }`}
                >
                  {isUsed ? `STRIKE ${num} ✗` : `CHANCE ${num} ✓`}
                </div>
              );
            })}
          </div>
        </div>

        {!warningModal.disqualified ? (
          <button
            onClick={() => {
              setWarningModal(null);
              requestFullscreen();
            }}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold font-mono text-sm uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all"
          >
            I UNDERSTAND & RESUME FULLSCREEN
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-700 text-xs font-mono text-red-300 font-bold">
            SESSION TERMINATED BY PROCTOR • ADMIN RESTORATION REQUIRED
          </div>
        )}
      </div>
    </div>
  );
}
