import React, { useRef, useEffect } from "react";
import { Download, Printer, X, Award, ShieldCheck } from "lucide-react";

export default function CertificateModal({ 
  player, 
  rankTitle = "CHAMPION", 
  rankPosition = 1, 
  onClose 
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !player) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Canvas size (High resolution 1920x1080)
    canvas.width = 1920;
    canvas.height = 1080;

    // Background Gradient (Deep Temporal Dark with Cyan/Gold accents)
    const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
    bgGrad.addColorStop(0, "#060913");
    bgGrad.addColorStop(0.5, "#0b1222");
    bgGrad.addColorStop(1, "#04070e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Decorative Futuristic Grid
    ctx.strokeStyle = "rgba(0, 240, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1920; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1080);
      ctx.stroke();
    }
    for (let y = 0; y < 1080; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1920, y);
      ctx.stroke();
    }

    // Outer Cyber Border & Corner Trims
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, 1800, 960);

    ctx.strokeStyle = "#9d4edd";
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 80, 1760, 920);

    // Header: Event Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 32px 'JetBrains Mono', monospace";
    ctx.letterSpacing = "10px";
    ctx.fillText("TIME LOOP // COLLEGE TOURNAMENT", 960, 160);

    // Title: Certificate of Excellence
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px 'Space Grotesk', sans-serif";
    ctx.fillText("CERTIFICATE OF VICTORY", 960, 250);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "24px 'Space Grotesk', sans-serif";
    ctx.fillText("THIS RECOGNITION IS OFFICIALLY PRESENTED TO", 960, 320);

    // Participant Name (Big Glow)
    ctx.fillStyle = "#ffb703";
    ctx.font = "bold 72px 'Space Grotesk', sans-serif";
    ctx.fillText(player.name.toUpperCase(), 960, 430);

    // USN & Department
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 28px 'JetBrains Mono', monospace";
    ctx.fillText(`USN: ${player.usn}   |   DEPT: ${player.department || "TECH"}`, 960, 500);

    // Performance Narrative
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "26px 'Space Grotesk', sans-serif";
    ctx.fillText(
      `For demonstrating extraordinary intellectual speed and mathematical resilience in breaking`,
      960,
      590
    );
    ctx.fillText(
      `the 6-Level diminishing time continuum and finishing as:`,
      960,
      635
    );

    // Rank / Title Badge
    ctx.fillStyle = "#00f0ff";
    ctx.font = "bold 52px 'JetBrains Mono', monospace";
    ctx.fillText(`★ ${rankTitle.toUpperCase()} (RANK #${rankPosition}) ★`, 960, 730);

    // Bottom Seals & Date
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Date line
    ctx.textAlign = "left";
    ctx.fillStyle = "#64748b";
    ctx.font = "20px 'JetBrains Mono', monospace";
    ctx.fillText(`DATE: ${today}`, 140, 930);
    ctx.fillText(`EVENT VERIFIED: TIME-LOOP-CORE-V2`, 140, 960);

    // Signatures / Authority
    ctx.textAlign = "right";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 22px 'Space Grotesk', sans-serif";
    ctx.fillText("EVENT CONVENER", 1780, 930);
    ctx.fillStyle = "#64748b";
    ctx.font = "18px 'JetBrains Mono', monospace";
    ctx.fillText("Department of Technical Events", 1780, 960);

    // Digital Security Seal Stamp in Center Bottom
    ctx.beginPath();
    ctx.arc(960, 910, 55, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffb703";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffb703";
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillText("OFFICIAL SEAL", 960, 905);
    ctx.fillText("VERIFIED", 960, 925);

  }, [player, rankTitle, rankPosition]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `TIME_LOOP_CERTIFICATE_${player.usn}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const win = window.open("");
    win.document.write(`<img src="${canvasRef.current.toDataURL()}" style="width:100%"/>`);
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
      <div className="max-w-4xl w-full glass-panel-glow rounded-2xl p-6 relative flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm mb-4">
          <Award className="w-5 h-5 text-amber-400" />
          <span>OFFICIAL TOURNAMENT CERTIFICATE GENERATOR</span>
        </div>

        {/* Canvas Display */}
        <div className="w-full rounded-xl overflow-hidden border border-cyan-500/30 shadow-2xl mb-6 bg-black">
          <canvas
            ref={canvasRef}
            className="w-full h-auto block max-h-[60vh] object-contain mx-auto"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleDownload}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD HIGH-RES CERTIFICATE (PNG)</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-3 rounded-xl bg-temporal-card hover:bg-temporal-cardLight border border-temporal-border text-gray-200 font-mono text-sm flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>PRINT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
