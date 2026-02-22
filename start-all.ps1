# All-in-One Startup Script
# Starts backend and both frontend apps (Drive on 3000, Photos on 3001)

$backendPath = ".\backend"
$frontendPath = ".\frontend"

# Free frontend ports if already occupied
foreach ($port in @(3000, 3001)) {
	$listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
		Select-Object -ExpandProperty OwningProcess -Unique

	foreach ($pid in $listeners) {
		if ($pid -and $pid -ne 0) {
			Write-Host "⚠️ Port $port is in use by PID $pid. Stopping process..." -ForegroundColor Yellow
			Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
		}
	}
}

# Start backend
Write-Host "🚀 Starting backend on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\start-backend.ps1"

# Wait for backend to start
Start-Sleep -Seconds 3

# Build frontend bundles for Express
Write-Host "🧱 Building Drive and Photos apps..." -ForegroundColor Green
Push-Location $frontendPath
try {
	npm run build:all
}
finally {
	Pop-Location
}

# Start Drive app
Write-Host "🚀 Starting Drive app on port 3000..." -ForegroundColor Green
Write-Host "   Drive login: https://localhost:3000/login" -ForegroundColor Cyan
Write-Host "   Admin login: https://localhost:3000/admin/login" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run serve:drive"

# Start Photos app
Write-Host "🚀 Starting Photos app on port 3001..." -ForegroundColor Green
Write-Host "   Photos login: https://localhost:3001/login" -ForegroundColor Cyan
Write-Host "   Admin login: https://localhost:3001/admin/login" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run serve:photos"

Write-Host "`n✅ All apps started! Opening in browser..." -ForegroundColor Green
Start-Sleep -Seconds 2

Start-Process "https://localhost:3000/login"
Start-Process "https://localhost:3000/admin/login"
Start-Process "https://localhost:3001/login"
Start-Process "https://localhost:3001/admin/login"
