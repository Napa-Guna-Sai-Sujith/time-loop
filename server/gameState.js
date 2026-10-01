import { DEFAULT_QUESTIONS, FINAL_ROUND_PUZZLE } from "./questionBank.js";

export const EVENT_STATUS = {
  LOBBY: "LOBBY",
  STARTING: "STARTING",
  MAIN_GAME: "MAIN_GAME",
  MAIN_GAME_FROZEN: "MAIN_GAME_FROZEN",
  WILD_CARD: "WILD_CARD",
  FINAL_ROUND: "FINAL_ROUND",
  FINISHED: "FINISHED"
};

export const MAX_LEVELS = 4;
export const LEVEL_TIME_SECONDS = 15 * 60; // 15 Minutes (900s)

export class GameEngine {
  constructor() {
    this.status = EVENT_STATUS.LOBBY;
    this.players = new Map(); // socketId -> player details
    this.registeredUSNs = new Map(); // usn -> playerData
    this.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    this.finalRoundPuzzle = JSON.parse(JSON.stringify(FINAL_ROUND_PUZZLE));
    
    // Elimination queue to track last eliminated participants
    this.eliminationOrder = []; // [{ usn, name, dept, eliminatedAt, level, attempt }]
    
    // Escaped queue (Top finishers of main game)
    this.escapedOrder = []; // [{ usn, name, dept, escapedAt, totalTimeMs }]
    
    // Wild Card state
    this.wildCard = {
      active: false,
      candidates: [],
      cards: [],
      winner: null
    };

    // Final Round state
    this.finalRound = {
      active: false,
      startedAt: null,
      durationMs: 10 * 60 * 1000, // 10 minutes
      finalists: [],
      stagesProgress: {},
      completedFinalists: [],
      champion: null
    };

    this.antiCheatLogs = [];
    this.startTime = null;
    this.settings = {
      maxStrikes: 2,
      fullscreenRequired: true,
      autoEliminateOnStrikes: true,
      levelDurationSeconds: LEVEL_TIME_SECONDS
    };
  }

  registerOrLoginPlayer(socketId, { name, usn, department, year, avatar }) {
    const cleanUSN = usn.trim().toUpperCase();
    
    let player = this.registeredUSNs.get(cleanUSN);
    if (!player) {
      player = {
        usn: cleanUSN,
        name: name.trim(),
        department: department.trim(),
        year: year || "1st Year",
        avatar: avatar || "⚡",
        level: 1,
        attemptIndex: 0, // 0..5 (Q1..Q6)
        status: "WAITING",
        strikes: 0,
        connected: true,
        socketId: socketId,
        score: 0,
        levelHistory: {},
        levelStartTime: null,
        joinedAt: Date.now(),
        lastActiveAt: Date.now()
      };
      this.registeredUSNs.set(cleanUSN, player);
    } else {
      player.socketId = socketId;
      player.connected = true;
      player.lastActiveAt = Date.now();
      if (name) player.name = name.trim();
      if (department) player.department = department.trim();
    }

    this.players.set(socketId, player);
    return player;
  }

  handleDisconnect(socketId) {
    const player = this.players.get(socketId);
    if (player) {
      player.connected = false;
      this.players.delete(socketId);
    }
  }

  startEvent() {
    this.status = EVENT_STATUS.MAIN_GAME;
    this.startTime = Date.now();

    for (const player of this.registeredUSNs.values()) {
      if (player.status === "WAITING" || player.status === "ACTIVE") {
        player.status = "ACTIVE";
        player.level = 1;
        player.attemptIndex = 0;
        player.levelStartTime = Date.now();
      }
    }
  }

