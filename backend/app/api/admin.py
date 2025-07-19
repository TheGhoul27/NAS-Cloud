from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlmodel import Session, select, desc
from app.models.database import get_session, User, UserStatus, UserRole, AdminCredentials, StorageDrive
from app.schemas.auth import UserListResponse, UserApprovalRequest, UserPasswordChange
from app.schemas.storage import (
    DriveCreate, DriveUpdate, DriveResponse, DriveUsageResponse, 
    DriveListResponse, StorageOverviewResponse, UserMigrationRequest
)
from app.services.storage import storage_service, drive_management_service
from app.auth.auth import verify_password, get_password_hash
from typing import List, Union
from datetime import datetime
from pydantic import BaseModel
import secrets

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBasic()

class AdminPasswordChange(BaseModel):
    current_password: str
    new_password: str

def get_admin_credentials(session: Session):
    """Get admin credentials from database or create defaults"""
    statement = select(AdminCredentials).where(AdminCredentials.username == "admin")
    admin_creds = session.exec(statement).first()
    
    if not admin_creds:
        # Create default admin credentials
        default_password_hash = get_password_hash("admin")
        admin_creds = AdminCredentials(
            username="admin",
            password_hash=default_password_hash
        )
        session.add(admin_creds)
        session.commit()
        session.refresh(admin_creds)
    
    return admin_creds.username, admin_creds.password_hash

def save_admin_credentials(session: Session, username: str, password: str):
    """Save admin credentials to database"""
    statement = select(AdminCredentials).where(AdminCredentials.username == username)
    admin_creds = session.exec(statement).first()
    
    password_hash = get_password_hash(password)
    
    if admin_creds:
        admin_creds.password_hash = password_hash
        admin_creds.updated_at = datetime.utcnow()
    else:
        admin_creds = AdminCredentials(
            username=username,
            password_hash=password_hash
        )
        session.add(admin_creds)
    
    session.commit()
    session.refresh(admin_creds)

def verify_admin_credentials(credentials: HTTPBasicCredentials = Depends(security), session: Session = Depends(get_session)):
    """Verify admin credentials using HTTP Basic Auth - supports both admin table and user admin role"""
    
    # First, check if it's the main admin account
    try:
        stored_username, stored_password_hash = get_admin_credentials(session)
        if (credentials.username == stored_username and 
            verify_password(credentials.password, stored_password_hash)):
            return f"admin:{credentials.username}"
    except Exception:
        pass
    
    # Then, check if it's a user with admin role
    try:
        statement = select(User).where(
            User.email == credentials.username,
            User.role == UserRole.ADMIN,
            User.status == UserStatus.APPROVED,
            User.is_active == True
        )
        user = session.exec(statement).first()
        
        if user and verify_password(credentials.password, user.password_hash):
            return f"user:{user.email}"
    except Exception:
        pass
    
    # If neither worked, raise authentication error
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid admin credentials",
        headers={"WWW-Authenticate": "Basic"},
    )

