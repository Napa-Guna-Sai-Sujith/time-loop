import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GameEngine, EVENT_STATUS } from "./gameState.js";
import { 
  initDatabase, 
  savePlayerToDB, 
  loadAllPlayersFromDB, 
  loadQuestionsFromDB, 
  saveQuestionToDB, 
  saveAntiCheatLogToDB 
} from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const engine = new GameEngine();

// Boot Database & Hydrate Engine
initDatabase().then(async (ok) => {
  if (ok) {
    const dbQuestions = await loadQuestionsFromDB();
    if (dbQuestions) {
      engine.questions = dbQuestions;
      console.log("📚 Hydrated questions from PostgreSQL into Game Engine");
    }
    const dbPlayers = await loadAllPlayersFromDB();
    if (dbPlayers && dbPlayers.size > 0) {
      engine.registeredUSNs = dbPlayers;
      console.log(`👥 Hydrated ${dbPlayers.size} participants from PostgreSQL into Game Engine`);
    }
  }
});

app.use(cors());
app.use(express.json());

// Serve static frontend in production
const distPath = path.join(__dirname, "../client/dist");
app.use(express.static(distPath));

// API: Health check & stats
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/stats", (req, res) => {
  res.json(engine.getDashboardStats());
});

// API: Export CSV of results
app.get("/api/export-csv", (req, res) => {
  const stats = engine.getDashboardStats();
  let csv = "Rank,USN,Name,Department,Level,Attempt,Status,Score,Strikes\n";
  stats.leaderboard.forEach(p => {
    csv += `"${p.rank}","${p.usn}","${p.name}","${p.department}","${p.level}","${p.attempt}","${p.status}","${p.score}","${p.strikes}"\n`;
  });
  res.header("Content-Type", "text/csv");
  res.attachment(`TIME_LOOP_RESULTS_${Date.now()}.csv`);
  res.send(csv);
});

// Broadcast periodic stats update to Host and Projector
setInterval(() => {
  const stats = engine.getDashboardStats();
  io.to("hosts").emit("dashboard_update", stats);
  io.to("projectors").emit("projector_update", stats);
}, 1000);

