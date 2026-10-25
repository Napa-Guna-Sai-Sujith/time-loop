// Centralized API Client for LOOP Platform
let rawApiBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
if (rawApiBase.endsWith("/api")) {
  rawApiBase = rawApiBase.substring(0, rawApiBase.length - 4);
}
const API_BASE = rawApiBase ? `${rawApiBase}/api` : "/api";

function getAuthHeader() {
  const token = localStorage.getItem("loop_token") || sessionStorage.getItem("loop_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  async organizerLogin(username, password) {
    const res = await fetch(`${API_BASE}/auth/organizer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({ username, password })
    });
    return handleResponse(res);
  },

  async organizerLogout() {
    localStorage.removeItem("loop_token");
    sessionStorage.removeItem("loop_token");
    localStorage.removeItem("loop_role");
    await fetch(`${API_BASE}/auth/organizer/logout`, { method: "POST" });
  },

  async getOrganizerMe() {
    const res = await fetch(`${API_BASE}/auth/organizer/me`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async changeOrganizerPassword(current_password, new_password, confirm_password) {
    const res = await fetch(`${API_BASE}/auth/organizer/change-password`, {
      method: "PUT",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody({ current_password, new_password, confirm_password })
    });
    return handleResponse(res);
  },

  async getNextTeamId() {
    const res = await fetch(`${API_BASE}/auth/team/next-id`);
    return handleResponse(res);
  },

  async teamRegister(data) {
    const res = await fetch(`${API_BASE}/auth/team/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody(data)
    });
    return handleResponse(res);
  },

  async teamLogin(team_id, password) {
    const res = await fetch(`${API_BASE}/auth/team/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonBody({ team_id, password })
    });
    return handleResponse(res);
  },

  async teamLogout() {
    localStorage.removeItem("loop_token");
    sessionStorage.removeItem("loop_token");
    localStorage.removeItem("loop_role");
    await fetch(`${API_BASE}/auth/team/logout`, { method: "POST" });
  },

  async getTeamMe() {
    const res = await fetch(`${API_BASE}/auth/team/me`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Player Gameplay
  async getPlayerState() {
    const res = await fetch(`${API_BASE}/player/state`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async submitAnswer(answer) {
    const res = await fetch(`${API_BASE}/player/submit-answer`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody({ answer })
    });
    return handleResponse(res);
  },

  async triggerTimeout() {
    const res = await fetch(`${API_BASE}/player/timeout`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async reportProctorViolation(violation_type, details = "") {
    const res = await fetch(`${API_BASE}/player/proctor-violation`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody({ violation_type, details })
    });
    return handleResponse(res);
  },

  async restoreTeamProctor(team_id) {
    const res = await fetch(`${API_BASE}/organizer/teams/${encodeURIComponent(team_id)}/restore-proctor`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Organizer: Stats, Settings, Controls
  async getOrganizerStats() {
    const res = await fetch(`${API_BASE}/organizer/stats`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async getEventSettings() {
    const res = await fetch(`${API_BASE}/organizer/settings`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async updateEventSettings(settings) {
    const res = await fetch(`${API_BASE}/organizer/settings`, {
      method: "PUT",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody(settings)
    });
    return handleResponse(res);
  },

  async startGame() {
    const res = await fetch(`${API_BASE}/organizer/start-game`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async pauseGame() {
    const res = await fetch(`${API_BASE}/organizer/pause-game`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async resumeGame() {
    const res = await fetch(`${API_BASE}/organizer/resume-game`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async resetGame() {
    const res = await fetch(`${API_BASE}/organizer/reset-game`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async purgeDatabase() {
    const res = await fetch(`${API_BASE}/organizer/purge-database`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async openFinalStage() {
    const res = await fetch(`${API_BASE}/organizer/open-final`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Organizer: Teams
  async getTeams() {
    const res = await fetch(`${API_BASE}/organizer/teams`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async createTeam(data) {
    const res = await fetch(`${API_BASE}/organizer/teams`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody(data)
    });
    return handleResponse(res);
  },

  async updateTeam(team_id, data) {
    const res = await fetch(`${API_BASE}/organizer/teams/${encodeURIComponent(team_id)}`, {
      method: "PUT",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody(data)
    });
    return handleResponse(res);
  },

  async deleteTeam(team_id) {
    const res = await fetch(`${API_BASE}/organizer/teams/${encodeURIComponent(team_id)}`, {
      method: "DELETE",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Organizer: Questions
  async getQuestions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.level) params.append("level", filters.level);
    if (filters.category) params.append("category", filters.category);
    if (filters.difficulty) params.append("difficulty", filters.difficulty);
    if (filters.search) params.append("search", filters.search);

    const res = await fetch(`${API_BASE}/organizer/questions?${params.toString()}`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async createQuestion(data) {
    const res = await fetch(`${API_BASE}/organizer/questions`, {
      method: "POST",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody(data)
    });
    return handleResponse(res);
  },

  async updateQuestion(id, data) {
    const res = await fetch(`${API_BASE}/organizer/questions/${id}`, {
      method: "PUT",
      headers: { ...getAuthHeader(), "Content-Type": "application/json" },
      body: jsonBody(data)
    });
    return handleResponse(res);
  },

  async deleteQuestion(id) {
    const res = await fetch(`${API_BASE}/organizer/questions/${id}`, {
      method: "DELETE",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async duplicateQuestion(id) {
    const res = await fetch(`${API_BASE}/organizer/questions/${id}/duplicate`, {
      method: "POST",
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  async importQuestions(formData) {
    const res = await fetch(`${API_BASE}/organizer/questions/import`, {
      method: "POST",
      headers: getAuthHeader(),
      body: formData
    });
    return handleResponse(res);
  },

  // Leaderboard (Private)
  async getLeaderboard() {
    const res = await fetch(`${API_BASE}/leaderboard`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  },

  // Audit Logs
  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/organizer/audit-logs`, {
      headers: getAuthHeader()
    });
    return handleResponse(res);
  }
};

function jsonBody(obj) {
  return JSON.stringify(obj);
}

async function handleResponse(res) {
  let text = "";
  try {
    text = await res.text();
  } catch (_) {
    text = "";
  }

  // Check if server returned HTML (common when VITE_API_URL is missing on Vercel, or Render service is sleeping/502)
  const isHtml = text.includes("<!DOCTYPE") || text.includes("<html") || text.includes("<head");

  if (!res.ok) {
    let errorDetail = `Request failed (${res.status} ${res.statusText || ""})`.trim();
    if (isHtml) {
      if (res.status === 404) {
        errorDetail = "API endpoint not found (404). Please ensure VITE_API_URL is set to your Render backend URL in Vercel.";
      } else if (res.status === 502 || res.status === 503) {
        errorDetail = "Backend is waking up on Render (free tier cold start). Please wait ~30 seconds and try again.";
      } else {
        errorDetail = `Backend service error (${res.status}). Please check your Render backend logs.`;
      }
    } else if (text) {
      try {
        const errJson = JSON.parse(text);
        errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
      } catch (_) {
        errorDetail = text.length > 200 ? text.substring(0, 200) + "..." : text;
      }
    }
    const err = new Error(errorDetail);
    err.status = res.status;
    throw err;
  }

  // Even if res.ok is true, if response is HTML (Vercel SPA rewrite fallback for missing API)
  if (isHtml) {
    throw new Error(
      "Received HTML instead of API response. Please set VITE_API_URL to your Render backend URL in Vercel Project Settings."
    );
  }

  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}
