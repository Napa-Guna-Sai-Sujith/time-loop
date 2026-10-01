import React, { useState, useEffect } from "react";
import { Send, Code2, HelpCircle, CheckCircle2, ChevronRight } from "lucide-react";

export default function QuestionRenderer({ 
  question, 
  onSubmitAnswer, 
  isSubmitting = false 
}) {
  const [selectedOption, setSelectedOption] = useState("");
  const [numericalInput, setNumericalInput] = useState("");

  useEffect(() => {
    setSelectedOption("");
    setNumericalInput("");
  }, [question?.id, question?.attemptNumber]);

  if (!question) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-500 dark:text-gray-400">
        <div className="w-12 h-12 rounded-full border border-dashed border-cyan-500/50 flex items-center justify-center mx-auto mb-3 animate-spin">
          <HelpCircle className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
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

  const handleNumericalSubmit = (e) => {
    e.preventDefault();
    if (!numericalInput.trim() || isSubmitting) return;
    onSubmitAnswer(numericalInput.trim());
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (question.type === "mcq" && question.options) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= question.options.length) {
          handleOptionClick(question.options[num - 1]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, isSubmitting]);

  const renderFormattedQuestion = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const cleanCode = part.replace(/^```[a-z]*\n?|```$/g, "");
        return (
          <div key={idx} className="my-3 rounded-lg bg-slate-900 dark:bg-black/60 border border-slate-700 dark:border-cyan-900/40 p-3.5 font-mono text-xs text-cyan-300 overflow-x-auto shadow-inner">
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-gray-800 text-[10px] text-gray-400 uppercase tracking-widest">
              <Code2 className="w-3 h-3 text-cyan-400" /> Code Snippet
            </div>
            <pre className="leading-relaxed">
              <code>{cleanCode}</code>
            </pre>
          </div>
        );
      }
      return (
        <span key={idx} className="whitespace-pre-line leading-relaxed">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 relative overflow-hidden">
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent pointer-events-none" />

      {/* Header tags */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-temporal-border">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-700/60 text-cyan-800 dark:text-cyan-300 font-mono text-xs font-semibold uppercase tracking-wider">
            {question.category || "General"}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-900 border border-slate-200 dark:border-gray-800">
            {question.type === "mcq" ? "Multiple Choice" : "Numerical Entry"}
          </span>
        </div>
        <div className="text-xs font-mono text-slate-500 dark:text-gray-400">
          Q-ID: <span className="font-bold text-slate-800 dark:text-gray-200">{question.id}</span>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-gray-100 mb-6 select-none">
        {renderFormattedQuestion(question.question)}
      </div>

      {/* MCQ Options Mode */}
      {question.type === "mcq" && question.options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isSelected = selectedOption === opt;

            return (
              <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                disabled={isSubmitting}
                className={`group text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 relative overflow-hidden select-none ${
                  isSelected
                    ? "bg-cyan-100 dark:bg-cyan-950/90 border-cyan-500 text-slate-900 dark:text-white scale-[1.01] ring-2 ring-cyan-500/30"
                    : "bg-slate-50/80 dark:bg-temporal-card/60 border-slate-200 dark:border-temporal-border text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-temporal-cardLight hover:border-cyan-500/40 hover:text-black dark:hover:text-white"
                }`}
              >
                <div 
                  className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                    isSelected 
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/50" 
                      : "bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-950 group-hover:text-cyan-800 dark:group-hover:text-cyan-300 border border-slate-300 dark:border-gray-700"
                  }`}
                >
                  {letter}
                </div>
                <div className="text-sm font-medium pt-0.5 break-words">
                  {opt}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Numerical Entry Mode */}
      {question.type === "numerical" && (
        <form onSubmit={handleNumericalSubmit} className="mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                placeholder="Enter numerical answer..."
                value={numericalInput}
                onChange={(e) => setNumericalInput(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-4 py-3.5 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-cyan-800/60 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-cyan-200 font-mono text-lg outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600"
              />
              <span className="absolute right-3 top-3.5 text-[10px] font-mono text-slate-400 dark:text-gray-500 hidden sm:block">
                PRESS ENTER ↵
              </span>
            </div>
            <button
              type="submit"
              disabled={!numericalInput.trim() || isSubmitting}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white dark:text-black font-bold font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
            >
              <span>SUBMIT</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Helper footer */}
      <div className="mt-6 pt-3 border-t border-slate-200 dark:border-temporal-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-gray-500 text-center sm:text-left">
        <span>⚡ Solve/attempt all 6 questions in each level before the timer ends</span>
        <span className="hidden sm:inline">Keyboard: 1-4 for options</span>
      </div>
    </div>
  );
}
