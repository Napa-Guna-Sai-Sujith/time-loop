import React, { useEffect, useState } from "react";
import { sounds } from "../audio/soundEngine";
import { Zap, Clock } from "lucide-react";

export default function CountdownModal({ countdown, onComplete }) {
  const [currentCount, setCurrentCount] = useState(countdown || 3);

  useEffect(() => {
    sounds.init();
    sounds.playCountdownBeep(currentCount);

    if (currentCount <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCurrentCount((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentCount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl select-none">
      <div className="text-center relative">
        {/* Pulsing ring background */}
        <div className="absolute inset-0 -m-16 rounded-full border border-cyan-500/20 animate-ping pointer-events-none" />
        <div className="absolute inset-0 -m-8 rounded-full border border-purple-500/30 animate-pulse pointer-events-none" />

        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono text-sm tracking-widest uppercase">
          <Clock className="w-4 h-4 animate-spin-slow" />
          <span>INITIALIZING TIME LOOP</span>
        </div>

        {/* Big Animated Count */}
        <div className="relative my-6">
          <div className="text-8xl sm:text-9xl font-mono font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-white to-purple-400 drop-shadow-[0_0_35px_rgba(0,240,255,0.7)] animate-bounce">
            {currentCount > 0 ? currentCount : "LOOP START"}
          </div>
        </div>

        <p className="text-sm font-mono text-gray-400 max-w-sm mx-auto uppercase tracking-wider">
          Level 1 starting. 15 Minutes on the clock. Solve all 6 questions to clear each level.
        </p>
      </div>
    </div>
  );
}
