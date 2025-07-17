from sqlmodel import SQLModel, Field, create_engine, Session
from datetime import datetime
from typing import Optional
from enum import Enum
import os
from dotenv import load_dotenv

load_dotenv()

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    firstname: str
    lastname: str
    phone: Optional[str] = Field(default=None)
    storage_id: str = Field(unique=True, index=True)  # Unique folder identifier
    role: UserRole = Field(default=UserRole.USER)
    status: UserStatus = Field(default=UserStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = Field(default=None)
    approved_by: Optional[int] = Field(default=None, foreign_key="user.id")  # Admin who approved
    is_active: bool = Field(default=True)

class AdminCredentials(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nas_cloud.db")

# Configure engine based on database type
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
