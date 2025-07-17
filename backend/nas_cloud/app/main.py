from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from pathlib import Path

from nas_cloud.app.api.auth import router as auth_router
from nas_cloud.app.api.files import router as files_router
from nas_cloud.app.api.photos import router as photos_router
from nas_cloud.app.database import init_db
from nas_cloud.app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


# Create FastAPI app
app = FastAPI(
    title="NAS-Cloud API",
    description="A Python-first personal cloud solution",
    version="1.0.0",
    lifespan=lifespan,
)

# Get settings
settings = get_settings()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(files_router, prefix="/api/files", tags=["files"])
app.include_router(photos_router, prefix="/api/photos", tags=["photos"])

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Serve static files for frontend
frontend_dist = Path(__file__).parent.parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    # Fallback for development
    @app.get("/")
    async def read_root():
        return {"message": "NAS-Cloud API is running. Frontend not built yet."}

# Catch-all route for SPA
@app.get("/{path:path}")
async def catch_all(request: Request, path: str):
    """Catch-all route for SPA routing"""
    if path.startswith("api/"):
        return {"error": "API endpoint not found"}
    
    # Serve index.html for SPA routes
    if frontend_dist.exists():
        return FileResponse(str(frontend_dist / "index.html"))
    else:
        return {"message": "Frontend not built yet"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
