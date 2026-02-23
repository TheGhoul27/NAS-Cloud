from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Include API routers (primary)
app.include_router(auth_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# Backward-compatible routes (legacy clients may call /auth, /files, /admin directly)
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(admin_router)

# Static files path for development
static_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist')

# Serve React static files if they exist (for production-like serving)
if os.path.exists(static_path):
    # Mount static assets (CSS, JS, etc.)
    static_assets_path = os.path.join(static_path, 'assets')
    if os.path.exists(static_assets_path):
        app.mount("/assets", StaticFiles(directory=static_assets_path), name="assets")
    
    # Serve React app for all non-API routes (SPA catch-all)
    @app.get("/{path:path}")
    async def serve_react(path: str):
        # Don't serve React for API routes
        if path.startswith('api/'):
            return {"error": "Not found"}
        
        # Check if specific file exists
        file_path = os.path.join(static_path, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # For SPA routing, always return index.html
        index_path = os.path.join(static_path, 'index.html')
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return {"error": "Frontend not built"}

@app.get("/")
def read_root():
    return {"message": "NAS Cloud API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "NAS Cloud API"}
