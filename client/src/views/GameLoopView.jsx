import React, { useState, useEffect, useRef } from "react";
import CircularTimer from "../components/CircularTimer";
import QuestionRenderer from "../components/QuestionRenderer";
import AntiCheatShield from "../components/AntiCheatShield";
import { sounds } from "../audio/soundEngine";
import confetti from "canvas-confetti";
import { Sparkles, Clock, AlertTriangle } from "lucide-react";

export default function GameLoopView({ 
  player, 
  currentQuestion, 
  onSubmitAnswer, 
  isSubmitting 
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60); // 15 Minutes
  const [maxSeconds, setMaxSeconds] = useState(15 * 60);
  const [levelUpModal, setLevelUpModal] = useState(false);
  const [replacedToast, setReplacedToast] = useState(false);

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

  // Show replacement toast if attempt changed (question replaced)
  useEffect(() => {
    if (currentQuestion?.attemptNumber > 1) {
      setReplacedToast(true);
      const t = setTimeout(() => setReplacedToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [currentQuestion?.attemptNumber]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 relative">
      {/* Anti-Cheat Background Active Guard */}
      <AntiCheatShield player={player} isActive={true} />

      {/* Level Cleared Warp Overlay */}
      {levelUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in pointer-events-none">
          <div className="glass-panel-glow rounded-3xl p-8 text-center animate-bounce">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-8 h-8 text-cyan-500 dark:text-cyan-300 animate-spin" />
            </div>
            <h2 className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-300 mb-1">
              LEVEL CLEARED!
            </h2>
            <p className="text-sm font-mono text-slate-700 dark:text-gray-300">
              WARPING TO LEVEL {player.level}...
            </p>
          </div>
        </div>
      )}

      {/* Question Replaced Toast Notification */}
      {replacedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-2xl bg-red-600 text-white font-mono text-xs font-bold uppercase shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4" />
          <span>INCORRECT ANSWER — QUESTION REPLACED WITH Q{currentQuestion?.attemptNumber}/6</span>
        </div>
      )}

      {/* Top Status & 4-Level Progress Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-temporal-border">
        {/* Current Level Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-400 dark:border-cyan-500 flex items-center justify-center font-mono font-black text-2xl text-cyan-700 dark:text-cyan-300 shadow-lg shadow-cyan-500/20">
            L{player.level}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                LEVEL {player.level} OF 4
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                15 MIN LEVEL LIMIT
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">
              Question {currentQuestion?.attemptNumber || 1} of 6 • 1 Correct Answer Escapes Level
            </p>
          </div>
        </div>

        {/* 4-Level Progress Breadcrumb */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((lvl) => {
            const isCompleted = lvl < player.level;
            const isCurrent = lvl === player.level;

            return (
              <div
                key={lvl}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                  isCompleted
                    ? "bg-green-100 dark:bg-green-950/60 border-green-400 dark:border-green-600/80 text-green-800 dark:text-green-300 font-bold"
                    : isCurrent
                    ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/30 font-bold scale-105"
                    : "bg-slate-100 dark:bg-temporal-card/40 border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-500 opacity-60"
                }`}
              >
                <span>{isCompleted ? "✓ CLEARED" : `LEVEL ${lvl}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Gameplay Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Circular 15-min Timer & 6 Question Tracker */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 flex flex-col items-center justify-center">
          <CircularTimer
            secondsRemaining={secondsRemaining}
            maxSeconds={maxSeconds}
            attemptNumber={currentQuestion?.attemptNumber || 1}
            level={player.level}
          />

          <div className="mt-6 w-full p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-temporal-border text-center">
            <span className="text-[11px] font-mono text-slate-600 dark:text-gray-400">
              ⚡ If you answer wrong, the question is immediately replaced with another. 1 correct answer clears the level!
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
