from sqlmodel import SQLModel, Field, create_engine, Session
from datetime import datetime
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    storage_id: str = Field(unique=True, index=True)  # Unique folder identifier
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

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
