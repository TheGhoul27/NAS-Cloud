from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.models.database import get_session, User
from app.auth.dependencies import get_current_user, get_current_user_storage
from app.services.storage import storage_service

router = APIRouter(prefix="/files", tags=["files"])

@router.get("/storage-info")
async def get_storage_info(
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Get current user's storage information"""
    storage_size = storage_service.get_user_storage_size(current_user.storage_id)
    
    return {
        "user_id": current_user.id,
        "storage_id": current_user.storage_id,
        "email": current_user.email,
        "storage_paths": storage_paths,
        "storage_size_bytes": storage_size,
        "storage_size_mb": round(storage_size / (1024 * 1024), 2)
    }
