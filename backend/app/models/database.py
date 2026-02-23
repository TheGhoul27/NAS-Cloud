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

class DriveStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"

class StorageDrive(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)  # User-friendly name like "Drive 1", "Main Storage"
    path: str = Field(unique=True)  # Absolute path to the drive root
    capacity_gb: Optional[float] = Field(default=None)  # Total capacity in GB
    description: Optional[str] = Field(default=None)
    status: DriveStatus = Field(default=DriveStatus.ACTIVE)
    is_default: bool = Field(default=False)  # Default drive for new users
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    
class StorageSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    setting_key: str = Field(unique=True, index=True)
    setting_value: str
    description: Optional[str] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    firstname: str
    lastname: str
    phone: Optional[str] = Field(default=None)
    storage_id: str = Field(unique=True, index=True)  # Unique folder identifier
    storage_drive_id: Optional[int] = Field(default=None, foreign_key="storagedrive.id")  # Which drive user is on
    storage_quota_gb: float = Field(default=20.0)  # Allocated storage cap per user
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

    # Lightweight migration for older databases that predate storage_quota_gb
    try:
        with engine.begin() as conn:
            if engine.dialect.name == "sqlite":
                column_rows = conn.exec_driver_sql('PRAGMA table_info("user")').fetchall()
                columns = [row[1] for row in column_rows]
                if "storage_quota_gb" not in columns:
                    conn.exec_driver_sql('ALTER TABLE "user" ADD COLUMN storage_quota_gb FLOAT DEFAULT 20.0')
                conn.exec_driver_sql('UPDATE "user" SET storage_quota_gb = 20.0 WHERE storage_quota_gb IS NULL')
            else:
                conn.exec_driver_sql('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS storage_quota_gb DOUBLE PRECISION DEFAULT 20.0')
                conn.exec_driver_sql('UPDATE "user" SET storage_quota_gb = 20.0 WHERE storage_quota_gb IS NULL')
    except Exception:
        pass
    
    # Initialize default settings and drives after tables are created
    try:
        from app.services.storage import storage_service
        # Force initialization now that tables exist
        storage_service._ensure_initialized()
    except Exception as e:
        pass  # Storage service initialization can be deferred

def get_session():
    with Session(engine) as session:
        yield session
