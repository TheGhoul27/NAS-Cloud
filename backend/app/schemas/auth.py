from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.database import UserRole, UserStatus

class UserCreate(BaseModel):
    email: str
    password: str
    firstname: str
    lastname: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: Optional[int]
    email: str
    firstname: str
    lastname: str
    phone: Optional[str]
    storage_id: str
    role: UserRole
    status: UserStatus
    created_at: datetime
    approved_at: Optional[datetime]
    is_active: bool

class UserListResponse(BaseModel):
    id: int
    email: str
    firstname: str
    lastname: str
    phone: Optional[str]
    role: UserRole
    status: UserStatus
    created_at: datetime
    approved_at: Optional[datetime]
    is_active: bool

class UserApprovalRequest(BaseModel):
    user_id: int
    action: str  # "approve" or "reject"

class UserPasswordChange(BaseModel):
    user_id: int
    new_password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
