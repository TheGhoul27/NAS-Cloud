@echo off
REM Quick development setup for NAS Cloud

echo ========================================
echo NAS Cloud Development Setup
echo ========================================

REM Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo Installing frontend dependencies...
cd frontend
npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install frontend dependencies
    pause
    exit /b 1
)

echo Building frontend...
npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Failed to build frontend
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start NAS Cloud:
echo   Backend:  cd backend ^&^& uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo   Frontend: cd frontend ^&^& npm run dev
echo.
echo Or build frontend and serve from backend:
echo   cd frontend ^&^& npm run build
echo   cd backend ^&^& uvicorn app.main:app --host 0.0.0.0 --port 8000
echo.
pause
