# ⏳ TIME LOOP — Live Elimination College Tournament Platform

> **"Every time you fail, the loop becomes faster."**  
> `16s → 14s → 12s → 10s → 8s → 6s`

TIME LOOP is a real-time, high-stakes elimination college tournament platform built with **React, Vite, Tailwind CSS, Node.js, Express, Socket.IO, and Web Audio API**.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Run the Platform
```bash
# Runs both the backend server (Port 3001) and Vite dev client (Port 5173)
npm run dev

# Or to run the production unified server:
npm run build
npm run server
```

---

## 🌐 URLs & Access Modes

| Mode | URL | Purpose |
| :--- | :--- | :--- |
| 🧑‍💻 **Participant App** | `http://localhost:3001/` (or `http://localhost:5173/`) | Registration, Waiting Lobby, 6-Level Survival Loop, Anti-Cheat, Wild Card & Final Round. |
| 🎛️ **Host Command Center** | `http://localhost:3001/#/host` | Start Event (3-2-1 Countdown), Live Leaderboard, Sankey Distribution, Anti-Cheat incidents, Wild Card Director, Emergency Marquee & CSV Export. |
| 📽️ **Auditorium Big Screen** | `http://localhost:3001/#/projector` | Designed for stage projectors with live Top 3 podium, live survivor pyramid, and dramatic Wild Card / Champion takeover. |

---

## ⚙️ Core Gameplay Rules & Architecture

1. **6 Survival Levels**:
   - Each level contains a diverse blend of **Aptitude, Numerical, Logic, Programming Outputs (C/Python/JS), DBMS/OS/Networking, and Cryptarithms**.
   - **One Correct Answer Advances**: Players only need to solve 1 question correctly to clear a level immediately.
2. **Accelerating Time Loop**:
   - Question 1 starts with **16 seconds**.
   - A wrong answer or timeout decreases the timer by 2 seconds: **16s → 14s → 12s → 10s → 8s → 6s**.
   - **6 Failures in a single level = Elimination** ("TIME LOOP FAILED").
3. **Anti-Cheat Integrity Guard**:
   - Fullscreen enforcement with warning grace strikes.
   - Real-time tab switch (`visibilitychange`), window blur, clipboard copy-paste block, and devtools shortcut interception.
4. **Interactive Wild Card Resurrection (👑 King vs 💣 Bomb)**:
   - System automatically tracks the **Last 3 Eliminated Players**.
   - Interactive 3D card draw (2 Kings, 1 Bomb). The player who draws the 💣 Bomb is resurrected and advances to the finals!
5. **Final Round: 5-Stage "Break the Loop" Puzzle**:
   - 10-minute master clock for Top 3 + Wild-card player.
   - Cryptic multi-stage ARG: Quantum Sequence → Logic Matrix → Algorithmic Checksum → Caesar Cipher → Master 4-Digit Temporal Override Code (`2044`).
   - First finalist to break the puzzle is crowned **TIME LOOP CHAMPION**.
6. **Procedural Web Audio Synthesizer**:
   - Zero missing MP3 files. Uses pure Web Audio API oscillators for ticking clocks (accelerating pitch as time winds down), warp level-up chimes, glitch buzzers, and champion fanfare.
7. **High-Resolution Canvas Certificate Generator**:
   - Downloadable/printable certificate with recipient name, USN, college department, rank badge, and official verified stamp.
