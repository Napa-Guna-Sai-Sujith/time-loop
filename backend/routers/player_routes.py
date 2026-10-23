import json
import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Team, Question, EventSettings, TeamLevelState
from backend.schemas import QuestionPlayerView, AnswerSubmitRequest, AnswerSubmitResponse
from backend.auth import get_current_team
from backend.game_engine import (
    get_or_create_level_state,
    get_current_question_view,
    submit_team_answer,
    handle_timeout
)
from backend.routers.websocket_routes import ws_manager

router = APIRouter(prefix="/api/player", tags=["Player Gameplay"])

@router.get("/state")
def get_player_state(
    team: Team = Depends(get_current_team),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    event_status = settings.status if settings else "LOBBY"

    team.last_active_at = datetime.datetime.utcnow()
    db.commit()

    # Check if Level 5 final restrictions apply
    if team.current_level == 5:
        if not settings or not settings.final_stage_open or not team.is_qualified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Level 5 (The Final) is reserved exclusively for the Top 3 qualified teams once authorized by the organizer."
            )

    if event_status == "RUNNING" and team.status == "WAITING":
        team.status = "ACTIVE"
        team.current_level = 1
        team.tokens_remaining = settings.starting_tokens if settings else 3
        db.commit()

    active_question = None
    if event_status == "RUNNING" and team.status in ["ACTIVE", "QUALIFIED_FINAL"]:
        active_question = get_current_question_view(db, team, settings)

    return {
        "event_status": event_status,
        "team": {
            "id": team.id,
            "team_id": team.team_id,
            "team_name": team.team_name,
            "avatar": team.avatar,
            "department": team.department,
            "current_level": team.current_level,
            "tokens_remaining": team.tokens_remaining,
            "status": team.status,
            "total_questions_solved": team.total_questions_solved,
            "total_score": team.total_score,
            "is_qualified": team.is_qualified
        },
        "active_question": active_question,
        "current_question": active_question,
        "remaining_seconds": active_question.remaining_seconds if active_question else (settings.timer_duration_seconds if settings else 900),
        "tokens": team.tokens_remaining,
        "question_number": active_question.question_number if active_question else 1,
        "total_questions": active_question.total_questions if active_question else (settings.questions_per_attempt if settings else 6)
    }

@router.post("/submit-answer", response_model=AnswerSubmitResponse)
async def submit_answer(
    payload: AnswerSubmitRequest,
    team: Team = Depends(get_current_team),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings or settings.status != "RUNNING":
        raise HTTPException(status_code=400, detail="Event is not currently active.")

    if team.status in ["ELIMINATED", "ESCAPED"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit: team status is {team.status}.")

    result = submit_team_answer(db, team, payload.answer, settings)

    # Broadcast live status update to organizers so private leaderboard reflects real-time scores
    await ws_manager.broadcast_organizers("team_progress_update", {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "status": team.status,
        "level": team.current_level,
        "score": team.total_score,
        "questions_solved": team.total_questions_solved,
        "tokens_remaining": team.tokens_remaining
    })

    team_dict = {
        "id": team.id,
        "team_id": team.team_id,
        "team_name": team.team_name,
        "avatar": team.avatar,
        "department": team.department,
        "current_level": team.current_level,
        "tokens_remaining": team.tokens_remaining,
        "status": team.status,
        "total_questions_solved": team.total_questions_solved,
        "total_score": team.total_score,
        "is_qualified": team.is_qualified
    }

    next_q = result.get("next_question")

    return AnswerSubmitResponse(
        correct=result["correct"],
        message=result["message"],
        status=result["status"],
        explanation=result.get("explanation"),
        next_question=next_q,
        tokens_remaining=result["tokens_remaining"],
        current_level=result["current_level"],
        total_score=result["total_score"],
        team=team_dict,
        remaining_seconds=next_q.remaining_seconds if next_q else None,
        question_number=next_q.question_number if next_q else None,
        total_questions=next_q.total_questions if next_q else None
    )

@router.post("/timeout")
async def trigger_timeout(
    team: Team = Depends(get_current_team),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings or settings.status != "RUNNING":
        raise HTTPException(status_code=400, detail="Event is not currently running.")

    result = handle_timeout(db, team, settings, return_dict=True)

    await ws_manager.broadcast_organizers("team_progress_update", {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "status": team.status,
        "level": team.current_level,
        "score": team.total_score,
        "questions_solved": team.total_questions_solved,
        "tokens_remaining": team.tokens_remaining
    })

    result["team"] = {
        "id": team.id,
        "team_id": team.team_id,
        "team_name": team.team_name,
        "avatar": team.avatar,
        "department": team.department,
        "current_level": team.current_level,
        "tokens_remaining": team.tokens_remaining,
        "status": team.status,
        "total_questions_solved": team.total_questions_solved,
        "total_score": team.total_score,
        "is_qualified": team.is_qualified
    }

    return result
