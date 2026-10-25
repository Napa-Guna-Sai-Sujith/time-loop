import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from backend.database import Base

class Organizer(Base):
    __tablename__ = "organizers"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class EventSettings(Base):
    __tablename__ = "event_settings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), default="LOOP")
    tagline = Column(String(255), default="Every Second Counts. Every Answer Saves the Timeline.")
    status = Column(String(50), default="LOBBY") # LOBBY, RUNNING, PAUSED, ENDED
    level_names = Column(Text, default='{"1": "Level 1", "2": "Level 2", "3": "Level 3", "4": "Level 4", "5": "The Final"}')
    questions_per_attempt = Column(Integer, default=6)
    timer_duration_seconds = Column(Integer, default=900) # 15 minutes
    starting_tokens = Column(Integer, default=3)
    category_distribution = Column(Text, default='{"Mathematics": 1, "Logical Reasoning": 1, "Aptitude": 1, "Python Coding": 1, "Debugging": 1, "DSA Concept MCQs": 1}')
    score_weight_q = Column(Float, default=10.0)
    score_weight_t = Column(Float, default=5.0)
    score_weight_time = Column(Float, default=1.0)
    min_teams_to_start = Column(Integer, default=1)
    registration_open = Column(Boolean, default=True)
    show_explanations = Column(Boolean, default=True)
    final_stage_open = Column(Boolean, default=False)
    proctor_enabled = Column(Boolean, default=True)
    max_teams_limit = Column(Integer, default=20)
    started_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(String(100), unique=True, nullable=False, index=True)
    team_name = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(String(50), default="⚡")
    department = Column(String(100), default="Computer Science & Engg")
    is_active = Column(Boolean, default=True)
    current_level = Column(Integer, default=1) # 1..5
    tokens_remaining = Column(Integer, default=3)
    status = Column(String(50), default="WAITING") # WAITING, ACTIVE, PAUSED, ELIMINATED, ESCAPED, QUALIFIED_FINAL
    total_questions_solved = Column(Integer, default=0)
    total_tokens_used = Column(Integer, default=0)
    total_time_seconds = Column(Float, default=0.0)
    total_score = Column(Float, default=0.0)
    final_rank = Column(Integer, nullable=True)
    is_qualified = Column(Boolean, default=False)
    proctor_strikes = Column(Integer, default=0)
    eliminated_by_proctor = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.datetime.utcnow)

    level_states = relationship("TeamLevelState", back_populates="team", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String(100), unique=True, nullable=False, index=True)
    level = Column(Integer, nullable=False, index=True) # 1..5
    category = Column(String(100), nullable=False, index=True)
    difficulty = Column(String(50), default="Intermediate")
    type = Column(String(50), default="mcq") # mcq, code_output, debugging
    question_text = Column(Text, nullable=False)
    code_snippet = Column(Text, nullable=True)
    options = Column(Text, nullable=False) # JSON list
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TeamLevelState(Base):
    __tablename__ = "team_level_states"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    level = Column(Integer, nullable=False)
    attempt_number = Column(Integer, default=1)
    tokens_remaining = Column(Integer, default=3)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    active_question_ids = Column(Text, default="[]") # JSON list of Question IDs currently assigned
    current_question_index = Column(Integer, default=0) # 0..5
    solved_question_ids = Column(Text, default="[]") # JSON list of solved Question IDs
    time_spent_seconds = Column(Float, default=0.0)
    is_completed = Column(Boolean, default=False)
    is_failed = Column(Boolean, default=False)

    team = relationship("Team", back_populates="level_states")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    actor = Column(String(100), default="Organizer")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
