import pg from "pg";
import dotenv from "dotenv";
import { DEFAULT_QUESTIONS, FINAL_ROUND_PUZZLE } from "./questionBank.js";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_JW7u0UDitQmB@ep-cool-dust-b73g0psi-pooler.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require";

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

export async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log("🐘 Connected to Neon PostgreSQL Database successfully!");

    // Create Participants Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
        usn VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        department VARCHAR(100),
        year VARCHAR(50),
        avatar VARCHAR(50),
        level INT DEFAULT 1,
        attempt_index INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'WAITING',
        strikes INT DEFAULT 0,
        score INT DEFAULT 0,
        level_history JSONB DEFAULT '{}'::jsonb,
        level_start_time BIGINT,
        joined_at BIGINT,
        last_active_at BIGINT
      );
    `);

    // Create Questions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(50) PRIMARY KEY,
        level INT NOT NULL,
        question_index INT NOT NULL,
        category VARCHAR(100),
        type VARCHAR(50) DEFAULT 'mcq',
        question TEXT NOT NULL,
        options JSONB DEFAULT '[]'::jsonb,
        answer TEXT NOT NULL,
        explanation TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Anti-Cheat Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS anti_cheat_logs (
        id VARCHAR(100) PRIMARY KEY,
        usn VARCHAR(50) REFERENCES participants(usn) ON DELETE CASCADE,
        name VARCHAR(150),
        violation_type VARCHAR(100),
        details TEXT,
        strikes INT,
        timestamp BIGINT
      );
    `);

    // Create Tournament State Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_state (
        id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'LOBBY',
        wild_card JSONB DEFAULT '{}'::jsonb,
        final_round JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Default Questions if empty
    const questionCountRes = await client.query(`SELECT COUNT(*) FROM questions;`);
    const count = parseInt(questionCountRes.rows[0].count, 10);

    if (count === 0) {
      console.log("🌱 Seeding initial Question Bank into PostgreSQL...");
      for (const [levelStr, qList] of Object.entries(DEFAULT_QUESTIONS)) {
        const lvl = parseInt(levelStr, 10);
        for (let idx = 0; idx < qList.length; idx++) {
          const q = qList[idx];
          await client.query(`
            INSERT INTO questions (id, level, question_index, category, type, question, options, answer, explanation)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              category = EXCLUDED.category,
              type = EXCLUDED.type,
              question = EXCLUDED.question,
              options = EXCLUDED.options,
              answer = EXCLUDED.answer,
              explanation = EXCLUDED.explanation;
          `, [
            q.id || `L${lvl}_Q${idx + 1}`,
            lvl,
            idx,
            q.category,
            q.type,
            q.question,
            JSON.stringify(q.options || []),
            q.answer,
            q.explanation
          ]);
        }
      }
      console.log("✅ Question Bank seeded successfully into PostgreSQL!");
    }

    client.release();
    return true;
  } catch (err) {
    console.error("❌ PostgreSQL Initialization Error:", err.message);
    return false;
  }
}

// Database helper functions for GameEngine
export async function savePlayerToDB(player) {
  try {
    await pool.query(`
      INSERT INTO participants (
        usn, name, department, year, avatar, level, attempt_index,
        status, strikes, score, level_history, level_start_time, joined_at, last_active_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (usn) DO UPDATE SET
        name = EXCLUDED.name,
        department = EXCLUDED.department,
        year = EXCLUDED.year,
        avatar = EXCLUDED.avatar,
        level = EXCLUDED.level,
        attempt_index = EXCLUDED.attempt_index,
        status = EXCLUDED.status,
        strikes = EXCLUDED.strikes,
        score = EXCLUDED.score,
        level_history = EXCLUDED.level_history,
        level_start_time = EXCLUDED.level_start_time,
        last_active_at = EXCLUDED.last_active_at;
    `, [
      player.usn,
      player.name,
      player.department,
      player.year,
      player.avatar,
      player.level,
      player.attemptIndex,
      player.status,
      player.strikes,
      player.score,
      JSON.stringify(player.levelHistory || {}),
      player.levelStartTime,
      player.joinedAt,
      player.lastActiveAt
    ]);
  } catch (err) {
    console.error(`Error saving player ${player.usn} to DB:`, err.message);
  }
}

