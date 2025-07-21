@echo off
echo Installing frontend dependencies...
cd frontend
if not exist node_modules (
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

echo Starting frontend development server...
npm run dev -- --host
