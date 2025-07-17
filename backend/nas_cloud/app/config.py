from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://nascloud:nascloud_dev@localhost:5432/nascloud"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Storage
    NAS_STORAGE_PATH: str = "./storage"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # App
    APP_NAME: str = "NAS-Cloud"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # File upload
    MAX_UPLOAD_SIZE: str = "5GB"
    ALLOWED_EXTENSIONS: List[str] = [
        "jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff",
        "mp4", "avi", "mov", "mkv", "webm", "flv",
        "pdf", "doc", "docx", "txt", "rtf", "odt",
        "zip", "rar", "7z", "tar", "gz"
    ]
    
    # Worker
    WORKER_PROCESSES: int = 2
    WORKER_THREADS: int = 4
    
    # Thumbnails
    THUMBNAIL_SIZES: List[int] = [240, 720, 1080]
    THUMBNAIL_QUALITY: int = 85

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
