import json
import csv
import io
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Organizer, EventSettings, Team, Question, TeamLevelState, AuditLog
from backend.schemas import (
    EventSettingsResponse, EventSettingsUpdate,
    QuestionCreate, QuestionUpdate, QuestionResponse,
    TeamResponse, TeamUpdateRequest
)
from backend.auth import get_current_organizer, hash_password
from backend.routers.websocket_routes import ws_manager
from backend.seed_data import QUESTIONS_BANK

router = APIRouter(prefix="/api/organizer", tags=["Organizer Management"])

# --- Event Statistics ---

@router.get("/stats")
def get_organizer_stats(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    teams = db.query(Team).all()

    total_teams = len(teams)
    active_teams = sum(1 for t in teams if t.status == "ACTIVE")
    waiting_teams = sum(1 for t in teams if t.status == "WAITING")
    eliminated_teams = sum(1 for t in teams if t.status == "ELIMINATED")
    escaped_teams = sum(1 for t in teams if t.status in ["ESCAPED", "QUALIFIED_FINAL"])

    level_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for t in teams:
        if t.status in ["ACTIVE", "WAITING"] and t.current_level in level_counts:
            level_counts[t.current_level] += 1

    question_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for lvl in range(1, 6):
        question_counts[lvl] = db.query(Question).filter(Question.level == lvl, Question.is_active == True).count()

    return {
        "event_status": settings.status if settings else "LOBBY",
        "title": settings.title if settings else "LOOP",
        "total_teams": total_teams,
        "active_teams": active_teams,
        "waiting_teams": waiting_teams,
        "eliminated_teams": eliminated_teams,
        "escaped_teams": escaped_teams,
        "level_counts": level_counts,
        "question_counts": question_counts,
        "final_stage_open": settings.final_stage_open if settings else False
    }

# --- Event Settings & Category Distribution ---

@router.get("/settings", response_model=EventSettingsResponse)
def get_event_settings(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found.")

    level_names = json.loads(settings.level_names or "{}")
    cat_dist = json.loads(settings.category_distribution or "{}")

    return EventSettingsResponse(
        title=settings.title,
        tagline=settings.tagline,
        status=settings.status,
        level_names=level_names,
        questions_per_attempt=settings.questions_per_attempt,
        timer_duration_seconds=settings.timer_duration_seconds,
        starting_tokens=settings.starting_tokens,
        category_distribution=cat_dist,
        score_weight_q=settings.score_weight_q,
        score_weight_t=settings.score_weight_t,
        score_weight_time=settings.score_weight_time,
        min_teams_to_start=settings.min_teams_to_start,
        registration_open=settings.registration_open,
        show_explanations=settings.show_explanations,
        final_stage_open=settings.final_stage_open,
        started_at=settings.started_at,
        paused_at=settings.paused_at
    )

@router.put("/settings")
async def update_event_settings(
    payload: EventSettingsUpdate,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found.")

    for field, val in payload.dict(exclude_unset=True).items():
        if field == "level_names" and val is not None:
            settings.level_names = json.dumps(val)
        elif field == "category_distribution" and val is not None:
            # Validate total equals questions_per_attempt
            total_cat = sum(val.values())
            target = payload.questions_per_attempt or settings.questions_per_attempt
            if total_cat != target:
                raise HTTPException(
                    status_code=400,
                    detail=f"Category question counts must sum exactly to {target} (currently sums to {total_cat})."
                )
            settings.category_distribution = json.dumps(val)
        else:
            setattr(settings, field, val)

    audit = AuditLog(action="SETTINGS_UPDATED", details="Organizer updated event settings.", actor=org.username)
    db.add(audit)
    db.commit()

    await ws_manager.broadcast_all("settings_updated", {"title": settings.title, "status": settings.status})
    return {"success": True, "message": "Event settings updated successfully."}

# --- Game Controls (Organizer Sole Control) ---

@router.post("/start-game")
async def start_game(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found.")

    teams = db.query(Team).filter(Team.is_active == True).all()
    min_required = settings.min_teams_to_start or 1
    if len(teams) < min_required:
        raise HTTPException(
            status_code=400,
            detail=f"At least {min_required} active team(s) required to start (currently {len(teams)} joined)."
        )

    # Validate that Level 1 has enough questions
    l1_count = db.query(Question).filter(Question.level == 1, Question.is_active == True).count()
    if l1_count < settings.questions_per_attempt:
        raise HTTPException(
            status_code=400,
            detail=f"Level 1 must have at least {settings.questions_per_attempt} active questions (currently {l1_count})."
        )

    # Activate teams and game
    settings.status = "RUNNING"
    if not settings.started_at:
        settings.started_at = datetime.datetime.utcnow()
    settings.paused_at = None

    for t in teams:
        if t.status in ["WAITING", "PAUSED"]:
            t.status = "ACTIVE"
            if t.current_level < 1:
                t.current_level = 1
            if t.tokens_remaining <= 0:
                t.tokens_remaining = settings.starting_tokens

    audit = AuditLog(action="START_GAME", details="Organizer triggered START GAME.", actor=org.username)
    db.add(audit)
    db.commit()

    # Broadcast event activation across all connected devices
    await ws_manager.broadcast_all("game_started", {
        "status": "RUNNING",
        "started_at": settings.started_at.isoformat()
    })

    return {"success": True, "message": "LOOP tournament activated! Level 1 started for all teams."}

@router.post("/pause-game")
async def pause_game(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings or settings.status != "RUNNING":
        raise HTTPException(status_code=400, detail="Game is not currently running.")

    settings.status = "PAUSED"
    settings.paused_at = datetime.datetime.utcnow()

    audit = AuditLog(action="PAUSE_GAME", details="Organizer paused the competition.", actor=org.username)
    db.add(audit)
    db.commit()

    await ws_manager.broadcast_all("game_paused", {"status": "PAUSED"})
    return {"success": True, "message": "Competition paused."}

@router.post("/resume-game")
async def resume_game(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if not settings or settings.status != "PAUSED":
        raise HTTPException(status_code=400, detail="Game is not paused.")

    settings.status = "RUNNING"
    settings.paused_at = None

    audit = AuditLog(action="RESUME_GAME", details="Organizer resumed the competition.", actor=org.username)
    db.add(audit)
    db.commit()

    await ws_manager.broadcast_all("game_resumed", {"status": "RUNNING"})
    return {"success": True, "message": "Competition resumed."}

@router.post("/reset-game")
async def reset_game(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    if settings:
        settings.status = "LOBBY"
        settings.started_at = None
        settings.paused_at = None
        settings.final_stage_open = False

    # Delete all attempt states
    db.query(TeamLevelState).delete()

    # Reset teams
    teams = db.query(Team).all()
    for t in teams:
        t.status = "WAITING"
        t.current_level = 1
        t.tokens_remaining = settings.starting_tokens if settings else 3
        t.total_questions_solved = 0
        t.total_tokens_used = 0
        t.total_time_seconds = 0.0
        t.total_score = 0.0
        t.final_rank = None
        t.is_qualified = False

    audit = AuditLog(action="RESET_GAME", details="Organizer reset game progress to Lobby.", actor=org.username)
    db.add(audit)
    db.commit()

    await ws_manager.broadcast_all("event_reset", {"status": "LOBBY"})
    return {"success": True, "message": "Tournament progress reset to Lobby."}

@router.post("/purge-database")
async def purge_database(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    """Completely purges all teams, level attempts, audit logs, and restores default question bank."""
    db.query(TeamLevelState).delete()
    db.query(Team).delete()
    db.query(AuditLog).delete()

    # Restore default questions
    db.query(Question).delete()
    for q_data in QUESTIONS_BANK:
        q = Question(
            custom_id=q_data["custom_id"],
            level=q_data["level"],
            category=q_data["category"],
            difficulty=q_data.get("difficulty", "Intermediate"),
            type=q_data.get("type", "mcq"),
            question_text=q_data["question_text"],
            code_snippet=q_data.get("code_snippet"),
            options=json.dumps(q_data["options"]),
            correct_answer=q_data["correct_answer"],
            explanation=q_data.get("explanation"),
            is_active=True
        )
        db.add(q)

    settings = db.query(EventSettings).first()
    if settings:
        settings.status = "LOBBY"
        settings.started_at = None
        settings.paused_at = None
        settings.final_stage_open = False

    db.commit()

    await ws_manager.broadcast_all("database_purged", {})
    return {"success": True, "message": "Database completely wiped and factory reset!"}

@router.post("/open-final")
async def open_final_round(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    """Finalizes Top 3 teams and unlocks Level 5 (The Final) strictly for them."""
    settings = db.query(EventSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found.")

    # Rank all non-eliminated teams by total_score desc, total_time_seconds asc
    eligible_teams = (
        db.query(Team)
        .filter(Team.status != "ELIMINATED")
        .order_by(Team.total_score.desc(), Team.total_time_seconds.asc())
        .all()
    )

    if not eligible_teams:
        raise HTTPException(status_code=400, detail="No eligible teams available to qualify.")

    top_3 = eligible_teams[:3]
    for idx, t in enumerate(top_3):
        t.final_rank = idx + 1
        t.is_qualified = True
        t.current_level = 5 # Level 5 Final
        t.status = "QUALIFIED_FINAL"
        t.tokens_remaining = settings.starting_tokens

    settings.final_stage_open = True

    audit = AuditLog(
        action="OPEN_FINAL",
        details=f"Final stage opened for Top 3 teams: {[t.team_name for t in top_3]}",
        actor=org.username
    )
    db.add(audit)
    db.commit()

    await ws_manager.broadcast_all("final_round_opened", {
        "finalists": [{"team_id": t.team_id, "team_name": t.team_name, "rank": t.final_rank} for t in top_3]
    })

    return {
        "success": True,
        "message": f"Final round unlocked for Top 3 teams: {', '.join(t.team_name for t in top_3)}!",
        "finalists": [{"team_id": t.team_id, "team_name": t.team_name, "rank": t.final_rank} for t in top_3]
    }

# --- Question Management (CRUD, Import, Export) ---

@router.get("/questions", response_model=List[QuestionResponse])
def list_questions(
    level: Optional[int] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    query = db.query(Question)
    if level is not None:
        query = query.filter(Question.level == level)
    if category:
        query = query.filter(Question.category == category)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Question.question_text.ilike(s)) | (Question.custom_id.ilike(s)))

    questions = query.order_by(Question.level.asc(), Question.id.asc()).all()

    # Parse options JSON for schema response
    result = []
    for q in questions:
        opts = []
        try:
            opts = json.loads(q.options)
        except Exception:
            pass
        result.append(QuestionResponse(
            id=q.id,
            custom_id=q.custom_id,
            level=q.level,
            category=q.category,
            difficulty=q.difficulty,
            type=q.type,
            question_text=q.question_text,
            code_snippet=q.code_snippet,
            options=opts,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            is_active=q.is_active,
            created_at=q.created_at
        ))
    return result

@router.post("/questions", response_model=QuestionResponse)
def create_question(
    payload: QuestionCreate,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    custom_id = payload.custom_id
    if not custom_id:
        custom_id = f"Q-L{payload.level}-{datetime.datetime.utcnow().strftime('%M%S%f')[:6]}"

    # Verify unique custom_id
    if db.query(Question).filter(Question.custom_id == custom_id).first():
        custom_id = f"{custom_id}-{datetime.datetime.utcnow().strftime('%f')[:4]}"

    q = Question(
        custom_id=custom_id,
        level=payload.level,
        category=payload.category,
        difficulty=payload.difficulty,
        type=payload.type,
        question_text=payload.question_text,
        code_snippet=payload.code_snippet,
        options=json.dumps(payload.options),
        correct_answer=payload.correct_answer,
        explanation=payload.explanation,
        is_active=payload.is_active
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    return QuestionResponse(
        id=q.id,
        custom_id=q.custom_id,
        level=q.level,
        category=q.category,
        difficulty=q.difficulty,
        type=q.type,
        question_text=q.question_text,
        code_snippet=q.code_snippet,
        options=payload.options,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        is_active=q.is_active,
        created_at=q.created_at
    )

@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    for field, val in payload.dict(exclude_unset=True).items():
        if field == "options" and val is not None:
            q.options = json.dumps(val)
        elif val is not None:
            setattr(q, field, val)

    db.commit()
    db.refresh(q)

    opts = []
    try:
        opts = json.loads(q.options)
    except Exception:
        pass

    return QuestionResponse(
        id=q.id,
        custom_id=q.custom_id,
        level=q.level,
        category=q.category,
        difficulty=q.difficulty,
        type=q.type,
        question_text=q.question_text,
        code_snippet=q.code_snippet,
        options=opts,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
        is_active=q.is_active,
        created_at=q.created_at
    )

@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found.")

    db.delete(q)
    db.commit()
    return {"success": True, "message": "Question deleted successfully."}

@router.post("/questions/{question_id}/duplicate")
def duplicate_question(
    question_id: int,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    original = db.query(Question).filter(Question.id == question_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Question not found.")

    dup = Question(
        custom_id=f"{original.custom_id}-COPY-{datetime.datetime.utcnow().strftime('%S%f')[:4]}",
        level=original.level,
        category=original.category,
        difficulty=original.difficulty,
        type=original.type,
        question_text=f"{original.question_text} (Copy)",
        code_snippet=original.code_snippet,
        options=original.options,
        correct_answer=original.correct_answer,
        explanation=original.explanation,
        is_active=True
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)
    return {"success": True, "message": "Question duplicated.", "id": dup.id}

# --- Bulk CSV / JSON Question Import & Export ---

@router.get("/questions/export")
def export_questions(
    format: str = "csv",
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    questions = db.query(Question).order_by(Question.level.asc(), Question.id.asc()).all()

    if format.lower() == "json":
        data = []
        for q in questions:
            opts = []
            try:
                opts = json.loads(q.options)
            except Exception:
                pass
            data.append({
                "custom_id": q.custom_id,
                "level": q.level,
                "category": q.category,
                "difficulty": q.difficulty,
                "type": q.type,
                "question_text": q.question_text,
                "code_snippet": q.code_snippet or "",
                "options": opts,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation or "",
                "is_active": q.is_active
            })
        return data
    else:
        # CSV Export
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "custom_id", "level", "category", "difficulty", "type",
            "question_text", "code_snippet", "option_1", "option_2",
            "option_3", "option_4", "correct_answer", "explanation", "is_active"
        ])

        for q in questions:
            opts = []
            try:
                opts = json.loads(q.options)
            except Exception:
                opts = []
            opt1 = opts[0] if len(opts) > 0 else ""
            opt2 = opts[1] if len(opts) > 1 else ""
            opt3 = opts[2] if len(opts) > 2 else ""
            opt4 = opts[3] if len(opts) > 3 else ""

            writer.writerow([
                q.custom_id, q.level, q.category, q.difficulty, q.type,
                q.question_text, q.code_snippet or "", opt1, opt2, opt3, opt4,
                q.correct_answer, q.explanation or "", "true" if q.is_active else "false"
            ])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=loop_questions_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
        )

@router.get("/questions/sample-template")
def get_sample_template():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "custom_id", "level", "category", "difficulty", "type",
        "question_text", "code_snippet", "option_1", "option_2",
        "option_3", "option_4", "correct_answer", "explanation", "is_active"
    ])
    writer.writerow([
        "MATH-SAMPLE-01", "1", "Mathematics", "Intermediate", "mcq",
        "What is 2^8 - 2^7?", "", "64", "128", "256", "512",
        "128", "2^8 - 2^7 = 256 - 128 = 128", "true"
    ])
    writer.writerow([
        "PY-SAMPLE-02", "1", "Python Coding", "Intermediate", "code_output",
        "What will be printed?", "x = [i**2 for i in range(3)]\nprint(x[1])", "0", "1", "4", "9",
        "1", "range(3) produces [0, 1, 4]. Index 1 is 1.", "true"
    ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=loop_questions_template.csv"}
    )

@router.post("/questions/import")
async def import_questions(
    file: UploadFile = File(...),
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    content = await file.read()
    filename = file.filename.lower()
    imported_count = 0
    errors = []

    if filename.endswith(".json"):
        try:
            data = json.loads(content.decode("utf-8"))
            if not isinstance(data, list):
                raise ValueError("JSON root must be a list of question objects.")
            for idx, item in enumerate(data):
                try:
                    q = Question(
                        custom_id=item.get("custom_id") or f"IMP-{datetime.datetime.utcnow().strftime('%S%f')[:6]}",
                        level=int(item.get("level", 1)),
                        category=item.get("category", "General"),
                        difficulty=item.get("difficulty", "Intermediate"),
                        type=item.get("type", "mcq"),
                        question_text=item["question_text"],
                        code_snippet=item.get("code_snippet"),
                        options=json.dumps(item.get("options", [])),
                        correct_answer=item["correct_answer"],
                        explanation=item.get("explanation"),
                        is_active=item.get("is_active", True)
                    )
                    db.add(q)
                    imported_count += 1
                except Exception as row_err:
                    errors.append(f"Row {idx + 1}: {str(row_err)}")
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    elif filename.endswith(".csv"):
        try:
            stream = io.StringIO(content.decode("utf-8-sig"))
            reader = csv.DictReader(stream)
            for idx, row in enumerate(reader):
                try:
                    opts = [row.get("option_1", ""), row.get("option_2", ""), row.get("option_3", ""), row.get("option_4", "")]
                    opts = [o.strip() for o in opts if o.strip()]
                    q = Question(
                        custom_id=row.get("custom_id") or f"IMP-CSV-{idx + 1}-{datetime.datetime.utcnow().strftime('%S%f')[:4]}",
                        level=int(row.get("level", 1)),
                        category=row.get("category", "General"),
                        difficulty=row.get("difficulty", "Intermediate"),
                        type=row.get("type", "mcq"),
                        question_text=row["question_text"],
                        code_snippet=row.get("code_snippet") or None,
                        options=json.dumps(opts),
                        correct_answer=row["correct_answer"],
                        explanation=row.get("explanation") or None,
                        is_active=(row.get("is_active", "true").lower() in ["true", "1", "yes"])
                    )
                    db.add(q)
                    imported_count += 1
                except Exception as row_err:
                    errors.append(f"Row {idx + 2}: {str(row_err)}")
            db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Only .csv and .json files are supported.")

    audit = AuditLog(action="QUESTIONS_IMPORTED", details=f"Imported {imported_count} questions from {file.filename}.", actor=org.username)
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "imported_count": imported_count,
        "errors": errors
    }

# --- Team Management ---

@router.get("/teams", response_model=List[TeamResponse])
def list_teams(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    return db.query(Team).order_by(Team.created_at.asc()).all()

@router.post("/teams", response_model=TeamResponse)
def create_team_manually(
    team_name: str,
    team_id: str,
    password: str,
    department: Optional[str] = "Computer Science & Engg",
    avatar: Optional[str] = "⚡",
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    clean_id = team_id.strip().upper()
    clean_name = team_name.strip()

    if db.query(Team).filter((Team.team_id == clean_id) | (Team.team_name == clean_name)).first():
        raise HTTPException(status_code=400, detail="Team with this ID or Name already exists.")

    new_team = Team(
        team_id=clean_id,
        team_name=clean_name,
        password_hash=hash_password(password),
        department=department or "Computer Science & Engg",
        avatar=avatar or "⚡",
        is_active=True,
        current_level=1,
        tokens_remaining=settings.starting_tokens if settings else 3,
        status="WAITING"
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return new_team

@router.put("/teams/{team_id}")
def update_team(
    team_id: str,
    payload: TeamUpdateRequest,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    if payload.team_name:
        team.team_name = payload.team_name.strip()
    if payload.new_password and payload.new_password.strip():
        team.password_hash = hash_password(payload.new_password.strip())
    if payload.is_active is not None:
        team.is_active = payload.is_active
    if payload.department:
        team.department = payload.department.strip()
    if payload.avatar:
        team.avatar = payload.avatar
    if payload.status:
        team.status = payload.status
    if payload.current_level is not None:
        team.current_level = payload.current_level
    if payload.tokens_remaining is not None:
        team.tokens_remaining = payload.tokens_remaining
    if payload.total_score is not None:
        team.total_score = payload.total_score
    if payload.is_qualified is not None:
        team.is_qualified = payload.is_qualified

    db.commit()
    db.refresh(team)
    return {"success": True, "message": f"Team {team_id} updated successfully.", "team": TeamResponse.from_orm(team).dict()}

@router.delete("/teams/{team_id}")
def delete_team(
    team_id: str,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    db.delete(team)
    db.commit()
    return {"success": True, "message": f"Team {team_id} deleted."}

# --- Audit Logs ---

@router.get("/audit-logs")
def get_audit_logs(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{"id": l.id, "action": l.action, "details": l.details, "actor": l.actor, "created_at": l.created_at.isoformat()} for l in logs]
