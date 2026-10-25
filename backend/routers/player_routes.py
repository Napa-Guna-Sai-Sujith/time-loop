import json
import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Team, Question, EventSettings, TeamLevelState, AuditLog
from backend.schemas import QuestionPlayerView, AnswerSubmitRequest, AnswerSubmitResponse, ProctorViolationRequest
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
            "is_qualified": team.is_qualified,
            "proctor_strikes": team.proctor_strikes or 0,
            "proctor_chances": max(0, 3 - (team.proctor_strikes or 0)),
            "eliminated_by_proctor": team.eliminated_by_proctor or False
        },
        "proctor_enabled": settings.proctor_enabled if (settings and settings.proctor_enabled is not None) else True,
        "active_question": active_question,
        "current_question": active_question,
        "remaining_seconds": active_question.remaining_seconds if active_question else (settings.timer_duration_seconds if settings else 900),
        "tokens": team.tokens_remaining,
        "question_number": active_question.question_number if active_question else 1,
        "total_questions": active_question.total_questions if active_question else (settings.questions_per_attempt if settings else 6),
        "question_results": active_question.question_results if active_question else None,
        "attempt_number": active_question.attempt_number if active_question else 1,
        "level_solved_count": active_question.level_solved_count if active_question else 0,
        "level_target": active_question.level_target if active_question else 6
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
        total_questions=next_q.total_questions if next_q else None,
        question_results=next_q.question_results if next_q else None,
        attempt_number=next_q.attempt_number if next_q else None,
        level_solved_count=result.get("level_solved_count", next_q.level_solved_count if next_q else 0),
        level_target=result.get("level_target", next_q.level_target if next_q else 6)
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
        "is_qualified": team.is_qualified,
        "proctor_strikes": team.proctor_strikes or 0,
        "proctor_chances": max(0, 3 - (team.proctor_strikes or 0)),
        "eliminated_by_proctor": team.eliminated_by_proctor or False
    }

    return result

@router.post("/proctor-violation")
async def report_proctor_violation(
    payload: ProctorViolationRequest,
    team: Team = Depends(get_current_team),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings or not settings.proctor_enabled:
        return {"ignored": True, "message": "Proctoring is disabled globally."}

    if team.status in ["ELIMINATED", "ESCAPED"]:
        return {"ignored": True, "status": team.status}

    team.proctor_strikes = (team.proctor_strikes or 0) + 1
    chances_remaining = max(0, 3 - team.proctor_strikes)
    is_eliminated = team.proctor_strikes >= 3

    if is_eliminated:
        team.status = "ELIMINATED"
        team.eliminated_by_proctor = True

    audit = AuditLog(
        action="PROCTOR_DISQUALIFIED" if is_eliminated else "PROCTOR_VIOLATION",
        details=f"Team '{team.team_name}' violation '{payload.violation_type}'. Strike {team.proctor_strikes}/3. {chances_remaining} chances remaining. {payload.details or ''}".strip(),
        actor=team.team_name
    )
    db.add(audit)
    db.commit()

    # Broadcast update to organizers so private leaderboard and audit reflects in real time
    await ws_manager.broadcast_organizers("proctor_strike_logged", {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "strikes": team.proctor_strikes,
        "chances_remaining": chances_remaining,
        "violation": payload.violation_type,
        "is_eliminated": is_eliminated
    })
    await ws_manager.broadcast_all("leaderboard_update", {})

    return {
        "success": True,
        "strikes": team.proctor_strikes,
        "chances_remaining": chances_remaining,
        "is_eliminated": is_eliminated,
        "message": f"Proctor Strike {team.proctor_strikes}/3 recorded. {chances_remaining} chances remaining." if not is_eliminated else "You have exhausted all 3 proctor chances and are disqualified."
    }
