import React, { useState, useEffect, useRef } from "react";
import CircularTimer from "../components/CircularTimer";
import GlowingTokens from "../components/GlowingTokens";
import QuestionCard from "../components/QuestionCard";
import TimelineSaveAnimation from "../components/TimelineSaveAnimation";
import AntiCheatShield from "../components/AntiCheatShield";
import { sounds } from "../audio/soundEngine";
import { Sparkles, AlertTriangle, Trophy, Award } from "lucide-react";

export default function GamePlayView({
  team,
  currentQuestion,
  onSubmitAnswer,
  onTimeout,
  isSubmitting = false,
  isPaused = false,
  proctorEnabled = true,
  onProctorEliminated
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    return currentQuestion?.remaining_seconds !== undefined
      ? currentQuestion.remaining_seconds
      : 15 * 60;
  });
  const [maxSeconds, setMaxSeconds] = useState(15 * 60);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState("");
  const [penaltyNotice, setPenaltyNotice] = useState(false);
  const [localResults, setLocalResults] = useState({});

  const activeLevel = currentQuestion?.level || team?.current_level || 1;
  const currentAttempt = currentQuestion?.attempt_number || 1;
  const timerRef = useRef(null);
  const currentLevelRef = useRef(activeLevel);
  const currentAttemptRef = useRef(currentAttempt);
  const initializedRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Initialize once on mount or when level / set changes
  useEffect(() => {
    if (activeLevel !== currentLevelRef.current || currentAttempt !== currentAttemptRef.current) {
      currentLevelRef.current = activeLevel;
      currentAttemptRef.current = currentAttempt;
      setLocalResults({});
      // Level or Set advanced: give fresh countdown
      setSecondsRemaining(currentQuestion?.remaining_seconds ?? (15 * 60));
    } else if (!initializedRef.current && currentQuestion?.remaining_seconds !== undefined) {
      initializedRef.current = true;
      setSecondsRemaining(currentQuestion.remaining_seconds);
    }
  }, [activeLevel, currentAttempt, currentQuestion?.remaining_seconds]);

  // CONTINUOUS TIMER COUNTDOWN: High precision delta countdown that never stalls, drifts, or restarts
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isPaused) return;

    lastTickRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setSecondsRemaining((prev) => {
        const next = Math.max(0, prev - deltaSec);
        if (next >= 1 && next <= 10 && Math.floor(prev) !== Math.floor(next)) {
          sounds.playTick(Math.round(next), 10);
        }
        if (next <= 0) {
          clearInterval(timerRef.current);
          sounds.playGlitchBuzz();
          if (onTimeoutRef.current) onTimeoutRef.current();
          return 0;
        }
        return next;
      });
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const handleAnswerWrapper = async (answer) => {
    try {
      const qNum = currentQuestion?.question_number || 1;
      const res = await onSubmitAnswer(answer);
      if (res?.correct) {
        setLocalResults((prev) => ({ ...prev, [qNum]: "correct" }));
        sounds.playLevelCleared();
        setSaveSuccessMsg(res.message || "You saved the timeline by solving this question!");
        setShowSaveBanner(true);

        if (res?.status === "LEVEL_CLEARED") {
          // Fresh 15-min countdown for the next level
          setSecondsRemaining(15 * 60);
          setLocalResults({});
        } else if (res?.status === "NEXT_SET") {
          // Set finished with remaining time: continue countdown into next set!
          setLocalResults({});
          if (res?.next_question?.remaining_seconds !== undefined) {
            setSecondsRemaining(res.next_question.remaining_seconds);
          }
          setFeedbackToast(res?.message || "Set finished! Time continues. Loading next set...");
          setTimeout(() => setFeedbackToast(""), 4000);
        }
      } else {
        // INCORRECT ANSWER: Deduct 2 minutes 30 seconds (150s) penalty immediately!
        setLocalResults((prev) => ({ ...prev, [qNum]: "wrong" }));
        sounds.playGlitchBuzz();

        if (res?.status === "TIMEOUT") {
          // Timer reached 0 (due to 6 wrong questions = 15m penalty, or elapsed time)! 1 token lost!
          setLocalResults({});
          setSecondsRemaining(15 * 60);
          setFeedbackToast(res?.message || "Time reached 0! 1 token lost. Starting fresh 15-minute chance...");
          setTimeout(() => setFeedbackToast(""), 4500);
          return;
        }

        if (res?.status === "NEXT_SET") {
          // Set finished with remaining time: continue countdown into next set!
          setLocalResults({});
          if (res?.next_question?.remaining_seconds !== undefined) {
            setSecondsRemaining(res.next_question.remaining_seconds);
          }
          setPenaltyNotice(true);
          setTimeout(() => setPenaltyNotice(false), 2500);
          setFeedbackToast(res?.message || "Set finished! Time continues. Loading next set...");
          setTimeout(() => setFeedbackToast(""), 4000);
          return;
        }

        if (res?.status === "SET_FAILED") {
          setLocalResults({});
          setSecondsRemaining(15 * 60);
          setFeedbackToast(res?.message || "Set failed! 1 token deducted. Loading next set...");
          setTimeout(() => setFeedbackToast(""), 4000);
          return;
        }

        if (res?.next_question?.remaining_seconds !== undefined) {
          setSecondsRemaining(res.next_question.remaining_seconds);
        } else {
          setSecondsRemaining((prev) => Math.max(0, prev - 150));
        }
        setPenaltyNotice(true);
        setTimeout(() => setPenaltyNotice(false), 2500);
        setFeedbackToast(res?.message || "Incorrect answer: -2 min 30 sec penalty deducted. Advancing to next question...");
        setTimeout(() => setFeedbackToast(""), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const mergedQuestionResults = [1, 2, 3, 4, 5, 6].map((qNum, i) => {
    if (localResults[qNum]) return localResults[qNum];
    if (currentQuestion?.question_results && currentQuestion.question_results[i]) {
      return currentQuestion.question_results[i];
    }
    return null;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 relative">
      {/* Anti-cheat background guard */}
      <AntiCheatShield
        player={team}
        isActive={true}
        proctorEnabled={proctorEnabled}
        onEliminated={onProctorEliminated}
      />

      {/* Timeline Saved Prompt Animation */}
      <TimelineSaveAnimation
        show={showSaveBanner}
        message={saveSuccessMsg}
        onComplete={() => setShowSaveBanner(false)}
      />

      {/* Replacement Notice Toast */}
      {feedbackToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-purple-600 text-white font-mono text-xs font-bold uppercase shadow-2xl flex items-center gap-2 animate-bounce border border-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Header: Level Progress & Team Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-5 pb-4 border-b border-slate-200 dark:border-temporal-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950/90 border border-cyan-400 dark:border-cyan-500 flex items-center justify-center font-mono font-black text-xl text-cyan-700 dark:text-cyan-300 shadow-lg shadow-cyan-500/20 shrink-0">
            L{activeLevel}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono">
                LEVEL {activeLevel} OF 4
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                SET {currentQuestion?.attempt_number || 1} OF 3
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700">
                SOLVED: {currentQuestion?.level_solved_count ?? 0}/6
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-0.5">
              Question {currentQuestion?.question_number || 1} of 6 • Team: <strong className="text-cyan-400">{team?.team_name}</strong>
            </p>
          </div>
        </div>

        {/* 4-Level Progress Badges */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {[1, 2, 3, 4].map((lvl) => {
            const isCompleted = lvl < activeLevel;
            const isCurrent = lvl === activeLevel;

            return (
              <div
                key={lvl}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-mono transition-all ${
                  isCompleted
                    ? "bg-green-100 dark:bg-green-950/60 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300 font-bold"
                    : isCurrent
                    ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/30 font-bold scale-105"
                    : "bg-slate-100 dark:bg-temporal-card/40 border-slate-200 dark:border-gray-800 text-slate-400 dark:text-gray-500 opacity-60"
                }`}
              >
                <span>{isCompleted ? `✓ L${lvl}` : `LVL ${lvl}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left HUD (Timer + Tokens + Stats), Right Question */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Side: Circular Timer & Glowing Tokens */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center gap-6 border border-cyan-500/30">
          <div className="relative flex flex-col items-center">
            {penaltyNotice && (
              <div className="absolute -top-3 z-30 px-3.5 py-1 rounded-full bg-red-600 border border-red-400 text-white font-mono text-xs font-black uppercase tracking-wider animate-bounce shadow-xl shadow-red-600/60 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-300" />
                <span>-2m 30s PENALTY</span>
              </div>
            )}
            <CircularTimer
              secondsRemaining={secondsRemaining}
              maxSeconds={maxSeconds}
              attemptNumber={currentQuestion?.question_number || 1}
              level={activeLevel}
              hasPenalty={penaltyNotice}
              questionResults={mergedQuestionResults}
              setNumber={currentQuestion?.attempt_number || 1}
              levelSolvedCount={currentQuestion?.level_solved_count ?? 0}
              levelTarget={currentQuestion?.level_target ?? 6}
            />
          </div>

          <div className="w-full pt-4 border-t border-slate-200 dark:border-temporal-border flex justify-center">
            <GlowingTokens
              tokensRemaining={team?.tokens_remaining !== undefined ? team.tokens_remaining : 3}
              maxTokens={3}
            />
          </div>

          <div className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-temporal-border text-center text-xs font-mono text-slate-600 dark:text-gray-400">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-1">SCORE TELEMETRY</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {team?.total_score || 0} <span className="text-xs text-purple-400 font-normal">PTS</span>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Question Card */}
        <div className="lg:col-span-8">
          <QuestionCard
            question={currentQuestion}
            onSubmitAnswer={handleAnswerWrapper}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
