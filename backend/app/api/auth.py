from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, desc
from app.models.database import get_session, User, UserStatus, UserRole
from app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, Token
)
from app.auth.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token
)
from app.auth.dependencies import get_current_user
from app.services.storage import storage_service
from typing import List
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, session: Session = Depends(get_session)):
    # Check if user already exists
    statement = select(User).where(User.email == user.email)
    existing_user = session.exec(statement).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate unique storage ID
    storage_id = storage_service.generate_user_id()
    
    # Ensure storage_id is unique (very unlikely collision but better safe)
    while True:
        statement = select(User).where(User.storage_id == storage_id)
        existing_storage = session.exec(statement).first()
        if not existing_storage:
            break
        storage_id = storage_service.generate_user_id()
    
    # Get default drive for new user
    default_drive = storage_service.get_default_drive()
    storage_drive_id = default_drive.id if default_drive else None
    
    # Create new user with pending status (will be approved by admin)
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        firstname=user.firstname,
        lastname=user.lastname,
        phone=user.phone,
        storage_id=storage_id,
        storage_drive_id=storage_drive_id,
        status=UserStatus.PENDING,  # Set to pending for admin approval
        role=UserRole.USER  # Set role to user by default
    )
    
    session.add(db_user)
    
    try:
        session.commit()
        session.refresh(db_user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )
    
    return UserResponse(
        id=db_user.id,
        email=db_user.email,
        firstname=db_user.firstname,
        lastname=db_user.lastname,
        phone=db_user.phone,
        storage_id=db_user.storage_id,
        role=db_user.role,
        status=db_user.status,
        created_at=db_user.created_at,
        approved_at=db_user.approved_at,
        is_active=db_user.is_active
    )

@router.post("/login", response_model=Token)
async def login(user: UserLogin, session: Session = Depends(get_session)):
    # Find user by email
    statement = select(User).where(User.email == user.email)
    db_user = session.exec(statement).first()
    
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": db_user.email})
    refresh_token = create_refresh_token(data={"sub": db_user.email})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        firstname=current_user.firstname,
        lastname=current_user.lastname,
        phone=current_user.phone,
        storage_id=current_user.storage_id,
        role=current_user.role,
        status=current_user.status,
        created_at=current_user.created_at,
        approved_at=current_user.approved_at,
        is_active=current_user.is_active
    )
