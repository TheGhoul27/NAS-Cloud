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
from datetime import datetime

router = APIRouter(prefix="/files", tags=["files"])

@router.get("/storage-info")
async def get_storage_info(
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Get current user's storage information"""
    storage_size = storage_service.get_user_storage_size(current_user.storage_id)
    
    return {
        "user_id": current_user.id,
        "storage_id": current_user.storage_id,
        "email": current_user.email,
        "storage_paths": storage_paths,
        "storage_size_bytes": storage_size,
        "storage_size_mb": round(storage_size / (1024 * 1024), 2)
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
                "is_directory": os.path.isdir(item_path),
                "modified_at": datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat(),
            }
            
            if not item_info["is_directory"]:
                # File-specific info
                item_info.update({
                    "size": os.path.getsize(item_path),
                    "type": mimetypes.guess_type(item_path)[0] or "application/octet-stream"
                })
            
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
async def delete_file(
    file_path: str,
    context: str = Query("drive", description="Storage context: 'drive' or 'photos'"),
    current_user: User = Depends(get_current_user),
    storage_paths: dict = Depends(get_current_user_storage)
):
    """Delete a file from user's storage area (drive or photos)"""
    
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
        if os.path.isfile(full_file_path):
            # Delete file
            os.remove(full_file_path)
            return {"message": "File deleted successfully", "type": "file"}
        elif os.path.isdir(full_file_path):
            # Delete folder and all its contents
            shutil.rmtree(full_file_path)
            return {"message": "Folder deleted successfully", "type": "folder"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file or folder"
            )
    except PermissionError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to delete this item"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete item: {str(e)}"
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
                    "is_directory": False,  # Recent files are always files, not directories
                    "size": os.path.getsize(file_path),
                    "type": mimetypes.guess_type(file_path)[0] or "application/octet-stream",
                    "modified_at": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
                    "modified_timestamp": os.path.getmtime(file_path)
                }
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
                        "is_directory": True,
                        "size": 0,
                        "type": "folder",
                        "modified_at": datetime.fromtimestamp(os.path.getmtime(dir_path)).isoformat(),
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
                        "is_directory": False,
                        "size": file_size,
                        "type": mime_type,
                        "category": file_category,
                        "modified_at": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
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
