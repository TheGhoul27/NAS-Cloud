import os
import shutil
from pathlib import Path
from typing import Optional
import uuid
from dotenv import load_dotenv

load_dotenv()

# Get NAS storage path from environment
NAS_STORAGE_PATH = os.getenv("NAS_STORAGE_PATH", "./nas_storage")

class StorageService:
    def __init__(self, base_path: str = NAS_STORAGE_PATH):
        self.base_path = Path(base_path)
        self.users_path = self.base_path / "users"
        
        # Ensure base directories exist
        self.users_path.mkdir(parents=True, exist_ok=True)
    
    def generate_user_id(self) -> str:
        """Generate a unique 12-digit user ID"""
        return str(uuid.uuid4().hex)[:12].upper()
    
    def create_user_storage(self, user_id: str) -> dict:
        """
        Create the folder structure for a new user
        Returns dict with created paths
        """
        user_path = self.users_path / user_id
        drive_path = user_path / "drive"
        photos_path = user_path / "photos"
        
        # Create directories
        user_path.mkdir(parents=True, exist_ok=True)
        drive_path.mkdir(parents=True, exist_ok=True)
        photos_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories for better organization
        # Drive subdirectories
        (drive_path / "documents").mkdir(exist_ok=True)
        (drive_path / "uploads").mkdir(exist_ok=True)
        
        # Photos subdirectories
        (photos_path / "uploads").mkdir(exist_ok=True)
        (photos_path / "thumbnails").mkdir(exist_ok=True)
        
        return {
            "user_path": str(user_path),
            "drive_path": str(drive_path),
            "photos_path": str(photos_path)
        }
    
    def get_user_paths(self, user_id: str) -> dict:
        """Get all paths for a user"""
        user_path = self.users_path / user_id
        return {
            "user_path": str(user_path),
            "drive_path": str(user_path / "drive"),
            "photos_path": str(user_path / "photos")
        }
    
    def user_storage_exists(self, user_id: str) -> bool:
        """Check if user storage already exists"""
        user_path = self.users_path / user_id
        return user_path.exists()
    
    def delete_user_storage(self, user_id: str) -> bool:
        """Delete user storage (use with caution)"""
        user_path = self.users_path / user_id
        if user_path.exists():
            shutil.rmtree(user_path)
            return True
        return False
    
    def get_user_storage_size(self, user_id: str) -> int:
        """Get total storage size for a user in bytes"""
        user_path = self.users_path / user_id
        if not user_path.exists():
            return 0
        
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(user_path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                if os.path.exists(filepath):
                    total_size += os.path.getsize(filepath)
        
        return total_size

# Create a singleton instance
storage_service = StorageService()
