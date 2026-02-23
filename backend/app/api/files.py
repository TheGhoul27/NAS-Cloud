from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlmodel import Session
from app.models.database import get_session, User
from app.auth.dependencies import get_current_user, get_current_user_storage
from app.services.storage import storage_service
from pydantic import BaseModel
import os
import shutil
from pathlib import Path
import mimetypes
from datetime import datetime, timedelta
import json
from PIL import Image, ExifTags
from PIL.ExifTags import TAGS

router = APIRouter(prefix="/files", tags=["files"])

def extract_photo_metadata(file_path):
    """Extract metadata from photo files including EXIF data"""
    try:
        # Default metadata
        metadata = {
            "date_taken": None,
            "camera_make": None,
            "camera_model": None,
            "location": None
        }
        
        # Check if it's an image file
        try:
            with Image.open(file_path) as image:
                # Extract EXIF data
                exif_data = image.getexif()
                
                if exif_data:
                    # Get date taken
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        
                        if tag == "DateTime":
                            try:
                                # Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
                                date_taken = datetime.strptime(str(value), "%Y:%m:%d %H:%M:%S")
                                metadata["date_taken"] = date_taken.isoformat()
                            except (ValueError, TypeError):
                                pass
                        elif tag == "Make":
                            metadata["camera_make"] = str(value).strip()
                        elif tag == "Model":
                            metadata["camera_model"] = str(value).strip()
                        elif tag == "GPSInfo":
                            # GPS data extraction could be added here
                            pass
                            
        except Exception:
            # Not an image file or can't read EXIF data
            pass
            
        return metadata
    except Exception:
        return {
            "date_taken": None,
            "camera_make": None,
            "camera_model": None,
            "location": None
        }

