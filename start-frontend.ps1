<#
    start-frontend.ps1
    • Installs node dependencies once
    • Launches the Vite/Next/React/etc. dev server
#>

$ErrorActionPreference = 'Stop'   # bail out on the first un-handled error

Write-Host "`nInstalling frontend dependencies..."
Set-Location -Path "$PSScriptRoot\frontend"   # move into /frontend relative to this script

if (-not (Test-Path 'node_modules')) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌  Failed to install frontend dependencies."
        Read-Host "Press <Enter> to exit"
        exit 1
    }
}

Write-Host "`nStarting frontend development server..."
npm run dev -- --host
