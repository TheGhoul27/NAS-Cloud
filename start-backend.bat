@echo off
echo Checking venv directory...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    venv\Scripts\activate.bat
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to create virtual environment
        pause
        exit /b 1
    )
)

call venv\Scripts\activate.bat
echo Starting backend server...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