@router.get("/users", response_model=List[UserListResponse])
async def get_all_users(
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Get all users (admin only)"""
    statement = select(User).order_by(desc(User.created_at))
    users = session.exec(statement).all()
    
    return [
        UserListResponse(
            id=user.id or 0,
            email=user.email,
            firstname=user.firstname,
            lastname=user.lastname,
            phone=user.phone,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            approved_at=user.approved_at,
            is_active=user.is_active
        )
        for user in users
    ]

@router.get("/users/pending", response_model=List[UserListResponse])
async def get_pending_users(
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Get all pending users (admin only)"""
    statement = select(User).where(User.status == UserStatus.PENDING).order_by(desc(User.created_at))
    users = session.exec(statement).all()
    
    return [
        UserListResponse(
            id=user.id or 0,
            email=user.email,
            firstname=user.firstname,
            lastname=user.lastname,
            phone=user.phone,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            approved_at=user.approved_at,
            is_active=user.is_active
        )
        for user in users
    ]

@router.post("/users/approve")
async def approve_or_reject_user(
    approval_request: UserApprovalRequest,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Approve or reject a pending user (admin only)"""
    # Find the user
    statement = select(User).where(User.id == approval_request.user_id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.status != UserStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in pending status"
        )
    
    if approval_request.action == "approve":
        user.status = UserStatus.APPROVED
        user.approved_at = datetime.utcnow()
        # No approved_by field needed since it's always admin
        
        # Create user storage folders when approved
        try:
            storage_paths = storage_service.create_user_storage(
                user.storage_id, 
                drive_id=user.storage_drive_id
            )
            # Update user with storage drive ID if it was assigned during creation
            if storage_paths.get("storage_drive_id") and not user.storage_drive_id:
                user.storage_drive_id = storage_paths["storage_drive_id"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user storage: {str(e)}"
            )
            
    elif approval_request.action == "reject":
        user.status = UserStatus.REJECTED
        user.is_active = False
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'"
        )
    
    try:
        session.commit()
        session.refresh(user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user status: {str(e)}"
        )
    
    return {
        "message": f"User {approval_request.action}d successfully",
        "user_id": user.id,
        "status": user.status.value
    }

@router.post("/users/{user_id}/toggle-admin")
async def toggle_user_admin_role(
    user_id: int,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Toggle user admin role (admin only)"""
    # Find the user
    statement = select(User).where(User.id == user_id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Toggle role
    user.role = UserRole.ADMIN if user.role == UserRole.USER else UserRole.USER
    
    try:
        session.commit()
        session.refresh(user)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}"
        )
    
    return {
        "message": f"User role updated to {user.role.value}",
        "user_id": user.id,
        "role": user.role.value
    }

@router.get("/dashboard")
async def admin_dashboard(
    admin_user: str = Depends(verify_admin_credentials)
):
    """Admin dashboard endpoint to verify access"""
    return {
        "message": "Welcome to admin dashboard",
        "admin": admin_user
    }

@router.post("/change-password")
async def change_admin_password(
    password_data: AdminPasswordChange,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Change admin password"""
    # Check if this is the main admin or a user admin
    if admin_user.startswith("admin:"):
        # Main admin changing password
        username, current_password_hash = get_admin_credentials(session)
        
        # Verify current password
        if not verify_password(password_data.current_password, current_password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Save new password
        try:
            save_admin_credentials(session, username, password_data.new_password)
            return {"message": "Admin password changed successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to change password: {str(e)}"
            )
    else:
        # User admin changing their own password
        email = admin_user.split(":", 1)[1]
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(password_data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Save new password
        try:
            user.password_hash = get_password_hash(password_data.new_password)
            session.commit()
            return {"message": "Password changed successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to change password: {str(e)}"
            )

@router.post("/users/change-password")
async def change_user_password(
    password_data: UserPasswordChange,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Change any user's password (admin only)"""
    # Find the user
    statement = select(User).where(User.id == password_data.user_id)
    user = session.exec(statement).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Hash new password and save
    try:
        user.password_hash = get_password_hash(password_data.new_password)
        session.commit()
        session.refresh(user)
        
        return {
            "message": f"Password changed successfully for user {user.email}",
            "user_id": user.id,
            "email": user.email
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change user password: {str(e)}"
        )

# Storage Management Endpoints

@router.get("/storage/overview", response_model=StorageOverviewResponse)
async def get_storage_overview(
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Get storage overview with drive statistics"""
    try:
        drives = storage_service.get_available_drives()
        drive_usage = []
        total_storage_gb = 0
        used_storage_gb = 0
        
        for drive in drives:
            if drive.id is not None:
                usage = storage_service.get_drive_usage(drive.id)
                if "error" not in usage:
                    drive_usage.append(DriveUsageResponse(**usage))
                    total_storage_gb += usage["total_bytes"] / (1024**3)  # Convert to GB
                    used_storage_gb += usage["used_bytes"] / (1024**3)
        
        # Count total users
        total_users = session.exec(select(User).where(User.status == UserStatus.APPROVED)).all()
        
        return StorageOverviewResponse(
            total_drives=len(drives),
            active_drives=len([d for d in drives if d.status.value == "active"]),
            total_users=len(total_users),
            total_storage_gb=round(total_storage_gb, 2),
            used_storage_gb=round(used_storage_gb, 2),
            drives=drive_usage
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get storage overview: {str(e)}"
        )

@router.get("/storage/drives", response_model=DriveListResponse)
async def get_all_drives(
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Get all storage drives"""
    try:
        statement = select(StorageDrive).order_by(desc(StorageDrive.created_at))
        drives = session.exec(statement).all()
        
        drive_responses = [DriveResponse.model_validate(drive) for drive in drives]
        
        return DriveListResponse(
            drives=drive_responses,
            total=len(drive_responses)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get drives: {str(e)}"
        )

@router.post("/storage/drives", response_model=DriveResponse)
async def create_drive(
    drive_data: DriveCreate,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Create a new storage drive"""
    try:
        new_drive = drive_management_service.add_drive(
            name=drive_data.name,
            path=drive_data.path,
            capacity_gb=drive_data.capacity_gb,
            description=drive_data.description
        )
        return DriveResponse.model_validate(new_drive)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create drive: {str(e)}"
        )

@router.put("/storage/drives/{drive_id}", response_model=DriveResponse)
async def update_drive(
    drive_id: int,
    drive_data: DriveUpdate,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Update a storage drive"""
    try:
        updated_drive = drive_management_service.update_drive(
            drive_id=drive_id,
            name=drive_data.name,
            capacity_gb=drive_data.capacity_gb,
            description=drive_data.description,
            status=drive_data.status
        )
        if not updated_drive:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Drive not found"
            )
        return DriveResponse.model_validate(updated_drive)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update drive: {str(e)}"
        )

@router.put("/storage/drives/{drive_id}/set-default")
async def set_default_drive(
    drive_id: int,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Set a drive as the default drive for new users"""
    try:
        success = drive_management_service.set_default_drive(drive_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Drive not found or not active"
            )
        return {"message": f"Drive {drive_id} set as default"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to set default drive: {str(e)}"
        )

@router.delete("/storage/drives/{drive_id}")
async def remove_drive(
    drive_id: int,
    force: bool = False,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Remove a storage drive (use force=true if drive has users)"""
    try:
        success = drive_management_service.remove_drive(drive_id, force=force)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Drive not found"
            )
        return {"message": f"Drive {drive_id} removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to remove drive: {str(e)}"
        )

@router.get("/storage/drives/{drive_id}/usage", response_model=DriveUsageResponse)
async def get_drive_usage(
    drive_id: int,
    admin_user: str = Depends(verify_admin_credentials),
    session: Session = Depends(get_session)
):
    """Get usage statistics for a specific drive"""
    try:
        usage = storage_service.get_drive_usage(drive_id)
        if "error" in usage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=usage["error"]
            )
        return DriveUsageResponse(**usage)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get drive usage: {str(e)}"
        )