  getCurrentQuestion(player) {
    if (!player || player.status !== "ACTIVE" || player.level > MAX_LEVELS) {
      return null;
    }
    const levelQuestions = this.questions[player.level];
    if (!levelQuestions || player.attemptIndex >= levelQuestions.length) {
      return null;
    }
    const q = levelQuestions[player.attemptIndex];
    
    // Calculate remaining seconds in this 15-min level window
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - (player.levelStartTime || now)) / 1000);
    const remainingLevelSeconds = Math.max(0, LEVEL_TIME_SECONDS - elapsedSeconds);

    return {
      id: q.id,
      level: q.level,
      category: q.category,
      type: q.type,
      question: q.question,
      options: q.options ? [...q.options] : undefined,
      attemptNumber: player.attemptIndex + 1,
      totalAttempts: 6,
      maxLevels: MAX_LEVELS,
      levelTimeLimitSeconds: LEVEL_TIME_SECONDS,
      remainingLevelSeconds
    };
  }

  submitAnswer(usn, answerGiven) {
    const player = this.registeredUSNs.get(usn);
    if (!player || player.status !== "ACTIVE") {
      return { success: false, reason: "Player not active" };
    }

    // Check if 15-minute level window expired
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - (player.levelStartTime || now)) / 1000);
    if (elapsedSeconds >= LEVEL_TIME_SECONDS || answerGiven === "__LEVEL_TIMEOUT__") {
      player.status = "ELIMINATED";
      const eliminationEntry = {
        usn: player.usn,
        name: player.name,
        department: player.department,
        eliminatedAt: Date.now(),
        level: player.level,
        attempt: player.attemptIndex + 1,
        reason: "15-minute level timer expired",
        order: this.eliminationOrder.length + 1
      };
      this.eliminationOrder.push(eliminationEntry);
      return {
        correct: false,
        status: "ELIMINATED",
        level: player.level,
        eliminationEntry,
        nextQuestion: null
      };
    }

    const currentLevel = player.level;
    const currentAttempt = player.attemptIndex;
    const levelQuestions = this.questions[currentLevel];
    const question = levelQuestions ? levelQuestions[currentAttempt] : null;

    if (!question) {
      return { success: false, reason: "Invalid question" };
    }

    const isCorrect = this.validateAnswer(question, answerGiven);

    // Track score & answers
    if (isCorrect) {
      player.score += 100;
    }

    if (!player.levelHistory[currentLevel]) {
      player.levelHistory[currentLevel] = {
        questions: {},
        startedAt: player.levelStartTime || Date.now()
      };
    }
    player.levelHistory[currentLevel].questions[currentAttempt + 1] = {
      correct: isCorrect,
      answeredAt: Date.now()
    };

    // Check if more questions remain in this level (Questions 1 to 5)
    if (currentAttempt < 5) {
      player.attemptIndex += 1;
      return {
        correct: isCorrect,
        status: "NEXT_QUESTION",
        level: player.level,
        attemptNumber: player.attemptIndex + 1,
        totalQuestions: 6,
        nextQuestion: this.getCurrentQuestion(player)
      };
    } else {
      // Completed all 6 questions in this level!
      player.levelHistory[currentLevel].cleared = true;
      player.levelHistory[currentLevel].clearedAt = Date.now();
      player.levelHistory[currentLevel].timeSpent = Math.floor((Date.now() - (player.levelStartTime || Date.now())) / 1000);

      if (currentLevel >= MAX_LEVELS) {
        // CONQUERED ALL 4 LEVELS (ALL 24 QUESTIONS ATTEMPTED) -> ESCAPED TIME LOOP!
        player.status = "ESCAPED";
        const escapedEntry = {
          usn: player.usn,
          name: player.name,
          department: player.department,
          escapedAt: Date.now(),
          score: player.score,
          totalTimeMs: Date.now() - (this.startTime || Date.now()),
          rank: this.escapedOrder.length + 1
        };
        this.escapedOrder.push(escapedEntry);
        
        return {
          correct: isCorrect,
          status: "ESCAPED",
          level: currentLevel,
          escapedEntry,
          nextQuestion: null
        };
      } else {
        // Advance to next level & reset 15-min level timer
        player.level += 1;
        player.attemptIndex = 0;
        player.levelStartTime = Date.now();

        return {
          correct: isCorrect,
          status: "LEVEL_CLEARED",
          level: player.level,
          attemptNumber: 1,
          nextQuestion: this.getCurrentQuestion(player)
        };
      }
    }
  }

  handleFailure(player) {
    const nextAttempt = player.attemptIndex + 1;
    if (nextAttempt >= 6) {
      // 6 Failures in this level = ELIMINATION!
      player.status = "ELIMINATED";
      const eliminationEntry = {
        usn: player.usn,
        name: player.name,
        department: player.department,
        eliminatedAt: Date.now(),
        level: player.level,
        attempt: 6,
        order: this.eliminationOrder.length + 1
      };
      this.eliminationOrder.push(eliminationEntry);

      return {
        correct: false,
        status: "ELIMINATED",
        level: player.level,
        eliminationEntry,
        nextQuestion: null
      };
    } else {
      // Question is replaced with the other one
      player.attemptIndex = nextAttempt;
      return {
        correct: false,
        status: "QUESTION_REPLACED",
        level: player.level,
        attemptNumber: player.attemptIndex + 1,
        nextQuestion: this.getCurrentQuestion(player)
      };
    }
  }

  validateAnswer(question, answerGiven) {
    if (answerGiven === null || answerGiven === undefined) return false;
    const cleanGiven = String(answerGiven).trim().toLowerCase();
    const cleanExpected = String(question.answer).trim().toLowerCase();
    return cleanGiven === cleanExpected;
  }

  // Admin Question Editing & Management
  updateQuestion(levelNum, questionIndex, updatedData) {
    const lvl = parseInt(levelNum, 10);
    const idx = parseInt(questionIndex, 10);

    if (!this.questions[lvl] || !this.questions[lvl][idx]) {
      return { success: false, reason: "Question not found" };
    }

    this.questions[lvl][idx] = {
      ...this.questions[lvl][idx],
      ...updatedData,
      level: lvl,
      id: updatedData.id || `L${lvl}_Q${idx + 1}`
    };

    return { success: true, updatedQuestion: this.questions[lvl][idx] };
  }

  resetQuestionsToDefault() {
    this.questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    return { success: true, questions: this.questions };
  }

  recordAntiCheatViolation(usn, violationType, details = "") {
    const player = this.registeredUSNs.get(usn);
    if (!player) return null;

    player.strikes += 1;
    const violation = {
      id: "V_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      usn: player.usn,
      name: player.name,
      type: violationType,
      details: details,
      timestamp: Date.now(),
      strikes: player.strikes
    };

    this.antiCheatLogs.unshift(violation);
    if (this.antiCheatLogs.length > 200) this.antiCheatLogs.pop();

    let disqualified = false;
    if (this.settings.autoEliminateOnStrikes && player.strikes >= this.settings.maxStrikes) {
      player.status = "DISQUALIFIED";
      disqualified = true;
    }

    return { violation, strikes: player.strikes, disqualified };
  }

  setupWildCard(candidateUSNs = null) {
    this.status = EVENT_STATUS.WILD_CARD;
    this.wildCard.active = true;

    let selected = [];
    if (candidateUSNs && candidateUSNs.length === 3) {
      selected = candidateUSNs.map(usn => this.registeredUSNs.get(usn)).filter(Boolean);
    } else {
      selected = this.eliminationOrder.slice(-3).map(e => this.registeredUSNs.get(e.usn)).filter(Boolean);
    }

    if (selected.length < 3) {
      const allElim = Array.from(this.registeredUSNs.values()).filter(p => p.status === "ELIMINATED");
      for (const p of allElim) {
        if (!selected.some(s => s.usn === p.usn) && selected.length < 3) {
          selected.push(p);
        }
      }
    }

    this.wildCard.candidates = selected.map(p => ({
      usn: p.usn,
      name: p.name,
      department: p.department,
      avatar: p.avatar
    }));

    const cardTypes = ["KING", "KING", "BOMB"].sort(() => Math.random() - 0.5);
    this.wildCard.cards = cardTypes.map((type, idx) => ({
      id: idx,
      type: type,
      pickedBy: null,
      revealed: false
    }));
    this.wildCard.winner = null;

    return this.wildCard;
  }

  pickWildCard(usn, cardId) {
    const card = this.wildCard.cards.find(c => c.id === cardId);
    if (!card || card.pickedBy) {
      return { success: false, reason: "Card already picked or invalid" };
    }

    const player = this.registeredUSNs.get(usn);
    if (!player) return { success: false, reason: "Player not found" };

    card.pickedBy = usn;
    card.revealed = true;

    if (card.type === "BOMB") {
      this.wildCard.winner = usn;
      player.status = "FINALIST";
    }

    return {
      success: true,
      card,
      wildCard: this.wildCard
    };
  }

  startFinalRound() {
    this.status = EVENT_STATUS.FINAL_ROUND;
    this.finalRound.active = true;
    this.finalRound.startedAt = Date.now();

    const top3 = this.escapedOrder.slice(0, 3).map(e => e.usn);
    const finalistsSet = new Set(top3);
    if (this.wildCard.winner) {
      finalistsSet.add(this.wildCard.winner);
    }
    
    if (finalistsSet.size < 3) {
      const sorted = Array.from(this.registeredUSNs.values())
        .sort((a, b) => b.level - a.level || a.attemptIndex - b.attemptIndex);
      for (const p of sorted) {
        if (finalistsSet.size >= 4) break;
        finalistsSet.add(p.usn);
      }
    }

    this.finalRound.finalists = Array.from(finalistsSet);
    for (const usn of this.finalRound.finalists) {
      const p = this.registeredUSNs.get(usn);
      if (p) {
        p.status = "FINALIST";
        this.finalRound.stagesProgress[usn] = 1;
      }
    }

    return this.finalRound;
  }

  submitFinalStageAnswer(usn, stageNum, answerGiven) {
    if (!this.finalRound.active) {
      return { success: false, reason: "Final round not active" };
    }

    const currentProgress = this.finalRound.stagesProgress[usn] || 1;
    if (stageNum !== currentProgress) {
      return { success: false, reason: "Invalid stage sequence" };
    }

    const stageData = this.finalRoundPuzzle.stages[stageNum - 1];
    if (!stageData) {
      return { success: false, reason: "Stage not found" };
    }

    const cleanGiven = String(answerGiven).trim().toUpperCase();
    const cleanExpected = String(stageData.expectedAnswer).trim().toUpperCase();

    if (cleanGiven === cleanExpected) {
      if (stageNum >= 5) {
        const player = this.registeredUSNs.get(usn);
        const durationMs = Date.now() - this.finalRound.startedAt;
        const completionEntry = {
          usn,
          name: player ? player.name : usn,
          department: player ? player.department : "",
          completedAt: Date.now(),
          durationMs,
          rank: this.finalRound.completedFinalists.length + 1
        };

        this.finalRound.completedFinalists.push(completionEntry);
        if (!this.finalRound.champion) {
          this.finalRound.champion = completionEntry;
        }

        return {
          correct: true,
          loopBroken: true,
          stage: 5,
          completionEntry,
          champion: this.finalRound.champion
        };
      } else {
        this.finalRound.stagesProgress[usn] = stageNum + 1;
        return {
          correct: true,
          loopBroken: false,
          nextStage: stageNum + 1,
          stageData: this.finalRoundPuzzle.stages[stageNum]
        };
      }
    } else {
      return {
        correct: false,
        reason: "Incorrect code for this stage"
      };
    }
  }

  getDashboardStats() {
    const allPlayers = Array.from(this.registeredUSNs.values());
    const totalRegistered = allPlayers.length;
    const online = allPlayers.filter(p => p.connected).length;
    const active = allPlayers.filter(p => p.status === "ACTIVE").length;
    const escaped = allPlayers.filter(p => p.status === "ESCAPED").length;
    const eliminated = allPlayers.filter(p => p.status === "ELIMINATED").length;
    const finalists = allPlayers.filter(p => p.status === "FINALIST").length;
    const disqualified = allPlayers.filter(p => p.status === "DISQUALIFIED").length;

    // Distribution across Levels 1-4
    const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of allPlayers) {
      if (p.status === "ACTIVE" && p.level >= 1 && p.level <= MAX_LEVELS) {
        levelCounts[p.level] += 1;
      }
    }

    // Leaderboard
    const leaderboard = allPlayers
      .slice()
      .sort((a, b) => {
        if (a.status === "ESCAPED" && b.status !== "ESCAPED") return -1;
        if (b.status === "ESCAPED" && a.status !== "ESCAPED") return 1;
        if (a.status === "ESCAPED" && b.status === "ESCAPED") {
          return (a.levelHistory[MAX_LEVELS]?.clearedAt || 0) - (b.levelHistory[MAX_LEVELS]?.clearedAt || 0);
        }
        if (b.level !== a.level) return b.level - a.level;
        if (a.attemptIndex !== b.attemptIndex) return a.attemptIndex - b.attemptIndex;
        return b.score - a.score;
      })
      .map((p, idx) => ({
        rank: idx + 1,
        usn: p.usn,
        name: p.name,
        department: p.department,
        level: p.level,
        attempt: p.attemptIndex + 1,
        status: p.status,
        score: p.score,
        strikes: p.strikes,
        connected: p.connected
      }));

    return {
      status: this.status,
      maxLevels: MAX_LEVELS,
      totalRegistered,
      online,
      active,
      escaped,
      eliminated,
      finalists,
      disqualified,
      levelCounts,
      leaderboard,
      questions: this.questions,
      antiCheatLogs: this.antiCheatLogs.slice(0, 30),
      lastEliminated: this.eliminationOrder.slice(-5),
      topEscaped: this.escapedOrder.slice(0, 5),
      wildCard: this.wildCard,
      finalRound: {
        active: this.finalRound.active,
        finalists: this.finalRound.finalists,
        stagesProgress: this.finalRound.stagesProgress,
        champion: this.finalRound.champion,
        completedFinalists: this.finalRound.completedFinalists
      }
    };
  }

  resetAll() {
    this.status = EVENT_STATUS.LOBBY;
    this.eliminationOrder = [];
    this.escapedOrder = [];
    this.antiCheatLogs = [];
    this.wildCard = { active: false, candidates: [], cards: [], winner: null };
    this.finalRound = {
      active: false,
      startedAt: null,
      durationMs: 10 * 60 * 1000,
      finalists: [],
      stagesProgress: {},
      completedFinalists: [],
      champion: null
    };

    for (const p of this.registeredUSNs.values()) {
      p.level = 1;
      p.attemptIndex = 0;
      p.status = "WAITING";
      p.score = 0;
      p.strikes = 0;
      p.levelHistory = {};
      p.levelStartTime = null;
    }
  }

  purgeAll() {
    this.status = EVENT_STATUS.LOBBY;
    this.startTime = null;
    this.registeredUSNs.clear();
    this.players.clear();
    this.eliminationOrder = [];
    this.escapedOrder = [];
    this.antiCheatLogs = [];
    this.wildCard = { active: false, candidates: [], cards: [], winner: null };
    this.finalRound = {
      active: false,
      startedAt: null,
      durationMs: 10 * 60 * 1000,
      finalists: [],
      stagesProgress: {},
      completedFinalists: [],
      champion: null
    };
    this.resetQuestionsToDefault();
  }
}
