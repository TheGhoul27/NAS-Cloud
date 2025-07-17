from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    password_hash: str = Field(max_length=255)
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    storage_quota: int = Field(default=5_000_000_000)  # 5GB in bytes
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    files: List["File"] = Relationship(back_populates="user")


class File(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="file.id")
    name: str = Field(max_length=255)
    path: str = Field(max_length=1000)  # Absolute path on NAS
    mime_type: str = Field(max_length=100)
    size: int = Field(default=0)
    is_folder: bool = Field(default=False)
    is_starred: bool = Field(default=False)
    is_shared: bool = Field(default=False)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None)
    
    # Full-text search
    search_vector: Optional[str] = Field(default=None)
    
    # Relationships
    user: User = Relationship(back_populates="files")
    parent: Optional["File"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "File.id"}
    )
    children: List["File"] = Relationship(back_populates="parent")
    photo_extra: Optional["PhotoExtra"] = Relationship(back_populates="file")


class PhotoExtra(SQLModel, table=True):
    file_id: int = Field(primary_key=True, foreign_key="file.id")
    taken_at: Optional[datetime] = Field(default=None)
    camera_make: Optional[str] = Field(default=None, max_length=100)
    camera_model: Optional[str] = Field(default=None, max_length=100)
    width: Optional[int] = Field(default=None)
    height: Optional[int] = Field(default=None)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    altitude: Optional[float] = Field(default=None)
    
    # AI-generated tags and faces
    ai_tags: Optional[Dict[str, Any]] = Field(default=None)
    faces: Optional[List[Dict[str, Any]]] = Field(default=None)
    
    # Processing status
    thumbnails_generated: bool = Field(default=False)
    ai_processed: bool = Field(default=False)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    file: File = Relationship(back_populates="photo_extra")


class ShareLink(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    file_id: int = Field(foreign_key="file.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(unique=True, max_length=64)
    
    # Permissions
    can_view: bool = Field(default=True)
    can_download: bool = Field(default=True)
    can_upload: bool = Field(default=False)
    
    # Expiration
    expires_at: Optional[datetime] = Field(default=None)
    max_downloads: Optional[int] = Field(default=None)
    download_count: int = Field(default=0)
    
    # Password protection
    password_hash: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)


class UploadSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    filename: str = Field(max_length=255)
    file_size: int
    chunk_size: int
    total_chunks: int
    uploaded_chunks: int = Field(default=0)
    temp_path: str = Field(max_length=1000)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
