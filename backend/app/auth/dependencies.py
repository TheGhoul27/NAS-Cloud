from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from app.models.database import get_session, User
from app.auth.auth import verify_token
from app.services.storage import storage_service
from typing import Optional

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        email = verify_token(credentials.credentials, credentials_exception)
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if user is None:
            raise credentials_exception
        
        return user
    except Exception:
        raise credentials_exception

def get_user_storage_paths(user: User) -> dict:
    """Get storage paths for a user"""
    return storage_service.get_user_paths(user.storage_id)

async def get_current_user_storage(
    user: User = Depends(get_current_user)
) -> dict:
    """Get current user's storage paths"""
    return get_user_storage_paths(user)
