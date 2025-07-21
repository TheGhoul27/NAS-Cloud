from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.auth import router as auth_router
from app.api.files import router as files_router
from app.api.admin import router as admin_router
from app.models.database import create_db_and_tables
from app.services.trash_cleanup import trash_cleanup_service
import os
import sys

app = FastAPI(title="NAS Cloud API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for packaged app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers FIRST before static file serving
app.include_router(auth_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# Determine static files path
if getattr(sys, 'frozen', False):
    # Running as compiled executable - PyInstaller sets _MEIPASS
    static_path = os.path.join(getattr(sys, '_MEIPASS', ''), 'static')
else:
    # Running in development
    static_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'dist')

# Serve React static files if they exist
if os.path.exists(static_path):
    # Mount static assets (CSS, JS, etc.)
    static_assets_path = os.path.join(static_path, 'assets')
    if os.path.exists(static_assets_path):
        app.mount("/assets", StaticFiles(directory=static_assets_path), name="assets")
    
    # Serve specific static files
    @app.get("/vite.svg")
    async def serve_vite_svg():
        file_path = os.path.join(static_path, 'vite.svg')
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return {"error": "Not found"}
    
    @app.get("/favicon.ico")
    async def serve_favicon():
        file_path = os.path.join(static_path, 'favicon.ico')
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return {"error": "Not found"}
    
    @app.get("/robots.txt")
    async def serve_robots():
        file_path = os.path.join(static_path, 'robots.txt')
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return {"error": "Not found"}
    
    @app.get("/manifest.json")
    async def serve_manifest():
        file_path = os.path.join(static_path, 'manifest.json')
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return {"error": "Not found"}
    
    # Serve React app for all non-API routes (catch-all route)
    @app.get("/{path:path}")
    async def serve_react(path: str):
        # Don't serve React for API routes
        if path.startswith('api/'):
            return {"error": "Not found"}
        
        # Handle specific static files
        if path in ['favicon.ico', 'robots.txt', 'manifest.json', 'vite.svg']:
            file_path = os.path.join(static_path, path)
            if os.path.exists(file_path):
                return FileResponse(file_path)
        
        # For any other path, check if file exists as static file
        file_path = os.path.join(static_path, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # For SPA routing (404s), always return index.html
        return FileResponse(os.path.join(static_path, 'index.html'))

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Start the background trash cleanup service
    trash_cleanup_service.start_background_cleanup()

@app.on_event("shutdown")
def on_shutdown():
    # Stop the background trash cleanup service
    trash_cleanup_service.stop_background_cleanup()

@app.get("/")
def read_root():
    return {"message": "NAS Cloud API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
