from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.models.database import get_session, User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from app.auth.auth import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token
)
from app.services.storage import storage_service

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
    
    # Create user storage folders
    try:
        storage_paths = storage_service.create_user_storage(storage_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user storage: {str(e)}"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        password_hash=hashed_password,
        storage_id=storage_id
    )
    
    session.add(db_user)
    
    try:
        session.commit()
        session.refresh(db_user)
    except Exception as e:
        # If database commit fails, clean up the created storage
        storage_service.delete_user_storage(storage_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )
    
    return UserResponse(
        id=db_user.id,
        email=db_user.email,
        storage_id=db_user.storage_id,
        created_at=db_user.created_at,
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
