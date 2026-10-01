import React, { useState } from "react";
import { sounds } from "../audio/soundEngine";
import { Crown, Bomb, Sparkles, HelpCircle, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

export default function WildCardModal({ 
  wildCardData, 
  currentUserUSN, 
  onPickCard, 
  isHost = false 
}) {
  const [flippingCardId, setFlippingCardId] = useState(null);

  if (!wildCardData || !wildCardData.active) return null;

  const isCandidate = wildCardData.candidates?.some(c => c.usn === currentUserUSN);
  const myPickedCard = wildCardData.cards?.find(c => c.pickedBy === currentUserUSN);

  const handleCardClick = (card) => {
    if (card.revealed || card.pickedBy) return;
    if (!isCandidate && !isHost) return;

    sounds.init();
    setFlippingCardId(card.id);

    if (onPickCard) {
      onPickCard(card.id);
    }

    setTimeout(() => {
      setFlippingCardId(null);
      if (card.type === "BOMB") {
        sounds.playWildCardReveal(true);
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        sounds.playWildCardReveal(false);
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl select-none">
      <div className="max-w-3xl w-full glass-panel-glow rounded-3xl p-6 sm:p-10 text-center relative border-cyan-500/50 shadow-2xl">
        {/* Header */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 font-mono text-xs uppercase tracking-widest mb-4">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>QUANTUM WILD CARD RESURRECTION</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mb-2">
          KING <span className="text-amber-400">👑</span> OR BOMB <span className="text-red-400">💣</span>
        </h2>
        
        <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto mb-8 font-sans">
          "You were eliminated. But the TIME LOOP isn't finished with you."
          <br />
          <span className="text-cyan-400 font-medium">1 Bomb brings you back to the Finalists Pool. 2 Kings keep you trapped.</span>
        </p>

        {/* Candidates Badge List */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          {wildCardData.candidates?.map((cand, idx) => {
            const isMe = cand.usn === currentUserUSN;
            const hasPicked = wildCardData.cards?.some(c => c.pickedBy === cand.usn);

            return (
              <div 
                key={idx}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  isMe 
                    ? "bg-cyan-950/90 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30" 
                    : "bg-temporal-card/80 border-gray-700 text-gray-300"
                }`}
              >
                <span>{cand.avatar || "👤"}</span>
                <span className="font-bold">{cand.name}</span>
                <span className="text-gray-500">({cand.usn})</span>
                {hasPicked && <span className="text-green-400 text-[10px]">✓ PICKED</span>}
              </div>
            );
          })}
        </div>

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl mx-auto mb-8 perspective-1000">
          {wildCardData.cards?.map((card, idx) => {
            const isRevealed = card.revealed;
            const isBomb = card.type === "BOMB";
            const picker = wildCardData.candidates?.find(c => c.usn === card.pickedBy);

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                className={`relative h-64 rounded-2xl cursor-pointer transition-transform duration-500 transform-style-3d ${
                  isRevealed || flippingCardId === card.id ? "rotate-y-180" : "hover:scale-105"
                }`}
              >
                {/* Front (Hidden Face) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 border-2 border-cyan-500/40 p-6 flex flex-col items-center justify-between backface-hidden shadow-xl shadow-cyan-500/10 hover:border-cyan-400">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    CARD #{idx + 1}
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center animate-pulse">
                    <HelpCircle className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="text-xs font-mono text-gray-400">
                    {isCandidate && !myPickedCard ? "CLICK TO REVEAL" : "TEMPORAL VAULT"}
                  </div>
                </div>

                {/* Back (Revealed Face) */}
                <div className={`absolute inset-0 w-full h-full rounded-2xl p-6 flex flex-col items-center justify-between rotate-y-180 backface-hidden shadow-2xl border-2 ${
                  isBomb 
                    ? "bg-gradient-to-br from-red-950 via-red-900 to-black border-red-500 shadow-red-500/50" 
                    : "bg-gradient-to-br from-amber-950 via-amber-900 to-black border-amber-500 shadow-amber-500/50"
                }`}>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gray-300">
                    {isBomb ? "WILD CARD ENTRY" : "ELIMINATION CONFIRMED"}
                  </div>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce">
                    {isBomb ? (
                      <Bomb className="w-16 h-16 text-red-400 drop-shadow-[0_0_20px_rgba(255,42,95,0.8)]" />
                    ) : (
                      <Crown className="w-16 h-16 text-amber-400 drop-shadow-[0_0_20px_rgba(255,183,3,0.8)]" />
                    )}
                  </div>
                  <div>
                    <div className={`text-lg font-black font-mono tracking-wider ${isBomb ? "text-red-300" : "text-amber-300"}`}>
                      {isBomb ? "💣 BOMB" : "👑 KING"}
                    </div>
                    {picker && (
                      <div className="text-[11px] font-mono text-gray-300 mt-1">
                        Picked by: <span className="font-bold text-white">{picker.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Winner Announcement if Bomb was picked */}
        {wildCardData.winner && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950 via-purple-950 to-red-950 border border-red-500/60 animate-pulse">
            <h4 className="text-xl font-mono font-extrabold text-white mb-1">
              🔥 RESURRECTION CONFIRMED!
            </h4>
            <p className="text-sm font-mono text-red-300">
              {wildCardData.candidates?.find(c => c.usn === wildCardData.winner)?.name} pulled the 💣 BOMB and advances to the FINAL ROUND!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
