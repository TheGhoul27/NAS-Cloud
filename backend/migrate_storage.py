#!/usr/bin/env python3
"""
NAS Cloud Storage Migration Script

This script helps migrate from the old single-drive storage system to the new multi-drive system.
It will:
1. Create the new database tables if they don't exist
2. Create a default drive using the existing NAS_STORAGE_PATH
3. Update existing users to use the default drive
4. Verify the migration was successful

Usage:
    python migrate_storage.py
"""

import os
import sys
import shutil
from pathlib import Path
from sqlmodel import Session, select
from datetime import datetime

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from app.models.database import create_db_and_tables, engine, User, StorageDrive, DriveStatus
from app.services.storage import storage_service

def migrate_storage():
    """Migrate from single-drive to multi-drive storage system"""
    
    print("🚀 Starting NAS Cloud Storage Migration...")
    print("=" * 50)
    
    # Check if old database exists
    db_path = Path("nas_cloud.db")
    backup_path = Path("nas_cloud_backup.db")
    
    # Step 1: Check if we need to migrate the database
    print("🔍 Checking database schema...")
    needs_migration = False
    
    if db_path.exists():
        try:
            # Try to create a connection to check the schema
            import sqlite3
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # Check if storage_drive_id column exists
            cursor.execute("PRAGMA table_info(user)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'storage_drive_id' not in columns:
                print("📝 Database schema needs migration")
                needs_migration = True
            else:
                print("✅ Database schema is up to date")
            
            conn.close()
            
        except Exception as e:
            print(f"⚠️  Could not check database schema: {e}")
            needs_migration = True
    
    if needs_migration and db_path.exists():
        print("🔄 Migrating database schema...")
        try:
            import sqlite3
            
            # Backup the old database
            if backup_path.exists():
                backup_path.unlink()
            shutil.copy2(db_path, backup_path)
            print(f"📦 Backed up database to {backup_path}")
            
            # Read existing user data from old database
            old_conn = sqlite3.connect(str(backup_path))
            old_cursor = old_conn.cursor()
            
            old_cursor.execute("PRAGMA table_info(user)")
            old_columns = [column[1] for column in old_cursor.fetchall()]
            has_storage_quota = 'storage_quota_gb' in old_columns

            if has_storage_quota:
                old_cursor.execute("""
                    SELECT id, email, password_hash, firstname, lastname, phone, storage_id,
                           role, status, created_at, approved_at, approved_by, is_active, storage_quota_gb
                    FROM user
                """)
            else:
                old_cursor.execute("""
                    SELECT id, email, password_hash, firstname, lastname, phone, storage_id,
                           role, status, created_at, approved_at, approved_by, is_active
                    FROM user
                """)

            user_data = old_cursor.fetchall()
            old_conn.close()
            
            print(f"📊 Found {len(user_data)} existing users to migrate")
            
            # Remove old database and create new one
            db_path.unlink()
            
            # Create new database with updated schema
            create_db_and_tables()
            print("✅ Created new database with updated schema")
            
            # Restore user data
            if user_data:
                print("🔄 Restoring user data...")
                with Session(engine) as session:
                    for row in user_data:
                        # Parse the row data
                        if has_storage_quota:
                            (user_id, email, password_hash, firstname, lastname, phone, storage_id,
                             role, status, created_at, approved_at, approved_by, is_active, storage_quota_gb) = row
                        else:
                            (user_id, email, password_hash, firstname, lastname, phone, storage_id,
                             role, status, created_at, approved_at, approved_by, is_active) = row
                            storage_quota_gb = 20.0
                        
                        # Parse datetime strings if they exist
                        from datetime import datetime
                        if isinstance(created_at, str):
                            try:
                                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                            except:
                                created_at = datetime.utcnow()
                        
                        if isinstance(approved_at, str):
                            try:
                                approved_at = datetime.fromisoformat(approved_at.replace('Z', '+00:00'))
                            except:
                                approved_at = None
                        elif approved_at == '':
                            approved_at = None
                        
                        new_user = User(
                            id=user_id,
                            email=email,
                            password_hash=password_hash,
                            firstname=firstname,
                            lastname=lastname,
                            phone=phone,
                            storage_id=storage_id,
                            storage_drive_id=None,  # Will be set later
                            storage_quota_gb=float(storage_quota_gb) if storage_quota_gb is not None else 20.0,
                            role=role,
                            status=status,
                            created_at=created_at,
                            approved_at=approved_at,
                            approved_by=approved_by,
                            is_active=bool(is_active)
                        )
                        session.add(new_user)
                    session.commit()
                print(f"✅ Restored {len(user_data)} users with new schema")
        except Exception as e:
            print(f"❌ Error migrating database schema: {e}")
            # Restore backup if migration failed
            if backup_path.exists():
                if db_path.exists():
                    db_path.unlink()
                shutil.copy2(backup_path, db_path)
                print(f"🔄 Restored backup database")
            return False
    else:
        # Step 1: Create database tables (for new installations)
        print("📊 Creating/updating database tables...")
        try:
            create_db_and_tables()
            print("✅ Database tables created successfully")
        except Exception as e:
            print(f"❌ Error creating database tables: {e}")
            return False
    
    # Step 2: Initialize storage service (this creates default drive if needed)
    print("\n💾 Initializing storage service...")
    try:
        storage_service._ensure_initialized()
        print("✅ Storage service initialized successfully")
    except Exception as e:
        print(f"❌ Error initializing storage service: {e}")
        return False
    
    # Step 3: Check and update users without assigned drives
    print("\n👥 Updating user drive assignments...")
    try:
        with Session(engine) as session:
            # Get default drive
            default_drive = session.exec(
                select(StorageDrive).where(
                    StorageDrive.is_default == True,
                    StorageDrive.status == DriveStatus.ACTIVE
                )
            ).first()
            
            if not default_drive:
                print("❌ No default drive found!")
                return False
            
            # Find users without assigned drives
            users_without_drives = session.exec(
                select(User).where(User.storage_drive_id == None)
            ).all()
            
            if users_without_drives:
                print(f"📝 Found {len(users_without_drives)} users without drive assignments")
                
                for user in users_without_drives:
                    user.storage_drive_id = default_drive.id
                    session.add(user)
                    print(f"   ✅ Assigned user {user.email} to drive '{default_drive.name}'")
                
                session.commit()
                print(f"✅ Updated {len(users_without_drives)} user(s) successfully")
            else:
                print("✅ All users already have drive assignments")
                
    except Exception as e:
        print(f"❌ Error updating user drive assignments: {e}")
        return False
    
    # Step 4: Verify migration
    print("\n🔍 Verifying migration...")
    try:
        with Session(engine) as session:
            # Count drives
            drives = session.exec(select(StorageDrive)).all()
            active_drives = [d for d in drives if d.status == DriveStatus.ACTIVE]
            default_drives = [d for d in drives if d.is_default]
            
            # Count users
            users = session.exec(select(User)).all()
            users_with_drives = [u for u in users if u.storage_drive_id is not None]
            
            print(f"📊 Migration Summary:")
            print(f"   📁 Total drives: {len(drives)}")
            print(f"   ✅ Active drives: {len(active_drives)}")
            print(f"   ⭐ Default drives: {len(default_drives)}")
            print(f"   👤 Total users: {len(users)}")
            print(f"   🔗 Users with drive assignments: {len(users_with_drives)}")
            
            if len(default_drives) != 1:
                print(f"⚠️  Warning: Expected 1 default drive, found {len(default_drives)}")
            
            if len(users_with_drives) != len(users):
                print(f"⚠️  Warning: {len(users) - len(users_with_drives)} users still need drive assignment")
                return False
                
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        return False
    
    print("\n🎉 Migration completed successfully!")
    print("\n📝 Next steps:")
    print("   1. Start your NAS Cloud server")
    print("   2. Log in to the admin panel")
    print("   3. Go to the Storage tab to manage drives")
    print("   4. Add additional drives as needed")
    
    return True

def show_current_status():
    """Show current storage configuration"""
    print("\n📊 Current Storage Configuration")
    print("=" * 35)
    
    try:
        with Session(engine) as session:
            drives = session.exec(select(StorageDrive)).all()
            
            if not drives:
                print("📁 No drives configured")
                return
            
            for drive in drives:
                status_icon = "✅" if drive.status == DriveStatus.ACTIVE else "❌"
                default_icon = "⭐" if drive.is_default else "  "
                
                print(f"{status_icon} {default_icon} {drive.name}")
                print(f"     Path: {drive.path}")
                print(f"     Status: {drive.status}")
                if drive.capacity_gb:
                    print(f"     Capacity: {drive.capacity_gb} GB")
                if drive.description:
                    print(f"     Description: {drive.description}")
                print()
                
    except Exception as e:
        print(f"❌ Error reading storage configuration: {e}")

if __name__ == "__main__":
    print("NAS Cloud Storage Migration Tool")
    print("================================")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--status":
        show_current_status()
    else:
        if migrate_storage():
            show_current_status()
        else:
            print("\n❌ Migration failed. Please check the errors above.")
            sys.exit(1)
