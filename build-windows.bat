@echo off
REM Build script for NAS Cloud on Windows

echo ========================================
echo Building NAS Cloud Service for Windows
echo ========================================

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo Step 1: Installing frontend dependencies...
cd frontend
if not exist node_modules (
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo Step 2: Building React application...
npm run build 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to build React application
    cd ..
    pause
    exit /b 1
)
echo React build completed successfully
cd ..
echo Continuing to Python setup...

echo Step 3: Installing Python dependencies...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to create virtual environment
        cd ..
        pause
        exit /b 1
    )
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to activate virtual environment
        cd ..
        pause
        exit /b 1
    )

    echo Installing Python packages...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install Python dependencies
        echo Check the error messages above for details
        cd ..
        pause
        exit /b 1
    )
)
cd ..

echo Step 4: Building executable with PyInstaller...
echo Current directory: %CD%
call backend\venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to activate virtual environment for build
    pause
    exit /b 1
)

echo Running PyInstaller...
pyinstaller nas-cloud.spec --clean --noconfirm
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to build executable
    pause
    exit /b 1
)

echo ========================================
echo Build completed successfully!
echo ========================================
echo Executable location: dist\NAS-Cloud.exe
echo You can now distribute the 'dist' folder
echo ========================================
pause
