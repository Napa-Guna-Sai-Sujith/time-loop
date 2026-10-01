import React, { useState, useEffect } from "react";
import { sounds } from "../audio/soundEngine";
import confetti from "canvas-confetti";
import CertificateModal from "../components/CertificateModal";
import { KeyRound, Trophy, Send, AlertTriangle, Clock, Award } from "lucide-react";

export default function FinalRoundView({ 
  player, 
  finalRoundData, 
  onSubmitStageAnswer, 
  isSubmitting 
}) {
  const [currentStageNum, setCurrentStageNum] = useState(1);
  const [stageAnswer, setStageAnswer] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);
  
  // 10-minute master clock countdown
  const [secondsLeft, setSecondsLeft] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (finalRoundData?.stagesProgress && player?.usn) {
      const serverStage = finalRoundData.stagesProgress[player.usn] || 1;
      setCurrentStageNum(serverStage);
    }
  }, [finalRoundData, player?.usn]);

  const stagesList = [
    {
      num: 1,
      title: "STAGE 1: QUANTUM SEQUENCE (Pattern)",
      prompt: "Find the missing sequence key that stabilizes the loop anomaly:",
      puzzleText: "16, 22, 34, 58, 106, [ ? ]",
      hint: "Look at the differences between consecutive temporal states (+6, +12, +24, +48...)"
    },
    {
      num: 2,
      title: "STAGE 2: LOGIC MATRIX (Deduction)",
      prompt: "Decode the sector index from the logic matrix:",
      puzzleText: "If ALPHA = 14, BETA = 8, GAMMA = 12, what is the value of OMEGA?",
      hint: "Evaluate word length multiplied by 2"
    },
    {
      num: 3,
      title: "STAGE 3: ALGORITHMIC CLUE (Math)",
      prompt: "Calculate the checksum of the recursive core:",
      puzzleText: "A server has 256 GB of memory. Every cycle it splits into half. What is the sum of memory sizes at depth 1, 2, and 3? (128 + 64 + 32)",
      hint: "Sum the three powers of 2 directly"
    },
    {
      num: 4,
      title: "STAGE 4: CIPHER OVERRIDE (Hidden Message)",
      prompt: "Shift the cryptic intercept backwards by 3 positions (Caesar -3):",
      puzzleText: "Intercepted Key: 'WLPH'",
      hint: "Shift each letter back: W-3, L-3, P-3, H-3"
    },
    {
      num: 5,
      title: "STAGE 5: MASTER TEMPORAL OVERRIDE (Final Code)",
      prompt: "Combine Stage 1 last digit, Stage 2 last digit, Stage 3 last digit, and Stage 4 letter count:",
      puzzleText: "ENTER THE 4-DIGIT TIMELOOP ESCAPE KEY:",
      hint: "Combine digits: Stage 1 (202->'2'), Stage 2 (10->'0'), Stage 3 (224->'4'), Stage 4 ('TIME' length->'4')"
    }
  ];

  const currentStage = stagesList[currentStageNum - 1] || stagesList[0];
  const isChampion = finalRoundData?.champion?.usn === player?.usn;
  const loopBroken = !!finalRoundData?.champion;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!stageAnswer.trim() || isSubmitting) return;

    setErrorMessage("");
    onSubmitStageAnswer(currentStageNum, stageAnswer.trim(), (res) => {
      if (res?.correct) {
        setStageAnswer("");
        setErrorMessage("");
        sounds.playLevelCleared();
        if (res.loopBroken) {
          sounds.playLoopBrokenFanfare();
          confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.5 }
          });
        }
      } else {
        sounds.playGlitchBuzz();
        setErrorMessage(res?.reason || "Incorrect code. Deduction failed.");
      }
    });
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {showCertificate && (
        <CertificateModal
          player={player}
          rankTitle={isChampion ? "TIME LOOP CHAMPION" : "FINALIST PODIUM"}
          rankPosition={isChampion ? 1 : 2}
          onClose={() => setShowCertificate(false)}
        />
      )}

      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-500/50 text-purple-800 dark:text-purple-300 font-mono text-xs uppercase tracking-widest mb-3">
          <KeyRound className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>GRAND FINALE // MULTI-STAGE PUZZLE</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-white mb-2">
          BREAK THE LOOP
        </h1>

        <p className="text-sm text-slate-600 dark:text-gray-300 font-sans max-w-lg mx-auto">
          Finalists must solve 5 sequential quantum riddles. The first participant to enter the Master Escape Code shatters the loop and becomes the <strong className="text-amber-600 dark:text-amber-400">TIME LOOP CHAMPION</strong>.
        </p>
      </div>

      {/* Master 10-Minute Countdown Clock */}
      <div className="glass-panel-glow rounded-2xl p-4 sm:p-6 mb-8 flex items-center justify-between border-purple-300 dark:border-purple-500/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-400 flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-mono text-slate-500 dark:text-gray-400 uppercase">FINAL ROUND CLOCK</div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* 5-Stage Stepper Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5].map((stg) => {
            const isDone = stg < currentStageNum || loopBroken;
            const isNow = stg === currentStageNum && !loopBroken;

            return (
              <div
                key={stg}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold border transition-all ${
                  isDone
                    ? "bg-green-100 dark:bg-green-950 border-green-500 text-green-800 dark:text-green-300"
                    : isNow
                    ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 text-cyan-800 dark:text-cyan-300 ring-2 ring-cyan-500/40 scale-110 shadow-lg"
                    : "bg-slate-100 dark:bg-gray-900 border-slate-300 dark:border-gray-800 text-slate-400 dark:text-gray-600"
                }`}
              >
                {isDone ? "✓" : `S${stg}`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loop Broken Victory Banner if Champion won */}
      {loopBroken ? (
        <div className="glass-panel-glow rounded-3xl p-8 text-center border-amber-400 dark:border-amber-500/60 shadow-2xl mb-8">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-500 dark:border-amber-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Trophy className="w-10 h-10 text-amber-500 dark:text-amber-400" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-mono font-black text-amber-600 dark:text-amber-300 mb-2">
            THE LOOP HAS BEEN BROKEN!
          </h2>

          <p className="text-lg text-slate-900 dark:text-white font-mono mb-4">
            🥇 CHAMPION: <strong className="text-cyan-600 dark:text-cyan-400">{finalRoundData.champion?.name}</strong> ({finalRoundData.champion?.usn})
          </p>

          <p className="text-xs font-mono text-slate-500 dark:text-gray-400 mb-6">
            Final code accepted. Temporal continuum stabilized.
          </p>

          <button
            onClick={() => setShowCertificate(true)}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold font-mono text-sm inline-flex items-center gap-2 shadow-xl shadow-amber-500/30 transition-all"
          >
            <Award className="w-5 h-5" />
            <span>CLAIM CHAMPION CERTIFICATE</span>
          </button>
        </div>
      ) : (
        /* Active Puzzle Card */
        <div className="glass-panel rounded-3xl p-6 sm:p-10 relative shadow-2xl">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-temporal-border">
            <span className="font-mono text-xs text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-wider">
              {currentStage.title}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-gray-400">
              STAGE {currentStageNum} OF 5
            </span>
          </div>

          <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-gray-200 mb-4">
            {currentStage.prompt}
          </p>

          <div className="p-6 rounded-2xl bg-slate-900 dark:bg-black/70 border border-slate-700 dark:border-cyan-900/60 font-mono text-xl sm:text-2xl text-cyan-300 text-center my-6 tracking-wider shadow-inner">
            {currentStage.puzzleText}
          </div>

          <div className="text-xs font-mono text-slate-600 dark:text-gray-400 mb-6 bg-purple-50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-200 dark:border-purple-900/40">
            💡 <strong>HINT:</strong> {currentStage.hint}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                autoFocus
                placeholder={`Enter solution for Stage ${currentStageNum}...`}
                value={stageAnswer}
                onChange={(e) => setStageAnswer(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3.5 rounded-xl bg-slate-100 dark:bg-black/80 border border-slate-300 dark:border-cyan-700/60 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-white font-mono text-lg outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 uppercase"
              />
              <button
                type="submit"
                disabled={!stageAnswer.trim() || isSubmitting}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white dark:text-black font-extrabold font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all"
              >
                <span>OVERRIDE</span>
                <Send className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-500 text-red-700 dark:text-red-300 font-mono text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
