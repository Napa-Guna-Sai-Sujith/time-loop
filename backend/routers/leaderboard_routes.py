import csv
import io
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Organizer, EventSettings, Team, TeamLevelState
from backend.schemas import LeaderboardResponse, LeaderboardEntry
from backend.auth import get_current_organizer

# Leaderboard routes: Public viewing for teammates & participants, authenticated export for organizers
router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])

@router.get("", response_model=LeaderboardResponse)
def get_leaderboard(
    db: Session = Depends(get_db)
):
    settings = db.query(EventSettings).first()
    event_status = settings.status if settings else "LOBBY"

    teams = db.query(Team).all()

    # Sort rankings:
    # 1. Non-eliminated first, eliminated last
    # 2. Escaped / Finalist prioritized
    # 3. Higher level, higher score, then lower total time as tie-breaker
    def sort_key(t: Team):
        is_elim = 1 if t.status == "ELIMINATED" else 0
        is_esc = 0 if t.status in ["ESCAPED", "QUALIFIED_FINAL"] else 1
        return (is_elim, is_esc, -t.current_level, -t.total_score, t.total_time_seconds)

    sorted_teams = sorted(teams, key=sort_key)

    rankings = []
    for idx, t in enumerate(sorted_teams):
        rank = idx + 1
        if t.final_rank is not None and t.is_qualified:
            rank = t.final_rank

        strikes = t.proctor_strikes or 0
        chances = max(0, 3 - strikes)

        rankings.append(LeaderboardEntry(
            rank=rank,
            team_id=t.team_id,
            team_name=t.team_name,
            avatar=t.avatar,
            department=t.department,
            current_level=t.current_level,
            status=t.status,
            questions_solved=t.total_questions_solved,
            tokens_used=t.total_tokens_used,
            total_time_seconds=round(t.total_time_seconds, 1),
            total_score=round(t.total_score, 2),
            is_qualified=t.is_qualified,
            proctor_strikes=strikes,
            proctor_chances=chances,
            eliminated_by_proctor=t.eliminated_by_proctor or False,
            created_at=t.created_at,
            last_active_at=t.last_active_at
        ))

    total_teams = len(teams)
    active_teams = sum(1 for t in teams if t.status == "ACTIVE")
    eliminated_teams = sum(1 for t in teams if t.status == "ELIMINATED")
    escaped_teams = sum(1 for t in teams if t.status in ["ESCAPED", "QUALIFIED_FINAL"])

    return LeaderboardResponse(
        event_status=event_status,
        total_teams=total_teams,
        active_teams=active_teams,
        eliminated_teams=eliminated_teams,
        escaped_teams=escaped_teams,
        rankings=rankings
    )

@router.get("/export")
def export_leaderboard_csv(
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Rank", "Team ID", "Team Name", "Department", "Current Level",
        "Status", "Questions Solved", "Tokens Used", "Total Time (s)",
        "Total Score", "Qualified for Final", "Last Active At"
    ])

    teams = db.query(Team).all()
    sorted_teams = sorted(
        teams,
        key=lambda t: (
            1 if t.status == "ELIMINATED" else 0,
            0 if t.status in ["ESCAPED", "QUALIFIED_FINAL"] else 1,
            -t.current_level,
            -t.total_score,
            t.total_time_seconds
        )
    )

    for idx, t in enumerate(sorted_teams):
        writer.writerow([
            idx + 1, t.team_id, t.team_name, t.department, t.current_level,
            t.status, t.total_questions_solved, t.total_tokens_used,
            round(t.total_time_seconds, 1), round(t.total_score, 2),
            "YES" if t.is_qualified else "NO", t.last_active_at.isoformat()
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=loop_leaderboard_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
