# PowerShell Build Script for NAS Cloud Service on Windows

Write-Host "========================================" -ForegroundColor Green
Write-Host "Building NAS Cloud Service for Windows" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version
    Write-Host "Python version: $pythonVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python from https://python.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Step 1: Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install frontend dependencies" -ForegroundColor Red
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "node_modules already exists, skipping npm install" -ForegroundColor Cyan
}

Write-Host "Step 2: Building React application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to build React application" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "React build completed successfully" -ForegroundColor Green
Set-Location ..

Write-Host "Step 3: Installing Python dependencies..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to create virtual environment" -ForegroundColor Red
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & ".\venv\Scripts\Activate.ps1"

    Write-Host "Installing Python packages..." -ForegroundColor Cyan
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install Python dependencies" -ForegroundColor Red
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "Virtual environment already exists" -ForegroundColor Cyan
}
Set-Location ..

Write-Host "Step 4: Building executable with PyInstaller..." -ForegroundColor Yellow
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan
& "backend\venv\Scripts\Activate.ps1"

Write-Host "Running PyInstaller..." -ForegroundColor Cyan
pyinstaller nas-cloud.spec --clean --noconfirm
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to build executable" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Executable location: dist\NAS-Cloud.exe" -ForegroundColor Cyan
Write-Host "The service will run in the background with system tray icon" -ForegroundColor Cyan
Write-Host "You can now distribute the 'dist' folder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Read-Host "Press Enter to exit"
