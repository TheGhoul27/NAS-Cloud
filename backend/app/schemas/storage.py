from pydantic import BaseModel
from typing import Optional, List
from app.models.database import DriveStatus
from datetime import datetime

class DriveCreate(BaseModel):
    name: str
    path: str
    capacity_gb: Optional[float] = None
    description: Optional[str] = None

class DriveUpdate(BaseModel):
    name: Optional[str] = None
    capacity_gb: Optional[float] = None
    description: Optional[str] = None
    status: Optional[DriveStatus] = None

class DriveResponse(BaseModel):
    id: int
    name: str
    path: str
    capacity_gb: Optional[float]
    description: Optional[str]
    status: DriveStatus
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime]

class DriveUsageResponse(BaseModel):
    drive_id: int
    drive_name: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    user_count: int
    path: str

class DriveListResponse(BaseModel):
    drives: List[DriveResponse]
    total: int

class StorageOverviewResponse(BaseModel):
    total_drives: int
    active_drives: int
    total_users: int
    total_storage_gb: float
    used_storage_gb: float
    drives: List[DriveUsageResponse]

class UserMigrationRequest(BaseModel):
    user_id: int
    target_drive_id: int
    delete_source: bool = False
