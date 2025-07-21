@echo off
REM Development run script for NAS Cloud Service on Windows

echo ========================================
echo Starting NAS Cloud Service in Development Mode
echo ========================================

REM Check if React build exists
if not exist "frontend\dist" (
    echo Building React app first...
    cd frontend
    npm run build
    cd ..
)

REM Start the service application
python launcher_service.py
