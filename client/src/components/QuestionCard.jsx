import React, { useState, useEffect } from "react";
import { Code2, HelpCircle, Check, Copy } from "lucide-react";

export default function QuestionCard({ question, onSubmitAnswer, isSubmitting = false }) {
  const [selectedOption, setSelectedOption] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedOption("");
    setCopied(false);
  }, [question?.id, question?.question_number]);

  // Keyboard shortcut listener (1-4 keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!question || !question.options || isSubmitting) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= question.options.length) {
        handleOptionClick(question.options[num - 1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, isSubmitting]);

  if (!question) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 dark:text-gray-400">
        <div className="w-12 h-12 rounded-full border border-dashed border-cyan-500/50 flex items-center justify-center mx-auto mb-3 animate-spin">
          <HelpCircle className="w-6 h-6 text-cyan-400" />
        </div>
        <p className="font-mono text-sm">SYNCHRONIZING TEMPORAL DATA...</p>
      </div>
    );
  }

  const handleOptionClick = (opt) => {
    if (isSubmitting) return;
    setSelectedOption(opt);
    onSubmitAnswer(opt);
  };

  const handleCopyCode = () => {
    if (question.code_snippet) {
      navigator.clipboard.writeText(question.code_snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const categoryColorMap = {
    "Mathematics": "border-blue-400/80 bg-blue-950/60 text-blue-300",
    "Logical Reasoning": "border-purple-400/80 bg-purple-950/60 text-purple-300",
    "Aptitude": "border-amber-400/80 bg-amber-950/60 text-amber-300",
    "Python Coding": "border-cyan-400/80 bg-cyan-950/60 text-cyan-300",
    "Debugging": "border-red-400/80 bg-red-950/60 text-red-300",
    "DSA Concept MCQs": "border-emerald-400/80 bg-emerald-950/60 text-emerald-300"
  };

  const catStyle = categoryColorMap[question.category] || "border-cyan-400 bg-cyan-950 text-cyan-300";

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-2xl">
      {/* Decorative cyber corner */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-cyan-500/10 via-purple-500/5 to-transparent pointer-events-none" />

      {/* Header Tags */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-temporal-border">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider ${catStyle}`}>
            {question.category}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            {question.difficulty || "Intermediate"}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
            Level {question.level}
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500 dark:text-gray-400">
          ID: <span className="font-bold text-slate-800 dark:text-gray-200">{question.custom_id}</span>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-gray-100 mb-5 whitespace-pre-line leading-relaxed">
        {question.question_text}
      </div>

      {/* Code Snippet Box (if any) */}
      {question.code_snippet && (
        <div className="my-4 rounded-xl bg-slate-900 dark:bg-black/80 border border-slate-700 dark:border-cyan-900/50 p-4 font-mono text-xs sm:text-sm text-cyan-300 overflow-x-auto shadow-inner relative group">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-[10px] text-gray-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Code2 className="w-3.5 h-3.5" /> Python Code Snippet
            </span>
            <button
              onClick={handleCopyCode}
              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <pre className="leading-relaxed">
            <code>{question.code_snippet}</code>
          </pre>
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6">
        {question.options?.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedOption === opt;

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(opt)}
              disabled={isSubmitting}
              className={`group text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3 relative select-none ${
                isSelected
                  ? "bg-cyan-100 dark:bg-cyan-950/90 border-cyan-500 text-slate-900 dark:text-white scale-[1.01] ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20"
                  : "bg-slate-50/80 dark:bg-temporal-card/60 border-slate-200 dark:border-temporal-border text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-temporal-cardLight hover:border-cyan-500/50 hover:text-black dark:hover:text-white"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/50"
                    : "bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 group-hover:bg-cyan-500 group-hover:text-black border border-slate-300 dark:border-gray-700"
                }`}
              >
                {letter}
              </div>
              <div className="text-sm font-medium pt-0.5 break-words flex-1">
                {opt}
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500 opacity-60 hidden sm:block">
                [{idx + 1}]
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Helper */}
      <div className="mt-6 pt-3 border-t border-slate-200 dark:border-temporal-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-gray-500">
        <span>⚡ Wrong answers deduct 2m 30s penalty and advance to next question</span>
        <span className="hidden sm:inline">Press 1-4 on keyboard to select option</span>
      </div>
    </div>
  );
}
