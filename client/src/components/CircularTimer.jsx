import React from "react";
import { Flame, Clock } from "lucide-react";

export default function CircularTimer({ 
  secondsRemaining = 900, 
  maxSeconds = 900, 
  attemptNumber = 1,
  level = 1 
}) {
  const percentage = Math.max(0, Math.min(100, (secondsRemaining / maxSeconds) * 100));
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Format 15-minute countdown as MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Urgency color logic (e.g. last 2 minutes critical, last 5 minutes warning)
  const isCritical = secondsRemaining <= 120; // < 2 mins
  const isWarning = secondsRemaining <= 300 && !isCritical; // < 5 mins
  
  const strokeColor = isCritical 
    ? "#ff2a5f" 
    : isWarning 
    ? "#ffb703" 
    : "#00f0ff";

  const glowShadow = isCritical
    ? "drop-shadow(0 0 16px rgba(255, 42, 95, 0.8))"
    : isWarning
    ? "drop-shadow(0 0 12px rgba(255, 183, 3, 0.6))"
    : "drop-shadow(0 0 10px rgba(0, 240, 255, 0.5))";

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Background Loop Warp Waves */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-300 pointer-events-none ${
          isCritical 
            ? "animate-ping bg-red-600/20 scale-125" 
            : isWarning 
            ? "animate-pulse bg-amber-500/10 scale-110" 
            : ""
        }`}
      />

      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* SVG Circular Dial */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="text-slate-200 dark:text-gray-800/80 stroke-current"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={strokeColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: glowShadow,
              transition: "stroke-dashoffset 0.5s linear, stroke 0.3s ease"
            }}
          />
        </svg>

        {/* Center Digital Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span 
            className={`font-mono font-black text-3xl sm:text-4xl tracking-tight transition-all ${
              isCritical
                ? "text-red-500 animate-bounce"
                : isWarning
                ? "text-amber-500 dark:text-amber-400"
                : "text-cyan-600 dark:text-cyan-300"
            }`}
          >
            {formattedTime}
          </span>

          <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-400 font-mono mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-500" />
            <span>15 MIN LEVEL CLOCK</span>
          </span>
        </div>
      </div>

      {/* 6 Questions Progression Indicator for Current Level */}
      <div className="mt-4 flex flex-col items-center gap-1.5 w-full">
        <div className="text-[10px] font-mono text-slate-500 dark:text-gray-400 uppercase tracking-wider">
          Level {level} Questions (6 Total)
        </div>
        <div className="flex items-center justify-center gap-1.5 w-full">
          {[1, 2, 3, 4, 5, 6].map((qNum) => {
            const isCurrent = qNum === attemptNumber;
            const isFailed = qNum < attemptNumber;

            return (
              <div 
                key={qNum}
                className={`flex-1 flex flex-col items-center py-1.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 text-cyan-800 dark:text-cyan-300 font-bold scale-105 ring-2 ring-cyan-500/30"
                    : isFailed
                    ? "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-900/60 text-red-600 dark:text-red-400 line-through opacity-70"
                    : "bg-slate-100 dark:bg-black/40 border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-600"
                }`}
              >
                <span className="text-[10px] font-mono">Q{qNum}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Replacement Notice on failure */}
      {attemptNumber > 1 && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 animate-pulse">
          <Flame className="w-3.5 h-3.5 text-red-500" />
          <span>WRONG ANSWER: REPLACED WITH Q{attemptNumber}/6</span>
        </div>
      )}
    </div>
  );
}
