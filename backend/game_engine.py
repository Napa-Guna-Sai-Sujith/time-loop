import json
import random
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.models import Team, Question, TeamLevelState, EventSettings, AuditLog
from backend.schemas import QuestionPlayerView

def get_or_create_level_state(db: Session, team: Team, settings: EventSettings) -> TeamLevelState:
    """Retrieves current active level state or initializes a new attempt with questions matching the category distribution."""
    state = (
        db.query(TeamLevelState)
        .filter(
            TeamLevelState.team_id == team.id,
            TeamLevelState.level == team.current_level,
            TeamLevelState.is_completed == False,
            TeamLevelState.is_failed == False
        )
        .order_by(TeamLevelState.attempt_number.desc())
        .first()
    )

    if not state:
        # Generate initial fresh attempt for this level
        duration = settings.timer_duration_seconds or 900
        now = datetime.datetime.utcnow()
        expires_at = now + datetime.timedelta(seconds=duration)

        question_ids = select_questions_for_attempt(db, team.current_level, settings)

        state = TeamLevelState(
            team_id=team.id,
            level=team.current_level,
            attempt_number=1,
            tokens_remaining=team.tokens_remaining,
            started_at=now,
            expires_at=expires_at,
            active_question_ids=json.dumps(question_ids),
            current_question_index=0,
            solved_question_ids=json.dumps([]),
            time_spent_seconds=0.0,
            is_completed=False,
            is_failed=False
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    return state

def select_questions_for_attempt(db: Session, level: int, settings: EventSettings, exclude_ids: List[int] = None) -> List[int]:
    """Selects 6 questions matching the organizer's category distribution."""
    if exclude_ids is None:
        exclude_ids = []

    cat_dist = {}
    try:
        if settings.category_distribution:
            cat_dist = json.loads(settings.category_distribution)
    except Exception:
        pass

    if not cat_dist:
        cat_dist = {
            "Mathematics": 1,
            "Logical Reasoning": 1,
            "Aptitude": 1,
            "Python Coding": 1,
            "Debugging": 1,
            "DSA Concept MCQs": 1
        }

    selected_ids = []
    # For each category according to distribution
    for category, count in cat_dist.items():
        if count <= 0:
            continue
        candidates = (
            db.query(Question.id)
            .filter(
                Question.level == level,
                Question.category == category,
                Question.is_active == True,
                ~Question.id.in_(exclude_ids + selected_ids)
            )
            .all()
        )
        candidate_ids = [c[0] for c in candidates]
        
        # If not enough unseen candidates, allow any active question in this category/level
        if len(candidate_ids) < count:
            fallback = (
                db.query(Question.id)
                .filter(
                    Question.level == level,
                    Question.category == category,
                    Question.is_active == True,
                    ~Question.id.in_(selected_ids)
                )
                .all()
            )
            candidate_ids = [c[0] for c in fallback]

        sample_count = min(count, len(candidate_ids))
        if sample_count > 0:
            picked = random.sample(candidate_ids, sample_count)
            selected_ids.extend(picked)

    # If still fewer than questions_per_attempt (e.g. 6), backfill with any active questions in this level
    needed = settings.questions_per_attempt - len(selected_ids)
    if needed > 0:
        extras = (
            db.query(Question.id)
            .filter(
                Question.level == level,
                Question.is_active == True,
                ~Question.id.in_(selected_ids)
            )
            .all()
        )
        extra_ids = [e[0] for e in extras]
        if extra_ids:
            picked_extras = random.sample(extra_ids, min(needed, len(extra_ids)))
            selected_ids.extend(picked_extras)

    # In case the level has very few questions, allow repeat as last resort
    if len(selected_ids) < settings.questions_per_attempt:
        all_q = db.query(Question.id).filter(Question.level == level, Question.is_active == True).all()
        all_ids = [a[0] for a in all_q]
        while len(selected_ids) < settings.questions_per_attempt and all_ids:
            selected_ids.append(random.choice(all_ids))

    # Jumble selected questions using random shuffle so every team receives a randomized sequence!
    random.shuffle(selected_ids)
    return selected_ids[:settings.questions_per_attempt]

def get_current_question_view(db: Session, team: Team, settings: EventSettings) -> Optional[QuestionPlayerView]:
    """Returns the question player view for the team's active question, calculating real remaining time."""
    state = get_or_create_level_state(db, team, settings)
    
    # Check if timer expired
    now = datetime.datetime.utcnow()
    remaining = 0
    if state.expires_at:
        remaining = max(0, int((state.expires_at - now).total_seconds()))

    if remaining <= 0 and state.attempt_number > 0 and not state.is_completed:
        # Automatically handle timeout
        return handle_timeout(db, team, settings)

    q_ids = json.loads(state.active_question_ids or "[]")
    idx = state.current_question_index
    if idx >= len(q_ids):
        return None

    qid = q_ids[idx]
    q = db.query(Question).filter(Question.id == qid).first()
    if not q:
        return None

    options = []
    try:
        raw_opts = json.loads(q.options)
        if isinstance(raw_opts, list):
            options = list(raw_opts)
            # Deterministically jumble options for this specific team, question, and attempt
            # so team members or adjacent teams cannot look at each other's ABCD buttons
            rng = random.Random(f"opt_salt_{team.id}_{q.id}_{state.attempt_number}")
            rng.shuffle(options)
    except Exception:
        options = []

    return QuestionPlayerView(
        id=q.id,
        custom_id=q.custom_id,
        level=q.level,
        category=q.category,
        difficulty=q.difficulty,
        type=q.type,
        question_text=q.question_text,
        code_snippet=q.code_snippet,
        options=options,
        question_number=idx + 1,
        total_questions=len(q_ids),
        remaining_seconds=remaining
    )

def submit_team_answer(db: Session, team: Team, answer_text: str, settings: EventSettings) -> Dict[str, Any]:
    """Validates submitted answer, handles immediate replacement on error or advance on correct."""
    state = get_or_create_level_state(db, team, settings)
    now = datetime.datetime.utcnow()

    # Verify if expired
    remaining = max(0, int((state.expires_at - now).total_seconds())) if state.expires_at else 0
    if remaining <= 0:
        return handle_timeout(db, team, settings, return_dict=True)

    q_ids = json.loads(state.active_question_ids or "[]")
    idx = state.current_question_index
    if idx >= len(q_ids):
        return {"correct": False, "status": "INVALID", "message": "No active question."}

    current_qid = q_ids[idx]
    question = db.query(Question).filter(Question.id == current_qid).first()
    if not question:
        return {"correct": False, "status": "INVALID", "message": "Question not found."}

    is_correct = (answer_text.strip().lower() == question.correct_answer.strip().lower())
    explanation = question.explanation if settings.show_explanations else None

    if is_correct:
        team.total_questions_solved += 1
        solved_ids = json.loads(state.solved_question_ids or "[]")
        if current_qid not in solved_ids:
            solved_ids.append(current_qid)
        state.solved_question_ids = json.dumps(solved_ids)

        # Check if completed all 6 questions in this level
        if idx + 1 >= len(q_ids):
            # LEVEL CLEARED!
            state.is_completed = True
            time_spent = (now - state.started_at).total_seconds()
            state.time_spent_seconds = time_spent
            team.total_time_seconds += time_spent

            # Discard unused tokens & award fresh 3 tokens for next level
            team.tokens_remaining = settings.starting_tokens

            if team.current_level >= 4:
                # Conquered regular levels!
                team.status = "ESCAPED"
                team.total_score = calculate_team_score(team, settings)
                db.commit()
                return {
                    "correct": True,
                    "message": "TIMELINE SECURED! You have completed all 4 levels and conquered the TIME LOOP!",
                    "status": "ESCAPED",
                    "explanation": explanation,
                    "next_question": None,
                    "tokens_remaining": team.tokens_remaining,
                    "current_level": team.current_level,
                    "total_score": team.total_score
                }
            else:
                # Advance to next level
                team.current_level += 1
                team.total_score = calculate_team_score(team, settings)
                db.commit()

                # Start fresh level attempt
                next_q = get_current_question_view(db, team, settings)
                return {
                    "correct": True,
                    "message": f"You saved the timeline by solving this question! Warping to Level {team.current_level}...",
                    "status": "LEVEL_CLEARED",
                    "explanation": explanation,
                    "next_question": next_q,
                    "tokens_remaining": team.tokens_remaining,
                    "current_level": team.current_level,
                    "total_score": team.total_score
                }
        else:
            # Advance to next question in current level
            state.current_question_index += 1
            team.total_score = calculate_team_score(team, settings)
            db.commit()

            next_q = get_current_question_view(db, team, settings)
            return {
                "correct": True,
                "message": "You saved the timeline by solving this question!",
                "status": "NEXT_QUESTION",
                "explanation": explanation,
                "next_question": next_q,
                "tokens_remaining": team.tokens_remaining,
                "current_level": team.current_level,
                "total_score": team.total_score
            }
    else:
        # INCORRECT: Deduct 2 minutes 30 seconds (150 seconds) penalty from the continuous level countdown timer.
        if state.expires_at:
            state.expires_at = state.expires_at - datetime.timedelta(seconds=150)
            db.commit()

        # Check if completed all 6 questions in this level
        if idx + 1 >= len(q_ids):
            state.is_completed = True
            time_spent = (now - state.started_at).total_seconds()
            state.time_spent_seconds = time_spent
            team.total_time_seconds += time_spent

            team.tokens_remaining = settings.starting_tokens

            if team.current_level >= 4:
                team.status = "ESCAPED"
                team.total_score = calculate_team_score(team, settings)
                db.commit()
                return {
                    "correct": False,
                    "message": "Level completed! Conquered all 4 levels!",
                    "status": "ESCAPED",
                    "explanation": explanation,
                    "next_question": None,
                    "tokens_remaining": team.tokens_remaining,
                    "current_level": team.current_level,
                    "total_score": team.total_score,
                    "time_penalty_applied": 150
                }
            else:
                team.current_level += 1
                team.total_score = calculate_team_score(team, settings)
                db.commit()

                next_q = get_current_question_view(db, team, settings)
                return {
                    "correct": False,
                    "message": f"Incorrect answer (-2m 30s penalty). Warping to Level {team.current_level}...",
                    "status": "LEVEL_CLEARED",
                    "explanation": explanation,
                    "next_question": next_q,
                    "tokens_remaining": team.tokens_remaining,
                    "current_level": team.current_level,
                    "total_score": team.total_score,
                    "time_penalty_applied": 150
                }
        else:
            # Advance to next question in current level
            state.current_question_index += 1
            team.total_score = calculate_team_score(team, settings)
            db.commit()

            next_q = get_current_question_view(db, team, settings)
            return {
                "correct": False,
                "message": "Incorrect answer: -2 min 30 sec penalty deducted. Advancing to next question...",
                "status": "NEXT_QUESTION",
                "explanation": explanation,
                "next_question": next_q,
                "tokens_remaining": team.tokens_remaining,
                "current_level": team.current_level,
                "total_score": team.total_score,
                "time_penalty_applied": 150
            }

def find_replacement_question(db: Session, original_q: Question, exclude_ids: List[int]) -> Optional[Question]:
    """Finds a replacement question testing the same category and similar difficulty."""
    # First priority: same category, same difficulty, active, not in exclude_ids
    candidates = (
        db.query(Question)
        .filter(
            Question.level == original_q.level,
            Question.category == original_q.category,
            Question.difficulty == original_q.difficulty,
            Question.is_active == True,
            ~Question.id.in_(exclude_ids)
        )
        .all()
    )
    if candidates:
        return random.choice(candidates)

    # Second priority: same category, any difficulty in this level
    candidates = (
        db.query(Question)
        .filter(
            Question.level == original_q.level,
            Question.category == original_q.category,
            Question.is_active == True,
            ~Question.id.in_(exclude_ids)
        )
        .all()
    )
    if candidates:
        return random.choice(candidates)

    # Third priority: any active question in this level not currently active
    candidates = (
        db.query(Question)
        .filter(
            Question.level == original_q.level,
            Question.is_active == True,
            ~Question.id.in_(exclude_ids)
        )
        .all()
    )
    if candidates:
        return random.choice(candidates)
    return original_q

def handle_timeout(db: Session, team: Team, settings: EventSettings, return_dict: bool = False) -> Any:
    """Handles 15-minute timer expiration: deducts 1 token, gives fresh set of 6 questions if tokens remain, or eliminates."""
    state = (
        db.query(TeamLevelState)
        .filter(
            TeamLevelState.team_id == team.id,
            TeamLevelState.level == team.current_level,
            TeamLevelState.is_completed == False,
            TeamLevelState.is_failed == False
        )
        .order_by(TeamLevelState.attempt_number.desc())
        .first()
    )

    if state:
        state.is_failed = True
        time_spent = settings.timer_duration_seconds or 900
        state.time_spent_seconds = time_spent
        team.total_time_seconds += time_spent

    # Deduct 1 token
    team.tokens_remaining -= 1
    team.total_tokens_used += 1

    if team.tokens_remaining <= 0:
        # ALL TOKENS LOST -> ELIMINATION
        team.status = "ELIMINATED"
        team.tokens_remaining = 0
        team.total_score = calculate_team_score(team, settings)
        db.commit()

        res_data = {
            "correct": False,
            "message": "All tokens lost. Your team has vanished from the timeline.",
            "status": "ELIMINATED",
            "next_question": None,
            "tokens_remaining": 0,
            "current_level": team.current_level,
            "total_score": team.total_score
        }
        return res_data if return_dict else None
    else:
        # TOKENS REMAIN: Generate fresh set of 6 questions & new attempt
        now = datetime.datetime.utcnow()
        duration = settings.timer_duration_seconds or 900
        expires_at = now + datetime.timedelta(seconds=duration)
        attempt_num = (state.attempt_number + 1) if state else 2

        fresh_qids = select_questions_for_attempt(db, team.current_level, settings)

        new_state = TeamLevelState(
            team_id=team.id,
            level=team.current_level,
            attempt_number=attempt_num,
            tokens_remaining=team.tokens_remaining,
            started_at=now,
            expires_at=expires_at,
            active_question_ids=json.dumps(fresh_qids),
            current_question_index=0,
            solved_question_ids=json.dumps([]),
            time_spent_seconds=0.0,
            is_completed=False,
            is_failed=False
        )
        db.add(new_state)
        team.total_score = calculate_team_score(team, settings)
        db.commit()

        next_q = get_current_question_view(db, team, settings)
        res_data = {
            "correct": False,
            "message": f"Time expired! 1 token deducted. Fresh attempt started ({team.tokens_remaining} tokens remain).",
            "status": "TIMEOUT",
            "next_question": next_q,
            "tokens_remaining": team.tokens_remaining,
            "current_level": team.current_level,
            "total_score": team.total_score
        }
        return res_data if return_dict else next_q

def calculate_team_score(team: Team, settings: EventSettings) -> float:
    """Calculates team score: Score = (10 * Q) - (5 * T) - (t / 60)"""
    w_q = settings.score_weight_q if settings.score_weight_q is not None else 10.0
    w_t = settings.score_weight_t if settings.score_weight_t is not None else 5.0
    w_time = settings.score_weight_time if settings.score_weight_time is not None else 1.0

    q_points = w_q * team.total_questions_solved
    t_penalty = w_t * team.total_tokens_used
    time_penalty = (team.total_time_seconds / 60.0) * w_time

    score = q_points - t_penalty - time_penalty
    return round(max(0.0, score), 2)