// WebSocket real-time event orchestrator
io.on("connection", (socket) => {
  // Join Host Room
  socket.on("join_host", () => {
    socket.join("hosts");
    socket.emit("dashboard_update", engine.getDashboardStats());
  });

  // Join Projector Room
  socket.on("join_projector", () => {
    socket.join("projectors");
    socket.emit("projector_update", engine.getDashboardStats());
  });

  // Participant Registration / Login
  socket.on("register_player", (payload, callback) => {
    try {
      const player = engine.registerOrLoginPlayer(socket.id, payload);
      socket.join(`player_${player.usn}`);
      socket.join("participants");

      // Persist to Neon DB
      savePlayerToDB(player);

      // Send back current state
      const currentQuestion = engine.getCurrentQuestion(player);
      const res = {
        success: true,
        player,
        eventStatus: engine.status,
        currentQuestion,
        finalPuzzleStage: engine.finalRound.active ? engine.finalRoundPuzzle.stages[(engine.finalRound.stagesProgress[player.usn] || 1) - 1] : null
      };

      if (callback) callback(res);
      io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Participant Submit Answer
  socket.on("submit_answer", ({ usn, answer }, callback) => {
    const result = engine.submitAnswer(usn, answer);
    if (callback) callback(result);

    // Broadcast live event updates & persist to DB
    const player = engine.registeredUSNs.get(usn);
    if (player) {
      savePlayerToDB(player);
    }

    if (result.status === "LEVEL_CLEARED") {
      io.emit("player_level_up", { usn, name: player?.name, level: result.level });
    } else if (result.status === "ESCAPED") {
      io.emit("player_escaped", { usn, name: player?.name, rank: result.escapedEntry?.rank });
    } else if (result.status === "ELIMINATED") {
      io.emit("player_eliminated", { usn, name: player?.name, level: result.level });
    }

    io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    io.to("projectors").emit("projector_update", engine.getDashboardStats());
  });

  // Anti-Cheat Violation Report from client
  socket.on("anti_cheat_violation", ({ usn, violationType, details }) => {
    const res = engine.recordAntiCheatViolation(usn, violationType, details);
    if (res) {
      // Save log and player to DB
      saveAntiCheatLogToDB(res.violation);
      const player = engine.registeredUSNs.get(usn);
      if (player) savePlayerToDB(player);

      socket.emit("strike_warning", {
        strikes: res.strikes,
        maxStrikes: engine.settings.maxStrikes,
        disqualified: res.disqualified,
        violationType
      });

      if (res.disqualified) {
        socket.emit("disqualified", {
          reason: `Exceeded anti-cheating limit (${violationType})`
        });
        io.emit("player_disqualified", { usn, violationType });
      }

      io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
      io.to("hosts").emit("new_anti_cheat_incident", res.violation);
    }
  });

  // Host: Trigger Countdown & Start Event
  socket.on("host_start_event", () => {
    engine.status = EVENT_STATUS.STARTING;
    io.emit("start_countdown", { seconds: 3 });

    setTimeout(() => {
      engine.startEvent();
      // Send question to each player
      for (const [socketId, player] of engine.players.entries()) {
        const q = engine.getCurrentQuestion(player);
        io.to(socketId).emit("game_started", {
          question: q,
          eventStatus: engine.status
        });
      }
      io.emit("event_started");
      io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
      io.to("projectors").emit("projector_update", engine.getDashboardStats());
    }, 3500);
  });

  // Host: Setup Wild Card
  socket.on("host_trigger_wild_card", (candidateUSNs) => {
    const wildCardData = engine.setupWildCard(candidateUSNs);
    io.emit("wild_card_started", wildCardData);
    io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    io.to("projectors").emit("projector_update", engine.getDashboardStats());
  });

  // Wild Card: Pick Card
  socket.on("pick_wild_card", ({ usn, cardId }, callback) => {
    const result = engine.pickWildCard(usn, cardId);
    if (callback) callback(result);
    io.emit("wild_card_updated", engine.wildCard);
    if (result.card?.type === "BOMB") {
      io.emit("wild_card_winner", { usn, name: engine.registeredUSNs.get(usn)?.name });
    }
  });

  // Host: Start Final Round (Break the Loop)
  socket.on("host_start_final_round", () => {
    const finalData = engine.startFinalRound();
    io.emit("final_round_started", {
      finalists: finalData.finalists,
      puzzleStagesCount: engine.finalRoundPuzzle.stages.length,
      durationMinutes: engine.finalRoundPuzzle.totalTimeMinutes,
      firstStage: engine.finalRoundPuzzle.stages[0]
    });
    io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    io.to("projectors").emit("projector_update", engine.getDashboardStats());
  });

  // Finalist: Submit Stage Answer
  socket.on("submit_final_stage", ({ usn, stageNum, answer }, callback) => {
    const result = engine.submitFinalStageAnswer(usn, stageNum, answer);
    if (callback) callback(result);

    if (result.correct) {
      if (result.loopBroken) {
        // CHAMPION WON!
        io.emit("loop_broken_champion", {
          champion: result.champion,
          allFinished: engine.finalRound.completedFinalists
        });
      } else {
        io.emit("finalist_stage_cleared", {
          usn,
          clearedStage: stageNum,
          nextStage: result.nextStage
        });
      }
    }
    io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    io.to("projectors").emit("projector_update", engine.getDashboardStats());
  });

  // Host: Reset Event
  socket.on("host_reset_event", () => {
    engine.resetAll();
    io.emit("event_reset");
    io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    io.to("projectors").emit("projector_update", engine.getDashboardStats());
  });

  // Host: Single Question Edit
  socket.on("host_update_question", ({ level, index, questionData }, callback) => {
    const res = engine.updateQuestion(level, index, questionData);
    if (res.success && res.updatedQuestion) {
      saveQuestionToDB(res.updatedQuestion);
    }
    if (callback) callback(res);
    io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    // Also update active player if they are currently on this level & question
    for (const [socketId, player] of engine.players.entries()) {
      if (player.status === "ACTIVE" && player.level === parseInt(level, 10) && player.attemptIndex === parseInt(index, 10)) {
        const q = engine.getCurrentQuestion(player);
        io.to(socketId).emit("question_updated", { question: q });
      }
    }
  });

  // Host: Reset All Questions to Default
  socket.on("host_reset_questions", (callback) => {
    const res = engine.resetQuestionsToDefault();
    if (callback) callback(res);
    io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
  });

  // Host: Custom Question Update
  socket.on("host_update_questions", (newQuestions) => {
    if (newQuestions) {
      engine.questions = newQuestions;
      io.to("hosts").emit("questions_updated", { success: true });
    }
  });

  // Host: Disqualify / Pardon Player
  socket.on("host_manage_player", ({ usn, action }) => {
    const player = engine.registeredUSNs.get(usn);
    if (player) {
      if (action === "DISQUALIFY") {
        player.status = "DISQUALIFIED";
        io.to(`player_${usn}`).emit("disqualified", { reason: "Disqualified by host" });
      } else if (action === "PARDON") {
        player.strikes = 0;
        if (player.status === "DISQUALIFIED") {
          player.status = "ACTIVE";
        }
      } else if (action === "REVIVE") {
        player.status = "ACTIVE";
        player.attemptIndex = 0;
      }
      io.to("hosts").emit("dashboard_update", engine.getDashboardStats());
    }
  });

  // Host: Broadcast custom announcement marquee
  socket.on("host_broadcast_announcement", ({ message, type }) => {
    io.emit("emergency_announcement", { message, type, time: Date.now() });
  });

  socket.on("disconnect", () => {
    engine.handleDisconnect(socket.id);
  });
});

// Fallback for SPA routing
app.get("*", (req, res) => {
  if (path.extname(req.path).length > 0) {
    return res.status(404).end();
  }
  res.sendFile(path.join(distPath, "index.html"));
});

server.listen(PORT, () => {
  console.log(`\n⏳ =================================================`);
  console.log(`⏳ TIME LOOP Server live on: http://localhost:${PORT}`);
  console.log(`⏳ Host Control Dashboard:   http://localhost:${PORT}/#/host`);
  console.log(`⏳ Stage Projector View:     http://localhost:${PORT}/#/projector`);
  console.log(`⏳ Participant URL:          http://localhost:${PORT}/`);
  console.log(`⏳ =================================================\n`);
});
