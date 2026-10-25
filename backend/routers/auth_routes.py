from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Organizer, Team, EventSettings, AuditLog
from backend.schemas import (
    OrganizerLoginRequest, OrganizerResponse, OrganizerPasswordChange,
    TeamRegisterRequest, TeamLoginRequest, TeamResponse
)
from backend.auth import (
    verify_password, hash_password, create_access_token,
    get_current_organizer, get_current_team
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# --- Organizer Auth ---

@router.post("/organizer/login")
def organizer_login(payload: OrganizerLoginRequest, response: Response, db: Session = Depends(get_db)):
    org = db.query(Organizer).filter(Organizer.username == payload.username.strip()).first()
    if not org or not verify_password(payload.password, org.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid organizer username or passcode.",
        )

    token = create_access_token(data={"sub": org.username, "role": "organizer"})
    response.set_cookie(
        key="loop_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400
    )

    # Log action
    audit = AuditLog(action="ORGANIZER_LOGIN", details=f"Organizer '{org.username}' logged in.", actor=org.username)
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "token": token,
        "organizer": {"id": org.id, "username": org.username}
    }

@router.post("/organizer/logout")
def organizer_logout(response: Response):
    response.delete_cookie("loop_session")
    return {"success": True, "message": "Organizer logged out successfully."}

@router.get("/organizer/me")
def organizer_me(org: Organizer = Depends(get_current_organizer)):
    return {"id": org.id, "username": org.username}

@router.put("/organizer/change-password")
def organizer_change_password(
    payload: OrganizerPasswordChange,
    org: Organizer = Depends(get_current_organizer),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.current_password, org.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect.")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")
    if len(payload.new_password) < 3:
        raise HTTPException(status_code=400, detail="Password must be at least 3 characters.")

    org.password_hash = hash_password(payload.new_password)
    audit = AuditLog(action="ORGANIZER_PASSWORD_CHANGED", details="Organizer credentials updated.", actor=org.username)
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Organizer credentials updated successfully."}

# --- Team / Player Auth ---

@router.get("/team/next-id")
def get_next_team_id(db: Session = Depends(get_db)):
    """Generates the next sequential unique Team ID (e.g. TEAM-01, TEAM-02)."""
    existing_teams = db.query(Team.team_id).all()
    existing_ids = {t[0].upper() for t in existing_teams}
    num = 1
    while True:
        candidate = f"TEAM-{num:02d}"
        if candidate not in existing_ids:
            return {"next_team_id": candidate}
        num += 1

@router.post("/team/register", response_model=TeamResponse)
def team_register(payload: TeamRegisterRequest, response: Response, db: Session = Depends(get_db)):
    settings = db.query(EventSettings).first()
    if settings and not settings.registration_open:
        raise HTTPException(status_code=400, detail="Registration is currently closed by the event organizer.")

    max_limit = settings.max_teams_limit if (settings and settings.max_teams_limit) else 20
    current_team_count = db.query(Team).count()
    if current_team_count >= max_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Registration full! Team capacity of {max_limit} teams has been reached. Please contact the tournament organizer."
        )

    clean_name = payload.team_name.strip()
    if not clean_name or not payload.password:
        raise HTTPException(status_code=400, detail="Team name and password are required.")

    existing_teams = db.query(Team).all()
    existing_ids = {t.team_id.upper() for t in existing_teams}
    existing_names = {t.team_name.lower() for t in existing_teams}

    if clean_name.lower() in existing_names:
        raise HTTPException(status_code=400, detail="A team with this Name already exists.")

    if payload.team_id and payload.team_id.strip():
        clean_id = payload.team_id.strip().upper()
        if clean_id in existing_ids:
            num = 1
            while f"TEAM-{num:02d}" in existing_ids:
                num += 1
            clean_id = f"TEAM-{num:02d}"
    else:
        num = 1
        while f"TEAM-{num:02d}" in existing_ids:
            num += 1
        clean_id = f"TEAM-{num:02d}"

    new_team = Team(
        team_id=clean_id,
        team_name=clean_name,
        password_hash=hash_password(payload.password),
        avatar=payload.avatar or "⚡",
        department=payload.department or "Computer Science & Engg",
        is_active=True,
        current_level=1,
        tokens_remaining=settings.starting_tokens if settings else 3,
        status="WAITING"
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    # Log registration in Audit Log with full timestamp
    audit = AuditLog(
        action="TEAM_REGISTERED",
        details=f"Team '{new_team.team_name}' ({new_team.team_id}) registered. Dept: {new_team.department}.",
        actor=new_team.team_name
    )
    db.add(audit)
    db.commit()

    token = create_access_token(data={"sub": new_team.team_id, "role": "team"})
    response.set_cookie(
        key="loop_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400
    )

    return new_team

@router.post("/team/login")
def team_login(payload: TeamLoginRequest, response: Response, db: Session = Depends(get_db)):
    clean_id = payload.team_id.strip().upper()
    team = db.query(Team).filter(Team.team_id == clean_id).first()

    if not team or not verify_password(payload.password, team.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Team ID or password."
        )

    if not team.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This team account has been disabled by the organizer."
        )

    token = create_access_token(data={"sub": team.team_id, "role": "team"})
    response.set_cookie(
        key="loop_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400
    )

    return {
        "success": True,
        "token": token,
        "team": {
            "id": team.id,
            "team_id": team.team_id,
            "team_name": team.team_name,
            "avatar": team.avatar,
            "department": team.department,
            "status": team.status,
            "current_level": team.current_level,
            "tokens_remaining": team.tokens_remaining
        }
    }

@router.post("/team/logout")
def team_logout(response: Response):
    response.delete_cookie("loop_session")
    return {"success": True, "message": "Team logged out successfully."}

@router.get("/team/me", response_model=TeamResponse)
def team_me(team: Team = Depends(get_current_team)):
    return team
