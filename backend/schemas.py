from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth Schemas ---
class OrganizerLoginRequest(BaseModel):
    username: str
    password: str

class OrganizerResponse(BaseModel):
    id: int
    username: str

class OrganizerPasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class TeamRegisterRequest(BaseModel):
    team_name: str
    team_id: Optional[str] = None
    password: str
    avatar: Optional[str] = "⚡"
    department: Optional[str] = "Computer Science & Engg"

class TeamLoginRequest(BaseModel):
    team_id: str
    password: str

class TeamUpdateRequest(BaseModel):
    team_name: Optional[str] = None
    new_password: Optional[str] = None
    is_active: Optional[bool] = None
    department: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None
    current_level: Optional[int] = None
    tokens_remaining: Optional[int] = None
    total_score: Optional[float] = None
    is_qualified: Optional[bool] = None

class TeamResponse(BaseModel):
    id: int
    team_id: str
    team_name: str
    avatar: str
    department: str
    is_active: bool
    current_level: int
    tokens_remaining: int
    status: str
    total_questions_solved: int
    total_tokens_used: int
    total_time_seconds: float
    total_score: float
    final_rank: Optional[int] = None
    is_qualified: bool
    created_at: datetime
    last_active_at: datetime

    class Config:
        from_attributes = True

# --- Question Schemas ---
class QuestionCreate(BaseModel):
    custom_id: Optional[str] = None
    level: int = Field(ge=1, le=5)
    category: str
    difficulty: str = "Intermediate"
    type: str = "mcq" # mcq, code_output, debugging
    question_text: str
    code_snippet: Optional[str] = None
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None
    is_active: bool = True

class QuestionUpdate(BaseModel):
    level: Optional[int] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    type: Optional[str] = None
    question_text: Optional[str] = None
    code_snippet: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    is_active: Optional[bool] = None

class QuestionResponse(BaseModel):
    id: int
    custom_id: str
    level: int
    category: str
    difficulty: str
    type: str
    question_text: str
    code_snippet: Optional[str] = None
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Player safe view - NEVER reveals correct_answer or explanation ahead of time
class QuestionPlayerView(BaseModel):
    id: int
    custom_id: str
    level: int
    category: str
    difficulty: str
    type: str
    question_text: str
    code_snippet: Optional[str] = None
    options: List[str]
    question_number: int
    total_questions: int = 6
    remaining_seconds: int
    question_results: Optional[List[str]] = None
    attempt_number: int = 1
    level_solved_count: int = 0
    level_target: int = 6

# --- Gameplay Schemas ---
class AnswerSubmitRequest(BaseModel):
    answer: str

class AnswerSubmitResponse(BaseModel):
    correct: bool
    message: str
    status: str # "NEXT_QUESTION", "QUESTION_REPLACED", "LEVEL_CLEARED", "TIMEOUT", "ELIMINATED", "ESCAPED"
    explanation: Optional[str] = None
    next_question: Optional[QuestionPlayerView] = None
    tokens_remaining: int
    current_level: int
    total_score: float
    team: Optional[Dict[str, Any]] = None
    remaining_seconds: Optional[int] = None
    question_number: Optional[int] = None
    total_questions: Optional[int] = None
    question_results: Optional[List[str]] = None
    attempt_number: Optional[int] = None
    level_solved_count: Optional[int] = None
    level_target: Optional[int] = None

class TimeoutRequest(BaseModel):
    pass

# --- Event Settings ---
class EventSettingsResponse(BaseModel):
    title: str
    tagline: str
    status: str
    level_names: Dict[str, str]
    questions_per_attempt: int
    timer_duration_seconds: int
    starting_tokens: int
    category_distribution: Dict[str, int]
    score_weight_q: float
    score_weight_t: float
    score_weight_time: float
    min_teams_to_start: int
    registration_open: bool
    show_explanations: bool
    final_stage_open: bool
    started_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None

class EventSettingsUpdate(BaseModel):
    title: Optional[str] = None
    tagline: Optional[str] = None
    level_names: Optional[Dict[str, str]] = None
    questions_per_attempt: Optional[int] = None
    timer_duration_seconds: Optional[int] = None
    starting_tokens: Optional[int] = None
    category_distribution: Optional[Dict[str, int]] = None
    score_weight_q: Optional[float] = None
    score_weight_t: Optional[float] = None
    score_weight_time: Optional[float] = None
    min_teams_to_start: Optional[int] = None
    registration_open: Optional[bool] = None
    show_explanations: Optional[bool] = None
    final_stage_open: Optional[bool] = None

# --- Leaderboard ---
class LeaderboardEntry(BaseModel):
    rank: int
    team_id: str
    team_name: str
    avatar: str
    department: str
    current_level: int
    status: str
    questions_solved: int
    tokens_used: int
    total_time_seconds: float
    total_score: float
    is_qualified: bool
    last_active_at: datetime

class LeaderboardResponse(BaseModel):
    event_status: str
    total_teams: int
    active_teams: int
    eliminated_teams: int
    escaped_teams: int
    rankings: List[LeaderboardEntry]