export async function loadAllPlayersFromDB() {
  try {
    const res = await pool.query(`SELECT * FROM participants;`);
    const map = new Map();
    for (const row of res.rows) {
      map.set(row.usn, {
        usn: row.usn,
        name: row.name,
        department: row.department,
        year: row.year,
        avatar: row.avatar,
        level: row.level,
        attemptIndex: row.attempt_index,
        status: row.status,
        strikes: row.strikes,
        score: row.score,
        levelHistory: row.level_history || {},
        levelStartTime: row.level_start_time ? Number(row.level_start_time) : null,
        joinedAt: row.joined_at ? Number(row.joined_at) : Date.now(),
        lastActiveAt: row.last_active_at ? Number(row.last_active_at) : Date.now(),
        connected: false
      });
    }
    return map;
  } catch (err) {
    console.error("Error loading players from DB:", err.message);
    return new Map();
  }
}

export async function loadQuestionsFromDB() {
  try {
    const res = await pool.query(`SELECT * FROM questions ORDER BY level ASC, question_index ASC;`);
    if (res.rows.length === 0) return null;

    const questionsByLevel = { 1: [], 2: [], 3: [], 4: [] };
    for (const row of res.rows) {
      if (questionsByLevel[row.level]) {
        questionsByLevel[row.level].push({
          id: row.id,
          level: row.level,
          category: row.category,
          type: row.type,
          question: row.question,
          options: typeof row.options === "string" ? JSON.parse(row.options) : row.options,
          answer: row.answer,
          explanation: row.explanation
        });
      }
    }
    return questionsByLevel;
  } catch (err) {
    console.error("Error loading questions from DB:", err.message);
    return null;
  }
}

export async function saveQuestionToDB(q) {
  try {
    await pool.query(`
      INSERT INTO questions (id, level, question_index, category, type, question, options, answer, explanation, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        type = EXCLUDED.type,
        question = EXCLUDED.question,
        options = EXCLUDED.options,
        answer = EXCLUDED.answer,
        explanation = EXCLUDED.explanation,
        updated_at = NOW();
    `, [
      q.id,
      q.level,
      parseInt(q.id.split("_Q")[1] || "1", 10) - 1,
      q.category,
      q.type,
      q.question,
      JSON.stringify(q.options || []),
      q.answer,
      q.explanation
    ]);
  } catch (err) {
    console.error(`Error saving question ${q.id} to DB:`, err.message);
  }
}

export async function saveAntiCheatLogToDB(log) {
  try {
    await pool.query(`
      INSERT INTO anti_cheat_logs (id, usn, name, violation_type, details, strikes, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING;
    `, [
      log.id,
      log.usn,
      log.name,
      log.type,
      log.details,
      log.strikes,
      log.timestamp
    ]);
  } catch (err) {
    console.error("Error saving anti-cheat log to DB:", err.message);
  }
}

// Complete Database Purge & Factory Reset
export async function purgeDatabaseAndReset() {
  const client = await pool.connect();
  try {
    console.log("🧨 Purging all data from PostgreSQL database...");
    await client.query(`
      TRUNCATE TABLE anti_cheat_logs, participants, tournament_state CASCADE;
    `);
    
    // Clear and re-seed default questions
    await client.query(`DELETE FROM questions;`);
    for (const [levelStr, qList] of Object.entries(DEFAULT_QUESTIONS)) {
      const lvl = parseInt(levelStr, 10);
      for (let idx = 0; idx < qList.length; idx++) {
        const q = qList[idx];
        await client.query(`
          INSERT INTO questions (id, level, question_index, category, type, question, options, answer, explanation)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `, [
          q.id || `L${lvl}_Q${idx + 1}`,
          lvl,
          idx,
          q.category,
          q.type,
          q.question,
          JSON.stringify(q.options || []),
          q.answer,
          q.explanation
        ]);
      }
    }
    console.log("✅ Database completely purged and reset to default!");
    return { success: true };
  } catch (err) {
    console.error("❌ Database purge error:", err.message);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

