import React, { useState } from "react";
import { Clock, Zap, ArrowRight, ShieldCheck, User, School, Hash, Sparkles } from "lucide-react";
import { sounds } from "../audio/soundEngine";

const AVATARS = ["⚡", "⏳", "🌀", "🔥", "🔮", "🚀", "🪐", "💎", "👾", "🤖"];
const DEPARTMENTS = [
  "Computer Science & Engg",
  "Information Science",
  "Artificial Intelligence & ML",
  "Electronics & Communication",
  "Data Science & Cybersecurity",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical & Electronics",
  "Other"
];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function RegistrationView({ onRegister, isSubmitting }) {
  const [formData, setFormData] = useState({
    name: "",
    usn: "",
    department: DEPARTMENTS[0],
    year: YEARS[0],
    avatar: "⚡"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.usn.trim()) return;
    sounds.init();
    sounds.playLevelCleared();
    onRegister(formData);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Title & Tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-400 font-mono text-xs uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COLLEGE TECHNICAL EVENT</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white mb-2">
            TIME <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-600 dark:from-cyan-400 dark:to-purple-400">LOOP</span>
          </h1>

          <p className="text-sm text-slate-600 dark:text-gray-400 font-mono max-w-md mx-auto">
            4 Levels • 6 Questions per Level • 15 Minutes per Level
            <br />
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Solve and attempt all 6 questions to conquer the loop!</span>
          </p>
        </div>

        {/* Registration Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 relative shadow-2xl">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200 dark:border-temporal-border text-sm font-mono text-slate-700 dark:text-gray-300">
            <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>PARTICIPANT AUTHENTICATION</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white font-medium outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* USN / Student ID */}
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                USN / Student ID *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. 1RV22CS001"
                  value={formData.usn}
                  onChange={(e) => setFormData({ ...formData, usn: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono font-bold uppercase outline-none transition-all placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Department & Year Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 text-slate-800 dark:text-gray-200 text-sm outline-none cursor-pointer"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-gray-200">
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Year of Study
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-temporal-border focus:border-cyan-500 text-slate-800 dark:text-gray-200 text-sm outline-none cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-white dark:bg-gray-900 text-slate-900 dark:text-gray-200">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Choose Avatar */}
            <div>
              <label className="block text-xs font-mono text-slate-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                Temporal Sigil (Avatar)
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setFormData({ ...formData, avatar: av })}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center shrink-0 border transition-all ${
                      formData.avatar === av
                        ? "bg-cyan-100 dark:bg-cyan-950 border-cyan-500 scale-110 shadow-lg shadow-cyan-500/30"
                        : "bg-slate-100 dark:bg-temporal-card border-slate-300 dark:border-temporal-border hover:border-slate-400 dark:hover:border-gray-600"
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.usn.trim()}
              className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white dark:text-black font-extrabold font-mono text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <span>ENTER THE TIME LOOP</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-temporal-border flex items-center justify-center gap-2 text-xs font-mono text-slate-500 dark:text-gray-500">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Anti-Cheat Protected Environment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
