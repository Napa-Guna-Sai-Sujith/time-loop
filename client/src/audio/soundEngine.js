// Web Audio API Synthesizer - 100% Procedural Sci-Fi Sound FX & Ticking Engine

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.tickInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMuted(mute) {
    this.muted = mute;
    if (mute && this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // Ticking sound for diminishing time loop
  // Pitch rises and intensity increases as remaining seconds get smaller (16s -> 6s)
  playTick(secondsRemaining, maxSeconds = 16) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const urgency = 1 - Math.max(0, Math.min(1, secondsRemaining / maxSeconds));
    const freq = 400 + urgency * 800; // 400Hz up to 1200Hz

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = urgency > 0.6 ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08 + urgency * 0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Synchronized countdown beeps (3, 2, 1, GO)
  playCountdownBeep(number) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const isGo = number === 0 || number === "GO";
    const freq = isGo ? 880 : 440 + (3 - (Number(number) || 1)) * 100;
    const duration = isGo ? 0.6 : 0.2;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Level cleared warp progression
  playLevelCleared() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = this.ctx.currentTime + idx * 0.08;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  // Wrong answer / loop continues glitch buzz
  playGlitchBuzz() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Elimination shockwave
  playElimination() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.9);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  // Wild card reveal sound
  playWildCardReveal(isBomb) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    if (isBomb) {
      // Dramatic bomb comeback boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.8);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.85);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.85);
    } else {
      // King chime
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    }
  }

  // Master Loop Broken / Champion Fanfare
  playLoopBrokenFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const chords = [
      [523.25, 659.25, 783.99],       // C Major
      [587.33, 739.99, 880.00],       // D Major
      [659.25, 830.61, 987.77],       // E Major
      [1046.50, 1318.51, 1567.98]     // High C Major
    ];

    chords.forEach((chord, step) => {
      const start = this.ctx.currentTime + step * 0.25;
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.65);
      });
    });
  }
}

export const sounds = new SoundEngine();