@router.get("/storage-info")
async def get_storage_info(
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Get current user's storage information"""
    user_quota_gb = current_user.storage_quota_gb or 20.0
    storage_size = storage_service.get_user_storage_size(
        current_user.storage_id, 
        drive_id=current_user.storage_drive_id
    )
    
    # Get drive information
    drive_info = None
    if current_user.storage_drive_id:
        drive = storage_service.get_drive_by_id(current_user.storage_drive_id)
        if drive:
            drive_info = {
                "id": drive.id,
                "name": drive.name,
                "path": drive.path
            }
    
    return {
        "user_id": current_user.id,
        "storage_id": current_user.storage_id,
        "email": current_user.email,
        "storage_paths": storage_paths,
        "storage_size_bytes": storage_size,
        "storage_size_mb": round(storage_size / (1024 * 1024), 2),
        "storage_quota_gb": user_quota_gb,
        "storage_quota_bytes": int(user_quota_gb * 1024 * 1024 * 1024),
        "drive_info": drive_info
    }

@router.get("/list")
async def list_files(
    path: str = "",  # Relative path within user's storage area
    context: str = "drive",  # "drive" or "photos" - determines which storage area to use
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """List files and folders in user's storage area (drive or photos)"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    # Construct full path based on context
    base_path = storage_paths[f"{context}_path"]
    if path:
        # Ensure path is safe and within user's storage
        safe_path = storage_service.sanitize_path(path)
        target_dir = os.path.join(base_path, safe_path)
    else:
        target_dir = base_path
    
    # Check if directory exists
    if not os.path.exists(target_dir):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Directory not found"
        )
    
    try:
        items = []
        for item_name in os.listdir(target_dir):
            item_path = os.path.join(target_dir, item_name)
            
            # Skip hidden files and system files
            if item_name.startswith('.'):
                continue
            
            item_info = {
                "name": item_name,
                "path": os.path.join(path, item_name) if path else item_name,
                "type": "folder" if os.path.isdir(item_path) else "file",
                "is_directory": os.path.isdir(item_path),
                "modified": datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat(),
            }
            
            if not item_info["is_directory"]:
                # File-specific info
                item_info.update({
                    "size": os.path.getsize(item_path),
                    "mimeType": mimetypes.guess_type(item_path)[0] or "application/octet-stream"
                })
                
                # For photos context, extract additional metadata from image files
                if context == "photos":
                    mime_type = item_info["mimeType"]
                    if mime_type and mime_type.startswith('image/'):
                        photo_metadata = extract_photo_metadata(item_path)
                        item_info.update(photo_metadata)
                        
                        # Use date_taken as the primary date if available, otherwise use modified date
                        if photo_metadata["date_taken"]:
                            item_info["date_taken"] = photo_metadata["date_taken"]
                        else:
                            item_info["date_taken"] = item_info["modified"]
            
            items.append(item_info)
        
        # Sort: directories first, then files, both alphabetically
        items.sort(key=lambda x: (not x["is_directory"], x["name"].lower()))
        
        return {
            "path": path,
            "items": items,
            "total_count": len(items),
            "folder_count": sum(1 for item in items if item["is_directory"]),
            "file_count": sum(1 for item in items if not item["is_directory"])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list directory: {str(e)}"
        )

class CreateFolderRequest(BaseModel):
    name: str
    path: str = ""  # Relative path within user's storage area
    context: str = "drive"  # "drive" or "photos" - determines which storage area to use

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Form(""),  # Relative path within user's storage area
    context: str = Form("drive"),  # "drive" or "photos" - determines which storage area to use
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Upload a file to user's storage area (drive or photos)"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )

    # Read upload size and enforce user quota
    try:
        file.file.seek(0, os.SEEK_END)
        upload_size_bytes = file.file.tell()
        file.file.seek(0)
    except Exception:
        upload_size_bytes = 0

    current_usage_bytes = storage_service.get_user_storage_size(
        current_user.storage_id,
        drive_id=current_user.storage_drive_id
    )
    user_quota_gb = current_user.storage_quota_gb or 20.0
    quota_bytes = int(user_quota_gb * 1024 * 1024 * 1024)

    if upload_size_bytes > 0 and (current_usage_bytes + upload_size_bytes) > quota_bytes:
        available_bytes = max(0, quota_bytes - current_usage_bytes)
        available_mb = round(available_bytes / (1024 * 1024), 2)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Storage quota exceeded. Available: {available_mb} MB of {user_quota_gb} GB"
        )
    
    # Sanitize filename
    safe_filename = storage_service.sanitize_filename(file.filename)
    
    # Construct full path based on context
    base_path = storage_paths[f"{context}_path"]
    if path:
        # Ensure path is safe and within user's storage
        safe_path = storage_service.sanitize_path(path)
        target_dir = os.path.join(base_path, safe_path)
    else:
        target_dir = base_path
    
    # Ensure target directory exists
    os.makedirs(target_dir, exist_ok=True)
    
    target_file_path = os.path.join(target_dir, safe_filename)
    
    # Check if file already exists
    if os.path.exists(target_file_path):
        # Create a unique filename
        name, ext = os.path.splitext(safe_filename)
        counter = 1
        while os.path.exists(os.path.join(target_dir, f"{name}({counter}){ext}")):
            counter += 1
        safe_filename = f"{name}({counter}){ext}"
        target_file_path = os.path.join(target_dir, safe_filename)
    
    try:
        # Save file
        with open(target_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file info
        file_size = os.path.getsize(target_file_path)
        file_type = mimetypes.guess_type(target_file_path)[0] or "application/octet-stream"
        
        return {
            "message": "File uploaded successfully",
            "filename": safe_filename,
            "original_filename": file.filename,
            "size": file_size,
            "type": file_type,
            "path": os.path.join(path, safe_filename) if path else safe_filename
        }
        
    except Exception as e:
        # Clean up on error
        if os.path.exists(target_file_path):
            os.remove(target_file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )

@router.post("/create-folder")
async def create_folder(
    folder_request: CreateFolderRequest,
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Create a new folder in user's storage area (drive or photos)"""
    
    # Validate context
    if folder_request.context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    # Validate folder name
    if not folder_request.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder name cannot be empty"
        )
    
    # Sanitize folder name
    safe_folder_name = storage_service.sanitize_filename(folder_request.name.strip())
    
    # Construct full path based on context
    base_path = storage_paths[f"{folder_request.context}_path"]
    if folder_request.path:
        # Ensure path is safe and within user's storage
        safe_path = storage_service.sanitize_path(folder_request.path)
        target_dir = os.path.join(base_path, safe_path)
    else:
        target_dir = base_path
    
    folder_path = os.path.join(target_dir, safe_folder_name)
    
    # Check if folder already exists
    if os.path.exists(folder_path):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Folder already exists"
        )
    
    try:
        # Create folder
        os.makedirs(folder_path, exist_ok=True)
        
        return {
            "message": "Folder created successfully",
            "name": safe_folder_name,
            "path": os.path.join(folder_request.path, safe_folder_name) if folder_request.path else safe_folder_name
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create folder: {str(e)}"
        )

