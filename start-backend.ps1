<#
    start-backend.ps1
    Powershell 5+ script to:
    • create/activate a virtual env (if needed)
    • install requirements once
    • launch the FastAPI app with Uvicorn
#>

$ErrorActionPreference = 'Stop'   # fail fast on any un-handled error

Write-Host "`nChecking venv directory..."
Set-Location -Path "$PSScriptRoot\backend"       # jump into /backend relative to this script

if (-not (Test-Path 'venv')) {
    Write-Host "Creating virtual environment..."
    python -m venv venv

    # Activate the brand-new venv for the remainder of this session
    & .\venv\Scripts\Activate.ps1

    Write-Host "Installing dependencies..."
    pip install -r requirements.txt

    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌  Failed to install dependencies."
        Read-Host "Press <Enter> to exit"
        exit 1
    }
}

# (Re)activate the venv to be sure the correct interpreter is on PATH
& .\venv\Scripts\Activate.ps1

Write-Host "`nStarting backend server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
