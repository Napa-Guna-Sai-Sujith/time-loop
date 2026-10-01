import React, { useEffect, useState, useRef } from "react";
import { socket } from "../utils/socket";
import { sounds } from "../audio/soundEngine";
import { ShieldAlert, Maximize2, AlertTriangle, Lock } from "lucide-react";

export default function AntiCheatShield({ player, isActive = false }) {
  const [warningModal, setWarningModal] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastViolationTime = useRef(0);

  // Helper to emit violation with debounce
  const reportViolation = (type, details = "") => {
    if (!player || !isActive) return;
    const now = Date.now();
    // Debounce duplicate events within 1.2s
    if (now - lastViolationTime.current < 1200) return;
    lastViolationTime.current = now;

    sounds.playGlitchBuzz();
    socket.emit("anti_cheat_violation", {
      usn: player.usn,
      violationType: type,
      details
    });
  };

  // Fullscreen toggle request
  const requestFullscreen = () => {
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    }
  };

  useEffect(() => {
    if (!isActive || !player) return;

    // Auto-request fullscreen when gameplay is active
    requestFullscreen();

    // 1. Visibility change / Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation("TAB_SWITCH", "Participant attempted to switch browser tabs");
      }
    };

    // 2. Window blur (clicking outside or Alt-Tabbing)
    const handleWindowBlur = () => {
      reportViolation("WINDOW_BLUR", "Focus lost / Window switch detected");
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
      if (!isFull && isActive) {
        reportViolation("EXIT_FULLSCREEN", "Exited fullscreen mode");
      }
    };

    // 5. Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      reportViolation("RIGHT_CLICK_ATTEMPT", "Context menu / Inspect blocked");
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
        reportViolation("TAB_SWITCH_SHORTCUT", `Blocked tab switch key shortcut: ${e.key}`);
      }

      // Block Devtools and Inspect shortcuts
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U")) ||
        (e.ctrlKey && (e.key === "c" || e.key === "v"))
      ) {
        e.preventDefault();
        reportViolation("DEVTOOLS_OR_SHORTCUT", `Prohibited key combo blocked: ${e.key}`);
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

    // Socket listener for strike warnings
    const handleStrikeWarning = (data) => {
      setWarningModal(data);
      sounds.playGlitchBuzz();
    };

    socket.on("strike_warning", handleStrikeWarning);

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
      socket.off("strike_warning", handleStrikeWarning);
    };
  }, [isActive, player]);

  if (!warningModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="max-w-md w-full glass-panel-danger rounded-3xl p-6 sm:p-8 text-center relative border-2 border-red-500 shadow-2xl shadow-red-500/40">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <ShieldAlert className="w-9 h-9 text-red-500" />
        </div>

        <h2 className="text-2xl font-mono font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
          {warningModal.disqualified ? "LOOP TERMINATED" : "TAB SWITCH DETECTED"}
        </h2>

        <p className="text-sm text-slate-700 dark:text-gray-300 mb-4 leading-relaxed">
          {warningModal.disqualified ? (
            <span className="text-red-600 dark:text-red-300 font-semibold">
              You attempted to switch tabs / escape the loop. You have vanished from the event.
            </span>
          ) : (
            <span>
              Prohibited browser action: <strong>{warningModal.violationType}</strong>. Switching between tabs or leaving the tournament screen is strictly forbidden.
            </span>
          )}
        </p>

        <div className="my-4 p-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-red-200 dark:border-red-900/60 flex items-center justify-around font-mono text-sm">
          <div className="text-slate-500 dark:text-gray-400">STRIKES RECORDED:</div>
          <div className="text-red-600 dark:text-red-400 font-black text-lg">
            {warningModal.strikes} / {warningModal.maxStrikes}
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
            I UNDERSTAND & RETURN TO LOOP
          </button>
        ) : (
          <div className="text-xs font-mono text-red-500 dark:text-red-400 font-bold">
            SESSION PERMANENTLY TERMINATED BY ANTI-CHEAT
          </div>
        )}
      </div>
    </div>
  );
}