@router.get("/download/{file_path:path}")
async def download_file(
    file_path: str,
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Download a file from user's storage area (drive or photos)"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    # Sanitize the file path
    safe_path = storage_service.sanitize_path(file_path)
    
    # Construct full path based on context
    base_path = storage_paths[f"{context}_path"]
    full_file_path = os.path.join(base_path, safe_path)
    
    # Check if file exists and is within user's storage
    if not os.path.exists(full_file_path) or not os.path.isfile(full_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Ensure the file is within the user's storage directory
    try:
        # Both paths should now be absolute, normalize them for comparison
        base_path_normalized = os.path.normpath(base_path).lower()
        file_path_normalized = os.path.normpath(full_file_path).lower()
        
        # Check if the file is within the base directory
        if not (file_path_normalized.startswith(base_path_normalized + os.sep) or file_path_normalized == base_path_normalized):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get the filename for the response
    filename = os.path.basename(full_file_path)
    
    return FileResponse(
        path=full_file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

@router.get("/view/{file_path:path}")
async def view_file(
    file_path: str,
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """View/stream a file from user's storage area (drive or photos) with proper MIME type"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    # Sanitize the file path
    safe_path = storage_service.sanitize_path(file_path)
    
    # Construct full path based on context
    base_path = storage_paths[f"{context}_path"]
    full_file_path = os.path.join(base_path, safe_path)
    
    # Check if file exists and is within user's storage
    if not os.path.exists(full_file_path) or not os.path.isfile(full_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Ensure the file is within the user's storage directory
    try:
        # Both paths should now be absolute, normalize them for comparison
        base_path_normalized = os.path.normpath(base_path).lower()
        file_path_normalized = os.path.normpath(full_file_path).lower()
        
        # Check if the file is within the base directory
        if not (file_path_normalized.startswith(base_path_normalized + os.sep) or file_path_normalized == base_path_normalized):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get the proper MIME type
    mime_type, _ = mimetypes.guess_type(full_file_path)
    if not mime_type:
        mime_type = 'application/octet-stream'
    
    return FileResponse(
        path=full_file_path,
        media_type=mime_type,
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff"
        }
    )

@router.delete("/delete/{file_path:path}")
async def move_to_trash(
    file_path: str,
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Move a file or folder to trash (soft delete)"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    # Sanitize the file path
    safe_path = storage_service.sanitize_path(file_path)
    
    # Construct full path based on context
    base_path = storage_paths[f"{context}_path"]
    full_file_path = os.path.join(base_path, safe_path)
    
    # Check if file exists and is within user's storage
    if not os.path.exists(full_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File or folder not found"
        )
    
    # Ensure the file is within the user's storage directory
    try:
        # Both paths should be absolute, normalize them for comparison
        base_path_normalized = os.path.normpath(base_path).lower()
        file_path_normalized = os.path.normpath(full_file_path).lower()
        
        # Check if the file is within the base directory
        if not (file_path_normalized.startswith(base_path_normalized + os.sep) or file_path_normalized == base_path_normalized):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    try:
        # Create trash directory if it doesn't exist
        trash_dir = os.path.join(storage_paths['user_path'], '.trash')
        os.makedirs(trash_dir, exist_ok=True)
        
        # Generate unique filename for trash
        original_name = os.path.basename(full_file_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        trash_filename = f"{timestamp}_{original_name}"
        trash_file_path = os.path.join(trash_dir, trash_filename)
        
        # Create metadata for the trashed item
        metadata = {
            "original_path": file_path,
            "original_name": original_name,
            "context": context,
            "deleted_at": datetime.now().isoformat(),
            "is_directory": os.path.isdir(full_file_path),
            "size": _get_size(full_file_path) if os.path.exists(full_file_path) else 0
        }
        
        # Move file/folder to trash
        shutil.move(full_file_path, trash_file_path)
        
        # Save metadata
        metadata_file = f"{trash_file_path}.meta"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f)
        
        return {
            "message": f"{'Folder' if metadata['is_directory'] else 'File'} moved to trash successfully",
            "type": "folder" if metadata['is_directory'] else "file",
            "trash_id": trash_filename
        }
        
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to delete this item"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to move item to trash: {str(e)}"
        )

@router.get("/recent")
async def get_recent_files(
    limit: int = 10,
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Get recently modified files from user's storage area (drive or photos)"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    base_path = storage_paths[f"{context}_path"]
    recent_files = []
    
    try:
        # Walk through all files in user's storage
        for root, dirs, files in os.walk(base_path):
            for file_name in files:
                # Skip hidden files
                if file_name.startswith('.'):
                    continue
                    
                file_path = os.path.join(root, file_name)
                
                # Get relative path from base_path
                relative_path = os.path.relpath(file_path, base_path)
                
                file_info = {
                    "name": file_name,
                    "path": relative_path.replace(os.sep, '/'),  # Normalize path separators
                    "type": "file",
                    "is_directory": False,  # Recent files are always files, not directories
                    "size": os.path.getsize(file_path),
                    "mimeType": mimetypes.guess_type(file_path)[0] or "application/octet-stream",
                    "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                    "modified_timestamp": os.path.getmtime(file_path)
                }
                
                # For photos context, extract additional metadata from image files
                if context == "photos":
                    mime_type = file_info["mimeType"]
                    if mime_type and mime_type.startswith('image/'):
                        photo_metadata = extract_photo_metadata(file_path)
                        file_info.update(photo_metadata)
                        
                        # Use date_taken as the primary date if available, otherwise use modified date
                        if photo_metadata["date_taken"]:
                            file_info["date_taken"] = photo_metadata["date_taken"]
                        else:
                            file_info["date_taken"] = file_info["modified"]
                
                recent_files.append(file_info)
        
        # Sort by modification time (most recent first) and limit results
        recent_files.sort(key=lambda x: x["modified_timestamp"], reverse=True)
        recent_files = recent_files[:limit]
        
        # Remove the timestamp field as it's only needed for sorting
        for file_info in recent_files:
            del file_info["modified_timestamp"]
        
        return {
            "files": recent_files,
            "count": len(recent_files)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recent files: {str(e)}"
        )

@router.get("/search")
async def search_files(
    query: str = Query(..., description="Search query"),
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    file_type: str = Query(None, description="Filter by file type: image, video, audio, document, archive, etc."),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Search for files and folders in user's storage area"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    # Validate query
    if not query or len(query.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters long"
        )
    
    base_path = storage_paths[f"{context}_path"]
    search_results = []
    query_lower = query.strip().lower()
    
    try:
        # Walk through all files and folders in user's storage
        for root, dirs, files in os.walk(base_path):
            # Filter directories to skip hidden ones
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            # Get relative path from base_path
            relative_root = os.path.relpath(root, base_path)
            if relative_root == '.':
                relative_root = ''
            
            # Search in directory names
            for dir_name in dirs:
                if query_lower in dir_name.lower():
                    dir_path = os.path.join(root, dir_name)
                    relative_path = os.path.join(relative_root, dir_name) if relative_root else dir_name
                    
                    search_results.append({
                        "name": dir_name,
                        "path": relative_path.replace(os.sep, '/'),
                        "type": "folder",
                        "is_directory": True,
                        "size": 0,
                        "modified": datetime.fromtimestamp(os.path.getmtime(dir_path)).isoformat(),
                        "match_type": "name"
                    })
            
            # Search in file names
            for file_name in files:
                # Skip hidden files
                if file_name.startswith('.'):
                    continue
                
                file_path = os.path.join(root, file_name)
                relative_path = os.path.join(relative_root, file_name) if relative_root else file_name
                
                # Check if file name matches query
                if query_lower in file_name.lower():
                    file_size = os.path.getsize(file_path)
                    mime_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
                    
                    # Determine file type category
                    file_category = _get_file_category(mime_type, file_name)
                    
                    # Apply file type filter if specified
                    if file_type and file_category != file_type.lower():
                        continue
                    
                    search_results.append({
                        "name": file_name,
                        "path": relative_path.replace(os.sep, '/'),
                        "type": "file",
                        "is_directory": False,
                        "size": file_size,
                        "mimeType": mime_type,
                        "category": file_category,
                        "modified": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                        "match_type": "name"
                    })
        
        # Sort results: directories first, then files, both by relevance and name
        search_results.sort(key=lambda x: (
            not x["is_directory"],  # Directories first
            not x["name"].lower().startswith(query_lower),  # Exact prefix matches first
            x["name"].lower()  # Then alphabetically
        ))
        
        return {
            "query": query,
            "context": context,
            "file_type_filter": file_type,
            "results": search_results,
            "total_count": len(search_results),
            "folder_count": sum(1 for item in search_results if item["is_directory"]),
            "file_count": sum(1 for item in search_results if not item["is_directory"])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search files: {str(e)}"
        )

def _get_file_category(mime_type, filename):
    """Helper function to categorize files by type"""
    if not mime_type and not filename:
        return 'other'
    
    extension = filename.split('.').pop().lower() if filename and '.' in filename else ''
    
    # Images
    if mime_type and mime_type.startswith('image/'):
        return 'image'
    
    # Videos
    if (mime_type and mime_type.startswith('video/')) or extension in ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']:
        return 'video'
    
    # Audio
    if (mime_type and mime_type.startswith('audio/')) or extension in ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma']:
        return 'audio'
    
    # PDFs
    if mime_type == 'application/pdf' or extension == 'pdf':
        return 'pdf'
    
    # Office Documents
    if extension in ['doc', 'docx'] or (mime_type and 'wordprocessingml' in mime_type):
        return 'document'
    if extension in ['xls', 'xlsx'] or (mime_type and 'spreadsheetml' in mime_type):
        return 'spreadsheet'
    if extension in ['ppt', 'pptx'] or (mime_type and 'presentationml' in mime_type):
        return 'presentation'
    
    # Text files
    if (mime_type and mime_type.startswith('text/')) or extension in ['txt', 'md', 'json', 'xml', 'csv']:
        return 'text'
    
    # Archives
    if extension in ['zip', 'rar', '7z', 'tar', 'gz']:
        return 'archive'
    
    return 'other'

def _get_size(path):
    """Helper function to get size of file or directory"""
    if os.path.isfile(path):
        return os.path.getsize(path)
    elif os.path.isdir(path):
        total_size = 0
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                try:
                    total_size += os.path.getsize(filepath)
                except (OSError, IOError):
                    pass
        return total_size
    return 0

@router.get("/trash")
async def list_trash(
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """List items in trash for a specific context"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    trash_dir = os.path.join(storage_paths['user_path'], '.trash')
    
    if not os.path.exists(trash_dir):
        return {
            "items": [],
            "total_count": 0
        }
    
    trash_items = []
    
    try:
        for item in os.listdir(trash_dir):
            if item.endswith('.meta'):
                continue
                
            item_path = os.path.join(trash_dir, item)
            metadata_file = f"{item_path}.meta"
            
            if os.path.exists(metadata_file):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    # Skip items that don't match the requested context
                    if metadata.get('context') != context:
                        continue
                    
                    # Calculate days in trash
                    deleted_at = datetime.fromisoformat(metadata['deleted_at'])
                    days_in_trash = (datetime.now() - deleted_at).days
                    
                    trash_items.append({
                        "trash_id": item,
                        "original_name": metadata['original_name'],
                        "original_path": metadata['original_path'],
                        "context": metadata['context'],
                        "is_directory": metadata['is_directory'],
                        "size": metadata.get('size', 0),
                        "deleted_at": metadata['deleted_at'],
                        "days_in_trash": days_in_trash,
                        "expires_in_days": max(0, 30 - days_in_trash)
                    })
                except (json.JSONDecodeError, KeyError):
                    # Skip items with invalid metadata
                    continue
        
        # Sort by deletion date (most recent first)
        trash_items.sort(key=lambda x: x['deleted_at'], reverse=True)
        
        return {
            "items": trash_items,
            "total_count": len(trash_items)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list trash items: {str(e)}"
        )

@router.post("/trash/{trash_id}/restore")
async def restore_from_trash(
    trash_id: str,
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Restore an item from trash to its original location"""
    
    trash_dir = os.path.join(storage_paths['user_path'], '.trash')
    trash_item_path = os.path.join(trash_dir, trash_id)
    metadata_file = f"{trash_item_path}.meta"
    
    if not os.path.exists(trash_item_path) or not os.path.exists(metadata_file):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trash item not found"
        )
    
    try:
        # Load metadata
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        # Construct original path
        context = metadata['context']
        original_path = metadata['original_path']
        base_path = storage_paths[f"{context}_path"]
        restore_path = os.path.join(base_path, original_path)
        
        # Check if original location is available
        if os.path.exists(restore_path):
            # Generate a new name if conflict exists
            name, ext = os.path.splitext(metadata['original_name'])
            counter = 1
            
            if metadata['is_directory']:
                new_name = f"{name} (restored {counter})"
                while os.path.exists(os.path.join(os.path.dirname(restore_path), new_name)):
                    counter += 1
                    new_name = f"{name} (restored {counter})"
                restore_path = os.path.join(os.path.dirname(restore_path), new_name)
            else:
                new_name = f"{name} (restored {counter}){ext}"
                while os.path.exists(os.path.join(os.path.dirname(restore_path), new_name)):
                    counter += 1
                    new_name = f"{name} (restored {counter}){ext}"
                restore_path = os.path.join(os.path.dirname(restore_path), new_name)
        
        # Ensure target directory exists
        os.makedirs(os.path.dirname(restore_path), exist_ok=True)
        
        # Move back from trash
        shutil.move(trash_item_path, restore_path)
        
        # Remove metadata file
        os.remove(metadata_file)
        
        return {
            "message": f"{'Folder' if metadata['is_directory'] else 'File'} restored successfully",
            "original_name": metadata['original_name'],
            "restored_path": os.path.relpath(restore_path, base_path).replace(os.sep, '/'),
            "context": context
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restore item: {str(e)}"
        )

@router.delete("/trash/{trash_id}/permanent")
async def permanently_delete(
    trash_id: str,
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Permanently delete an item from trash"""
    
    trash_dir = os.path.join(storage_paths['user_path'], '.trash')
    trash_item_path = os.path.join(trash_dir, trash_id)
    metadata_file = f"{trash_item_path}.meta"
    
    if not os.path.exists(trash_item_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trash item not found"
        )
    
    try:
        # Load metadata for response
        metadata = {}
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        
        # Permanently delete the item
        if os.path.isfile(trash_item_path):
            os.remove(trash_item_path)
        elif os.path.isdir(trash_item_path):
            shutil.rmtree(trash_item_path)
        
        # Remove metadata file
        if os.path.exists(metadata_file):
            os.remove(metadata_file)
        
        return {
            "message": f"{'Folder' if metadata.get('is_directory', False) else 'File'} permanently deleted",
            "original_name": metadata.get('original_name', 'Unknown')
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to permanently delete item: {str(e)}"
        )

@router.delete("/trash/empty")
async def empty_trash(
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Empty trash for a specific context (permanently delete all items)"""
    
    # Validate context
    if context not in ["drive", "photos"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Context must be either 'drive' or 'photos'"
        )
    
    trash_dir = os.path.join(storage_paths['user_path'], '.trash')
    
    if not os.path.exists(trash_dir):
        return {
            "message": "Trash is already empty",
            "deleted_count": 0
        }
    
    deleted_count = 0
    
    try:
        for item in os.listdir(trash_dir):
            if item.endswith('.meta'):
                continue
                
            item_path = os.path.join(trash_dir, item)
            metadata_file = f"{item_path}.meta"
            
            # Check if this item belongs to the specified context
            if os.path.exists(metadata_file):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    # Only delete items from the specified context
                    if metadata.get('context') == context:
                        # Delete the actual file/folder
                        if os.path.isfile(item_path):
                            os.remove(item_path)
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                        
                        # Delete the metadata file
                        os.remove(metadata_file)
                        deleted_count += 1
                        
                except (json.JSONDecodeError, KeyError):
                    # Skip items with invalid metadata
                    continue
        
        return {
            "message": f"Trash emptied successfully for {context}. {deleted_count} items permanently deleted.",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to empty trash: {str(e)}"
        )

@router.post("/trash/cleanup")
async def cleanup_old_trash(
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Clean up trash items older than 30 days"""
    
    trash_dir = os.path.join(storage_paths['user_path'], '.trash')
    
    if not os.path.exists(trash_dir):
        return {
            "message": "No trash to clean up",
            "deleted_count": 0
        }
    
    deleted_count = 0
    cutoff_date = datetime.now() - timedelta(days=30)
    
    try:
        for item in os.listdir(trash_dir):
            if item.endswith('.meta'):
                continue
                
            item_path = os.path.join(trash_dir, item)
            metadata_file = f"{item_path}.meta"
            
            if os.path.exists(metadata_file):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    deleted_at = datetime.fromisoformat(metadata['deleted_at'])
                    
                    if deleted_at < cutoff_date:
                        # Delete the item and its metadata
                        if os.path.isfile(item_path):
                            os.remove(item_path)
                        elif os.path.isdir(item_path):
                            shutil.rmtree(item_path)
                        
                        os.remove(metadata_file)
                        deleted_count += 1
                        
                except (json.JSONDecodeError, KeyError, ValueError):
                    # Skip items with invalid metadata
                    continue
        
        return {
            "message": f"Cleaned up {deleted_count} items older than 30 days",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup trash: {str(e)}"
        )
