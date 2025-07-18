import os
import shutil
from pathlib import Path
from typing import Optional
import uuid
import re
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
        
        # Don't create any subdirectories - let users create them as needed
        
        return {
            "user_path": str(user_path),
            "drive_path": str(drive_path),
            "photos_path": str(photos_path)
        }
    
    def get_user_paths(self, user_id: str) -> dict:
        """Get all paths for a user"""
        user_path = self.users_path / user_id
        return {
            "user_path": str(user_path.absolute()),
            "drive_path": str((user_path / "drive").absolute()),
            "photos_path": str((user_path / "photos").absolute())
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

# Create a singleton instance
storage_service = StorageService()
