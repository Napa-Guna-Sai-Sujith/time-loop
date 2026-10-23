import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from backend.database import Base, engine
from backend.seed_data import seed_database
from backend.routers import (
    auth_routes,
    organizer_routes,
    leaderboard_routes,
    player_routes,
    websocket_routes
)

load_dotenv()

app = FastAPI(
    title="LOOP — Complete Editable Team Competition Platform",
    description="Futuristic time-based team tournament platform with organizer-controlled gameplay, question editing, and private leaderboard.",
    version="2.0.0"
)

# CORS configuration for development and production (supports Vercel, Render, and localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_routes.router)
app.include_router(organizer_routes.router)
app.include_router(leaderboard_routes.router)
app.include_router(player_routes.router)
app.include_router(websocket_routes.router)

@app.on_event("startup")
def on_startup():
    print("[INFO] Initializing LOOP platform database...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    print("[OK] LOOP Backend successfully initialized and ready!")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "LOOP", "version": "2.0.0"}

# Serve frontend build if dist folder exists, otherwise return API status
dist_dir = Path(__file__).resolve().parent.parent / "client" / "dist"
if dist_dir.exists() and (dist_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=dist_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Allow API and WS routes to pass
        if full_path.startswith("api") or full_path.startswith("ws"):
            return None
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    def root_status():
        return {
            "status": "online",
            "service": "LOOP Backend API",
            "version": "2.0.0",
            "health": "/api/health",
            "docs": "/docs"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
