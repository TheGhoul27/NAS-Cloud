from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from contextlib import asynccontextmanager
from app.api.auth import router as auth_router
from app.api.files import router as files_router
from app.api.admin import router as admin_router
from app.models.database import create_db_and_tables
from app.services.trash_cleanup import trash_cleanup_service
import os
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    trash_cleanup_service.start_background_cleanup()
    yield
    # Shutdown
    trash_cleanup_service.stop_background_cleanup()


app = FastAPI(
    title="NAS Cloud API", 
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - read from environment or use development defaults
allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173"
).split(",")

allow_all_cors = os.getenv("CORS_ALLOW_ALL", "false").lower() in ("1", "true", "yes")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if allow_all_cors else allowed_origins,
    allow_origin_regex=".*" if allow_all_cors else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# Frontend paths (single-image container and local dev compatibility)
frontend_root = os.getenv(
    "FRONTEND_DIST_ROOT",
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
)
drive_dist_path = os.path.join(frontend_root, "dist-drive")
photos_dist_path = os.path.join(frontend_root, "dist-photos")
legacy_dist_path = os.path.join(frontend_root, "dist")


def _serve_spa(dist_path: str, request_path: str):
    normalized_path = (request_path or "").lstrip("/")
    file_path = os.path.join(dist_path, normalized_path)
    if normalized_path and os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)

    index_path = os.path.join(dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return {"error": "Frontend not built"}


has_drive_frontend = os.path.exists(drive_dist_path)
has_photos_frontend = os.path.exists(photos_dist_path)
has_legacy_frontend = os.path.exists(legacy_dist_path)

if has_drive_frontend:
    drive_assets_path = os.path.join(drive_dist_path, "assets")
    if os.path.exists(drive_assets_path):
        app.mount("/drive/assets", StaticFiles(directory=drive_assets_path), name="drive-assets")

    @app.get("/drive")
    @app.get("/drive/{path:path}")
    async def serve_drive(path: str = ""):
        return _serve_spa(drive_dist_path, path)

if has_photos_frontend:
    photos_assets_path = os.path.join(photos_dist_path, "assets")
    if os.path.exists(photos_assets_path):
        app.mount("/photos/assets", StaticFiles(directory=photos_assets_path), name="photos-assets")

    @app.get("/photos")
    @app.get("/photos/{path:path}")
    async def serve_photos(path: str = ""):
        return _serve_spa(photos_dist_path, path)

if has_legacy_frontend:
    legacy_assets_path = os.path.join(legacy_dist_path, "assets")
    if os.path.exists(legacy_assets_path):
        app.mount("/assets", StaticFiles(directory=legacy_assets_path), name="assets")

    @app.get("/app")
    @app.get("/app/{path:path}")
    async def serve_legacy(path: str = ""):
        return _serve_spa(legacy_dist_path, path)


@app.get("/")
def read_root():
    if has_drive_frontend:
        return RedirectResponse(url="/drive")
    if has_photos_frontend:
        return RedirectResponse(url="/photos")
    if has_legacy_frontend:
        return RedirectResponse(url="/app")
    return {"message": "NAS Cloud API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "NAS Cloud API"}
