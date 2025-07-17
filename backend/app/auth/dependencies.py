from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from app.models.database import get_session, User, UserRole, UserStatus
from app.auth.auth import verify_token
from app.services.storage import storage_service
from typing import Optional

security = HTTPBearer(auto_error=False)

async def get_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """Extract token from Authorization header or query parameter"""
    # First try Authorization header
    if credentials and credentials.credentials:
        return credentials.credentials
    
    # Then try query parameter
    token = request.query_params.get('token')
    if token:
        return token
    
    # No token found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

async def get_current_user(
    token: str = Depends(get_token),
    session: Session = Depends(get_session)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        email = verify_token(token, credentials_exception)
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if user is None:
            raise credentials_exception
            
        # Check if user is approved
        if user.status != UserStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account pending approval"
            )
        
        return user
    except HTTPException:
        raise
    except Exception:
        raise credentials_exception

async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def get_user_storage_paths(user: User) -> dict:
    """Get storage paths for a user"""
    paths = storage_service.get_user_paths(user.storage_id)
    return paths

async def get_current_user_storage(
    user: User = Depends(get_current_user)
) -> dict:
    """Get current user's storage paths"""
    return get_user_storage_paths(user)
