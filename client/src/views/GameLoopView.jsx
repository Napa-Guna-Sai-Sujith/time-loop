import React, { useState, useEffect, useRef } from "react";
import CircularTimer from "../components/CircularTimer";
import QuestionRenderer from "../components/QuestionRenderer";
import AntiCheatShield from "../components/AntiCheatShield";
import { sounds } from "../audio/soundEngine";
import confetti from "canvas-confetti";
import { Sparkles, Clock } from "lucide-react";

export default function GameLoopView({ 
  player, 
  currentQuestion, 
  onSubmitAnswer, 
  isSubmitting 
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60); // 15 Minutes
  const [maxSeconds, setMaxSeconds] = useState(15 * 60);

  const timerRef = useRef(null);

  // Initialize and tick the 15-minute Level Timer
  useEffect(() => {
    if (!currentQuestion) return;

    const remaining = currentQuestion.remainingLevelSeconds !== undefined 
      ? currentQuestion.remainingLevelSeconds 
      : 15 * 60;

    setSecondsRemaining(remaining);
    setMaxSeconds(15 * 60);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        if (next >= 0 && next <= 10) {
          // Play urgent tick during last 10 seconds of 15 min window
          sounds.playTick(next, 10);
        }
        if (next <= 0) {
          clearInterval(timerRef.current);
          sounds.playGlitchBuzz();
          // Timeout on 15m level window
          onSubmitAnswer("__TIMEOUT__");
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [player?.level, currentQuestion?.id]);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 relative">
      {/* Anti-Cheat Background Active Guard */}
      <AntiCheatShield player={player} isActive={true} />

      {/* Top Status & 4-Level Progress Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5 pb-4 border-b border-slate-200 dark:border-temporal-border">
        {/* Current Level Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-400 dark:border-cyan-500 flex items-center justify-center font-mono font-black text-xl sm:text-2xl text-cyan-700 dark:text-cyan-300 shadow-lg shadow-cyan-500/20 shrink-0">
            L{player.level}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono">
                LEVEL {player.level} OF 4
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                15 MIN LIMIT
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-0.5">
              Question {currentQuestion?.attemptNumber || 1} of 6 • Complete all 6 questions to advance
            </p>
          </div>
        </div>

        {/* 4-Level Progress Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {[1, 2, 3, 4].map((lvl) => {
            const isCompleted = lvl < player.level;
            const isCurrent = lvl === player.level;

            return (
              <div
                key={lvl}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 sm:px-3.5 py-1.5 rounded-xl border text-[11px] sm:text-xs font-mono transition-all ${
                  isCompleted
                    ? "bg-green-100 dark:bg-green-950/60 border-green-400 dark:border-green-600/80 text-green-800 dark:text-green-300 font-bold"
                    : isCurrent
                    ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/30 font-bold scale-105"
                    : "bg-slate-100 dark:bg-temporal-card/40 border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-500 opacity-60"
                }`}
              >
                <span>{isCompleted ? "✓ L" + lvl : `LVL ${lvl}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Gameplay Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Side: Circular 15-min Timer & 6 Question Tracker */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center">
          <CircularTimer
            secondsRemaining={secondsRemaining}
            maxSeconds={maxSeconds}
            attemptNumber={currentQuestion?.attemptNumber || 1}
            level={player.level}
          />

          <div className="mt-4 sm:mt-6 w-full p-2.5 sm:p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-temporal-border text-center">
            <span className="text-[11px] font-mono text-slate-600 dark:text-gray-400">
              ⚡ Complete all 6 questions in each level before the 15-minute timer expires.
            </span>
          </div>
        </div>

        {/* Right Side: Interactive Question Renderer */}
        <div className="lg:col-span-8">
          <QuestionRenderer
            question={currentQuestion}
            onSubmitAnswer={onSubmitAnswer}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
