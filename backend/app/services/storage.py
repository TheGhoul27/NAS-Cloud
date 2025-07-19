import os
import shutil
from pathlib import Path
from typing import Optional, List, Dict
import uuid
import re
from datetime import datetime
from dotenv import load_dotenv
from sqlmodel import Session, select
from app.models.database import StorageDrive, DriveStatus, StorageSettings, engine

load_dotenv()

# Get NAS storage path from environment (fallback for legacy support)
NAS_STORAGE_PATH = os.getenv("NAS_STORAGE_PATH", "./nas_storage")

class MultiDriveStorageService:
    def __init__(self):
        self.legacy_base_path = Path(NAS_STORAGE_PATH)
        self._initialized = False
    
    def _ensure_initialized(self):
        """Ensure the service is initialized (called on first use)"""
        if not self._initialized:
            self._initialize_default_drive()
            self._initialized = True
    
    def _initialize_default_drive(self):
        """Initialize default drive if none exists"""
        try:
            with Session(engine) as session:
                # Check if any drives exist
                drives = session.exec(select(StorageDrive)).all()
                
                if not drives:
                    # Create default drive using legacy path
                    default_drive = StorageDrive(
                        name="Default Drive",
                        path=str(self.legacy_base_path.absolute()),
                        description="Default storage drive",
                        status=DriveStatus.ACTIVE,
                        is_default=True
                    )
                    session.add(default_drive)
                    session.commit()
                    
                    # Ensure the directory exists
                    self.legacy_base_path.mkdir(parents=True, exist_ok=True)
                    (self.legacy_base_path / "users").mkdir(parents=True, exist_ok=True)
        except Exception as e:
            # If tables don't exist yet, that's fine - they'll be created later
            pass
    
    def get_available_drives(self) -> List[StorageDrive]:
        """Get all active storage drives"""
        self._ensure_initialized()
        with Session(engine) as session:
            statement = select(StorageDrive).where(StorageDrive.status == DriveStatus.ACTIVE)
            return list(session.exec(statement).all())
    
    def get_default_drive(self) -> Optional[StorageDrive]:
        """Get the default storage drive"""
        self._ensure_initialized()
        with Session(engine) as session:
            statement = select(StorageDrive).where(
                StorageDrive.is_default == True,
                StorageDrive.status == DriveStatus.ACTIVE
            )
            return session.exec(statement).first()
    
    def get_drive_by_id(self, drive_id: int) -> Optional[StorageDrive]:
        """Get a drive by ID"""
        self._ensure_initialized()
        with Session(engine) as session:
            statement = select(StorageDrive).where(StorageDrive.id == drive_id)
            return session.exec(statement).first()
    
    def get_drive_usage(self, drive_id: int) -> Dict:
        """Get usage statistics for a drive"""
        self._ensure_initialized()
        drive = self.get_drive_by_id(drive_id)
        if not drive:
            return {"error": "Drive not found"}
        
        drive_path = Path(drive.path)
        if not drive_path.exists():
            return {"error": "Drive path does not exist"}
        
        try:
            # Get disk usage
            total, used, free = shutil.disk_usage(drive_path)
            
            # Count users on this drive
            users_path = drive_path / "users"
            user_count = len([d for d in users_path.iterdir() if d.is_dir()]) if users_path.exists() else 0
            
            return {
                "drive_id": drive_id,
                "drive_name": drive.name,
                "total_bytes": total,
                "used_bytes": used,
                "free_bytes": free,
                "user_count": user_count,
                "path": drive.path
            }
        except Exception as e:
            return {"error": f"Failed to get drive usage: {str(e)}"}
    
    def create_user_storage(self, user_id: str, drive_id: Optional[int] = None) -> dict:
        """
        Create the folder structure for a new user on specified drive
        Returns dict with created paths
        """
        # Get the drive to use
        if drive_id:
            drive = self.get_drive_by_id(drive_id)
        else:
            drive = self.get_default_drive()
        
        if not drive:
            raise Exception("No available storage drive found")
        
        # Create user storage on the specified drive
        drive_path = Path(drive.path)
        users_path = drive_path / "users"
        user_path = users_path / user_id
        drive_folder = user_path / "drive"
        photos_folder = user_path / "photos"
        
        # Create directories
        users_path.mkdir(parents=True, exist_ok=True)
        user_path.mkdir(parents=True, exist_ok=True)
        drive_folder.mkdir(parents=True, exist_ok=True)
        photos_folder.mkdir(parents=True, exist_ok=True)
        
        return {
            "user_path": str(user_path),
            "drive_path": str(drive_folder),
            "photos_path": str(photos_folder),
            "storage_drive_id": drive.id
        }
    
    def get_user_paths(self, user_id: str, drive_id: Optional[int] = None) -> dict:
        """Get all paths for a user"""
        # Get the drive
        if drive_id:
            drive = self.get_drive_by_id(drive_id)
        else:
            drive = self.get_default_drive()
        
        if not drive:
            raise Exception("No available storage drive found")
        
        drive_path = Path(drive.path)
        user_path = drive_path / "users" / user_id
        
        return {
            "user_path": str(user_path.absolute()),
            "drive_path": str((user_path / "drive").absolute()),
            "photos_path": str((user_path / "photos").absolute()),
            "storage_drive_id": drive.id
        }
    
    def user_storage_exists(self, user_id: str, drive_id: Optional[int] = None) -> bool:
        """Check if user storage already exists"""
        try:
            paths = self.get_user_paths(user_id, drive_id)
            return Path(paths["user_path"]).exists()
        except:
            return False
    
    def delete_user_storage(self, user_id: str, drive_id: Optional[int] = None) -> bool:
        """Delete user storage (use with caution)"""
        try:
            paths = self.get_user_paths(user_id, drive_id)
            user_path = Path(paths["user_path"])
            if user_path.exists():
                shutil.rmtree(user_path)
                return True
        except:
            pass
        return False
    
    def get_user_storage_size(self, user_id: str, drive_id: Optional[int] = None) -> int:
        """Get total storage size for a user in bytes"""
        try:
            paths = self.get_user_paths(user_id, drive_id)
            user_path = Path(paths["user_path"])
            if not user_path.exists():
                return 0
            
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(user_path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    if os.path.exists(filepath):
                        total_size += os.path.getsize(filepath)
            
            return total_size
        except:
            return 0
    
    def generate_user_id(self) -> str:
        """Generate a unique 12-digit user ID"""
        return str(uuid.uuid4().hex)[:12].upper()
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize a filename to be safe for the filesystem"""
        # Remove any path separators
        filename = os.path.basename(filename)
        
        # Replace dangerous characters with underscores
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Remove control characters
        filename = re.sub(r'[\x00-\x1f\x7f]', '', filename)
        
        # Remove leading/trailing dots and spaces
        filename = filename.strip('. ')
        
        # Ensure filename isn't empty
        if not filename:
            filename = "unnamed_file"
        
        # Limit length
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255-len(ext)] + ext
        
        return filename
    
    def sanitize_path(self, path: str) -> str:
        """Sanitize a path to prevent directory traversal attacks"""
        # Normalize the path
        path = os.path.normpath(path)
        
        # Remove any leading slashes or backslashes
        path = path.lstrip('/\\')
        
        # Split into components and sanitize each
        parts = []
        for part in path.split(os.sep):
            if part and part != '.' and part != '..':
                sanitized_part = self.sanitize_filename(part)
                if sanitized_part:
                    parts.append(sanitized_part)
        
        return os.path.join(*parts) if parts else ""

class DriveManagementService:
    """Service for managing storage drives configuration"""
    
    def add_drive(self, name: str, path: str, capacity_gb: Optional[float] = None, 
                  description: Optional[str] = None) -> StorageDrive:
        """Add a new storage drive"""
        with Session(engine) as session:
            # Validate path
            drive_path = Path(path)
            if not drive_path.exists():
                try:
                    drive_path.mkdir(parents=True, exist_ok=True)
                except Exception as e:
                    raise Exception(f"Cannot create drive path: {str(e)}")
            
            # Check if path already exists
            existing = session.exec(select(StorageDrive).where(StorageDrive.path == path)).first()
            if existing:
                raise Exception("Drive path already exists")
            
            # Create users directory
            users_path = drive_path / "users"
            users_path.mkdir(parents=True, exist_ok=True)
            
            new_drive = StorageDrive(
                name=name,
                path=str(drive_path.absolute()),
                capacity_gb=capacity_gb,
                description=description,
                status=DriveStatus.ACTIVE
            )
            
            session.add(new_drive)
            session.commit()
            session.refresh(new_drive)
            return new_drive
    
    def update_drive(self, drive_id: int, name: Optional[str] = None, 
                     capacity_gb: Optional[float] = None, description: Optional[str] = None,
                     status: Optional[DriveStatus] = None) -> Optional[StorageDrive]:
        """Update a storage drive"""
        with Session(engine) as session:
            drive = session.get(StorageDrive, drive_id)
            if not drive:
                return None
            
            if name is not None:
                drive.name = name
            if capacity_gb is not None:
                drive.capacity_gb = capacity_gb
            if description is not None:
                drive.description = description
            if status is not None:
                drive.status = status
            
            drive.updated_at = datetime.utcnow()
            session.add(drive)
            session.commit()
            session.refresh(drive)
            return drive
    
    def set_default_drive(self, drive_id: int) -> bool:
        """Set a drive as the default drive"""
        with Session(engine) as session:
            # Remove default from all drives
            drives = session.exec(select(StorageDrive)).all()
            for drive in drives:
                drive.is_default = False
                session.add(drive)
            
            # Set new default
            target_drive = session.get(StorageDrive, drive_id)
            if target_drive and target_drive.status == DriveStatus.ACTIVE:
                target_drive.is_default = True
                session.add(target_drive)
                session.commit()
                return True
            
            return False
    
    def remove_drive(self, drive_id: int, force: bool = False) -> bool:
        """Remove a storage drive (requires force=True if it has users)"""
        with Session(engine) as session:
            drive = session.get(StorageDrive, drive_id)
            if not drive:
                return False
            
            # Check if drive has users
            from app.models.database import User
            users = session.exec(select(User).where(User.storage_drive_id == drive_id)).all()
            
            if users and not force:
                raise Exception(f"Cannot remove drive with {len(users)} users. Use force=True to override.")
            
            # If force removal, need to handle user migration or deletion
            if force and users:
                # For now, just mark drive as inactive
                drive.status = DriveStatus.INACTIVE
                session.add(drive)
            else:
                session.delete(drive)
            
            session.commit()
            return True

# Create service instances
storage_service = MultiDriveStorageService()
drive_management_service = DriveManagementService()

# Legacy compatibility
class StorageService(MultiDriveStorageService):
    """Legacy storage service for backward compatibility"""
    def __init__(self, base_path: str = NAS_STORAGE_PATH):
        super().__init__()
        # Override for legacy compatibility if needed
