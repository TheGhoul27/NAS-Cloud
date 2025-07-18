import asyncio
import schedule
import time
import threading
import os
import json
import shutil
from datetime import datetime, timedelta
from app.models.database import get_session, User
from app.services.storage import storage_service
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrashCleanupService:
    def __init__(self):
        self.is_running = False
        self.cleanup_thread = None

    def start_background_cleanup(self):
        """Start the background cleanup service"""
        if not self.is_running:
            self.is_running = True
            self.cleanup_thread = threading.Thread(target=self._run_scheduler, daemon=True)
            self.cleanup_thread.start()
            logger.info("Trash cleanup service started")

    def stop_background_cleanup(self):
        """Stop the background cleanup service"""
        self.is_running = False
        if self.cleanup_thread:
            self.cleanup_thread.join()
        logger.info("Trash cleanup service stopped")

    def _run_scheduler(self):
        """Run the scheduler in a separate thread"""
        # Schedule cleanup to run daily at 2 AM
        schedule.every().day.at("02:00").do(self._cleanup_all_users_trash)
        
        # Also run immediately on startup for testing
        self._cleanup_all_users_trash()
        
        while self.is_running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

    def _cleanup_all_users_trash(self):
        """Cleanup trash for all users"""
        logger.info("Starting automatic trash cleanup for all users")
        
        try:
            # Get all users from database
            with next(get_session()) as session:
                users = session.query(User).all()
                
                for user in users:
                    try:
                        self._cleanup_user_trash(user.storage_id)
                    except Exception as e:
                        logger.error(f"Failed to cleanup trash for user {user.storage_id}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"Failed to get users for trash cleanup: {str(e)}")

    def _cleanup_user_trash(self, storage_id):
        """Cleanup trash for a specific user"""
        try:
            # Get user storage path
            user_storage_path = storage_service.get_user_paths(storage_id)
            trash_dir = os.path.join(user_storage_path['user_path'], '.trash')
            
            if not os.path.exists(trash_dir):
                return
            
            deleted_count = 0
            cutoff_date = datetime.now() - timedelta(days=30)
            
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
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} items for user {storage_id}")
                
        except Exception as e:
            logger.error(f"Failed to cleanup trash for user {storage_id}: {str(e)}")

    def cleanup_user_trash_now(self, storage_id):
        """Manually trigger cleanup for a specific user"""
        self._cleanup_user_trash(storage_id)

# Global instance
trash_cleanup_service = TrashCleanupService()
