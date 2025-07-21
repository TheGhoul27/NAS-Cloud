# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for NAS Cloud
This file defines how to package the application into a single executable
"""

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Get the current directory
current_dir = os.getcwd()

# Define paths
backend_path = os.path.join(current_dir, 'backend')
frontend_dist_path = os.path.join(current_dir, 'frontend', 'dist')

# Collect all hidden imports for FastAPI and related packages
hidden_imports = [
    'uvicorn.main',
    'uvicorn.config',
    'uvicorn.server',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan.on',
    'uvicorn.loops.auto',
    'uvicorn.logging',
    'click',
    'h11',
    'httptools',
    'websockets',
    'watchfiles',
    'multipart',  # Fixed: was 'python_multipart'
    'email_validator',
    'starlette.applications',
    'starlette.middleware',
    'starlette.routing',
    'starlette.responses',
    'starlette.staticfiles',
    'fastapi.staticfiles',
    'sqlalchemy.sql.default_comparator',
    'sqlalchemy.pool',
    'sqlalchemy.dialects.sqlite',
    'passlib.handlers.bcrypt',  # Added: bcrypt handler
    'passlib.handlers.pbkdf2',  # Added: pbkdf2 handler
    'passlib.handlers.sha2_crypt',  # Added: sha2_crypt handler
    'bcrypt',  # Added: bcrypt library
    'app.api.auth',
    'app.api.files', 
    'app.api.admin',
    'app.models.database',
    'app.services.trash_cleanup',
    'app.auth.auth',
    'app.auth.dependencies',
    'app.schemas.auth',
    'app.schemas.storage',
    'app.services.storage',
    'pystray',  # Added: system tray support
    'PIL',      # Added: Pillow for icon creation
    'tkinter',  # Added: for message boxes (removing from excludes)
]

# Collect additional data files
datas = []

# Add React build files
if os.path.exists(frontend_dist_path):
    datas.append((frontend_dist_path, 'static'))
    print(f"✅ Found React build at: {frontend_dist_path}")
else:
    print(f"⚠️  React build not found at: {frontend_dist_path}")
    print("   Please run 'npm run build' in the frontend directory first")

# Add backend app modules
app_modules = ['api', 'auth', 'models', 'schemas', 'services']
for module in app_modules:
    module_path = os.path.join(backend_path, 'app', module)
    if os.path.exists(module_path):
        datas.append((module_path, f'backend/app/{module}'))

# Add database file if it exists
db_file = os.path.join(backend_path, 'nas_cloud.db')
if os.path.exists(db_file):
    datas.append((db_file, 'backend'))

# Add storage directory structure (create empty dirs)
storage_path = os.path.join(backend_path, 'nas_storage')
if os.path.exists(storage_path):
    datas.append((storage_path, 'backend/nas_storage'))

block_cipher = None

a = Analysis(
    ['launcher_service.py'],
    pathex=[current_dir, backend_path],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'pytest',
        'test',
        'tests',
        'unittest',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'PySide6',
        'qt5',
        'qt6',
        'cryptography.hazmat.backends.openssl',
        'cryptography.hazmat.backends.openssl.aead',
        'cryptography.hazmat.backends.openssl.backend',
        'cryptography.hazmat.backends.openssl.ciphers',
        'cryptography.hazmat.backends.openssl.cmac',
        'cryptography.hazmat.backends.openssl.decode_asn1',
        'cryptography.hazmat.backends.openssl.ec',
        'cryptography.hazmat.backends.openssl.rsa',
        'cryptography.hazmat.backends.openssl.utils',
        'jupyter',
        'notebook',
        'ipython',
        'zmq',
        'nacl',
        'psutil',
        'pysqlite2',  # Not needed for our SQLite usage
        'MySQLdb',    # Not using MySQL
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='NAS-Cloud',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False to hide console window (Windows only)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add path to .ico file here if you have an icon
)
