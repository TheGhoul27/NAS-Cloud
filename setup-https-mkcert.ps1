$ErrorActionPreference = 'Stop'

$frontendPath = Join-Path $PSScriptRoot 'frontend'
$certDir = Join-Path $frontendPath 'certs'
$keyFile = Join-Path $certDir 'localhost+lan-key.pem'
$certFile = Join-Path $certDir 'localhost+lan.pem'

Write-Host "Checking mkcert availability..." -ForegroundColor Cyan
$mkcertCmd = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertCmd) {
    Write-Host "mkcert is not installed. Attempting installation via winget..." -ForegroundColor Yellow
    winget install --id FiloSottile.mkcert -e --accept-package-agreements --accept-source-agreements
}

$mkcertCmd = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertCmd) {
    $fallbackMkcert = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\FiloSottile.mkcert_Microsoft.Winget.Source_8wekyb3d8bbwe\mkcert.exe'
    if (Test-Path $fallbackMkcert) {
        $mkcertCmd = [PSCustomObject]@{ Path = $fallbackMkcert }
    }
}

if (-not $mkcertCmd) {
    Write-Host "mkcert is still unavailable in PATH. Install manually and rerun this script." -ForegroundColor Red
    Write-Host "https://github.com/FiloSottile/mkcert" -ForegroundColor Yellow
    exit 1
}

$mkcertExe = $mkcertCmd.Path

Write-Host "Creating cert directory..." -ForegroundColor Cyan
if (-not (Test-Path $certDir)) {
    New-Item -Path $certDir -ItemType Directory | Out-Null
}

Write-Host "Installing local certificate authority (if needed)..." -ForegroundColor Cyan
& $mkcertExe -install

$ipList = @('127.0.0.1', 'localhost', '::1')

$localIPv4 = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } |
    Select-Object -ExpandProperty IPAddress -Unique)

if ($localIPv4) {
    $ipList += $localIPv4
}

$ipList = $ipList | Select-Object -Unique

Write-Host "Generating trusted cert for: $($ipList -join ', ')" -ForegroundColor Green
Push-Location $certDir
try {
    & $mkcertExe '-key-file' $keyFile '-cert-file' $certFile @ipList
}
finally {
    Pop-Location
}

Write-Host "" 
Write-Host "Trusted HTTPS cert created:" -ForegroundColor Green
Write-Host "  $certFile"
Write-Host "  $keyFile"

# Export mkcert root CA so other devices can install it
try {
    $caRoot = (& $mkcertExe -CAROOT 2>&1).Trim()
    $caCertSrc = Join-Path $caRoot 'rootCA.pem'
    $caCertDst = Join-Path $certDir 'rootCA.crt'

    if (Test-Path $caCertSrc) {
        Copy-Item $caCertSrc $caCertDst -Force
        Write-Host ""
        Write-Host "Root CA exported for client devices:" -ForegroundColor Green
        Write-Host "  $caCertDst"
        Write-Host ""
        Write-Host "Devices on your network need to trust this CA to enable PWA install." -ForegroundColor Yellow
        Write-Host "After starting the servers, devices can download the CA from:" -ForegroundColor Cyan

        foreach ($ip in ($ipList | Where-Object { $_ -ne '::1' })) {
            Write-Host "  https://${ip}:3000/ca.crt"
        }

        Write-Host ""
        Write-Host "Installation instructions:" -ForegroundColor Cyan
        Write-Host "  Android : Download and install as 'CA certificate' in Security settings"
        Write-Host "  iOS     : Download in Safari -> Settings > General > VPN & Device Management -> Trust"
        Write-Host "  Windows : Double-click .crt -> Install -> Trusted Root Certification Authorities"
        Write-Host "  macOS   : Double-click in Keychain Access -> Trust for SSL"
    }
    else {
        Write-Warning "Could not find root CA at: $caCertSrc - skipping CA export"
    }
}
catch {
    Write-Warning "CA export failed: $_"
}

Write-Host ""
Write-Host "Restart frontend servers and use:" -ForegroundColor Cyan
Write-Host "  https://localhost:3000/login"
Write-Host "  https://localhost:3001/login"
