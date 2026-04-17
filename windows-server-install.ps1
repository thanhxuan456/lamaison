#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Grand Palace Hotels & Resorts — Windows Server Installer
.DESCRIPTION
    Installs all prerequisites and configures the application as Windows Services.
    Requires Windows Server 2019 / 2022 and an internet connection.
.NOTES
    Run as Administrator:
    powershell -ExecutionPolicy Bypass -File windows-server-install.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─────────────────────────────────────────────
#  CONFIGURATION  (edit before running)
# ─────────────────────────────────────────────
$Config = @{
    # Where the app will live on disk
    InstallDir        = "C:\GrandPalace"

    # API back-end port
    ApiPort           = 8080

    # Front-end (Vite) port — expose this in your firewall/IIS
    FrontendPort      = 3000

    # PostgreSQL settings
    PgSuperPassword   = "ChangeMe123!"    # postgres superuser password
    PgDbName          = "grandpalace"
    PgDbUser          = "grandpalace"
    PgDbPassword      = "ChangeMe456!"

    # Clerk authentication keys  (get from https://dashboard.clerk.com)
    ClerkPublishableKey = "pk_live_REPLACE_WITH_YOUR_KEY"
    ClerkSecretKey      = "sk_live_REPLACE_WITH_YOUR_SECRET"

    # Node.js version to install (must be 20+)
    NodeVersion       = "22.14.0"

    # PostgreSQL version
    PgVersion         = "16"
}

# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────
function Write-Step([string]$msg) {
    Write-Host "`n━━━  $msg  ━━━" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "  ✔  $msg" -ForegroundColor Green
}

function Write-Info([string]$msg) {
    Write-Host "  ➜  $msg" -ForegroundColor Yellow
}

function Invoke-Download([string]$url, [string]$dest) {
    Write-Info "Downloading $url"
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $dest)
}

function Test-CommandExists([string]$cmd) {
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

# Reload PATH so newly installed tools are available in the same session
function Update-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

$TempDir = Join-Path $env:TEMP "GrandPalaceSetup"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# ─────────────────────────────────────────────
#  1. NODE.JS
# ─────────────────────────────────────────────
Write-Step "Node.js $($Config.NodeVersion)"

if (Test-CommandExists "node") {
    $existing = (node --version 2>&1).ToString().TrimStart("v")
    Write-OK "Node.js already installed — version $existing"
} else {
    $nodeInstaller = Join-Path $TempDir "node-installer.msi"
    $nodeUrl = "https://nodejs.org/dist/v$($Config.NodeVersion)/node-v$($Config.NodeVersion)-x64.msi"
    Invoke-Download $nodeUrl $nodeInstaller

    Write-Info "Installing Node.js (silent)..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn /norestart ADDLOCAL=ALL" -Wait -NoNewWindow
    Update-EnvPath
    Write-OK "Node.js $($Config.NodeVersion) installed"
}

# ─────────────────────────────────────────────
#  2. PNPM
# ─────────────────────────────────────────────
Write-Step "pnpm package manager"

if (Test-CommandExists "pnpm") {
    Write-OK "pnpm already installed — $(pnpm --version)"
} else {
    Write-Info "Installing pnpm via npm..."
    & npm install -g pnpm | Out-Null
    Update-EnvPath
    Write-OK "pnpm $(pnpm --version) installed"
}

# ─────────────────────────────────────────────
#  3. POSTGRESQL
# ─────────────────────────────────────────────
Write-Step "PostgreSQL $($Config.PgVersion)"

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-OK "PostgreSQL service already present — $($pgService.Name)"
    $pgBin = (Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory | Select-Object -First 1).FullName
} else {
    $pgInstaller = Join-Path $TempDir "pg-installer.exe"
    $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$($Config.PgVersion).4-1-windows-x64.exe"
    Invoke-Download $pgUrl $pgInstaller

    Write-Info "Installing PostgreSQL (silent)..."
    $pgArgs = "--mode unattended --unattendedmodeui none " +
              "--superpassword `"$($Config.PgSuperPassword)`" " +
              "--serverport 5432 " +
              "--datadir `"C:\Program Files\PostgreSQL\$($Config.PgVersion)\data`""
    Start-Process $pgInstaller -ArgumentList $pgArgs -Wait -NoNewWindow

    Update-EnvPath
    $pgBin = "C:\Program Files\PostgreSQL\$($Config.PgVersion)\bin"
    Write-OK "PostgreSQL $($Config.PgVersion) installed"
}

# Add psql to PATH for this session
if ($pgBin -and (Test-Path $pgBin)) {
    $env:Path += ";$pgBin"
}

# ─────────────────────────────────────────────
#  4. CREATE DATABASE & USER
# ─────────────────────────────────────────────
Write-Step "Database setup"

$env:PGPASSWORD = $Config.PgSuperPassword

$checkDb = & psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($Config.PgDbName)'" 2>&1
if ($checkDb -match "1") {
    Write-OK "Database '$($Config.PgDbName)' already exists"
} else {
    Write-Info "Creating role and database..."
    & psql -U postgres -c "CREATE ROLE `"$($Config.PgDbUser)`" WITH LOGIN PASSWORD '$($Config.PgDbPassword)';" 2>&1 | Out-Null
    & psql -U postgres -c "CREATE DATABASE `"$($Config.PgDbName)`" OWNER `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
    & psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE `"$($Config.PgDbName)`" TO `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
    Write-OK "Database '$($Config.PgDbName)' created"
}

$DatabaseUrl = "postgresql://$($Config.PgDbUser):$($Config.PgDbPassword)@localhost:5432/$($Config.PgDbName)"

# ─────────────────────────────────────────────
#  5. DEPLOY APP FILES
# ─────────────────────────────────────────────
Write-Step "Application files"

if (-not (Test-Path $Config.InstallDir)) {
    New-Item -ItemType Directory -Force -Path $Config.InstallDir | Out-Null
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Info "Copying app from '$scriptDir' to '$($Config.InstallDir)'..."

$excludes = @(".git", "node_modules", "dist", ".replit-artifact", "*.log", "windows-server-install.ps1")
$excludeFilter = $excludes | ForEach-Object { $_ }

Get-ChildItem -Path $scriptDir -Exclude $excludeFilter | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $Config.InstallDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-OK "Files copied to $($Config.InstallDir)"

# ─────────────────────────────────────────────
#  6. ENVIRONMENT FILE
# ─────────────────────────────────────────────
Write-Step "Environment configuration"

$envFile = Join-Path $Config.InstallDir ".env"
@"
# Grand Palace Hotels & Resorts — Environment Variables
# Generated by installer on $(Get-Date -Format "yyyy-MM-dd HH:mm")

# Database
DATABASE_URL=$DatabaseUrl

# Clerk Authentication  (https://dashboard.clerk.com)
CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)
CLERK_SECRET_KEY=$($Config.ClerkSecretKey)
VITE_CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)

# Ports
PORT=$($Config.ApiPort)
FRONTEND_PORT=$($Config.FrontendPort)
BASE_PATH=/
NODE_ENV=production
"@ | Set-Content -Path $envFile -Encoding UTF8

Write-OK ".env written to $envFile"

# ─────────────────────────────────────────────
#  7. INSTALL DEPENDENCIES & BUILD
# ─────────────────────────────────────────────
Write-Step "Installing dependencies (this may take a few minutes)"

Push-Location $Config.InstallDir

# Load env vars for build
Get-Content $envFile | Where-Object { $_ -match "^\s*[^#]" -and $_ -match "=" } | ForEach-Object {
    $parts = $_ -split "=", 2
    [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
}

Write-Info "pnpm install..."
& pnpm install --frozen-lockfile 2>&1 | Tee-Object -Variable pnpmOut | Out-Null
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed. Check logs above." }
Write-OK "Dependencies installed"

Write-Info "Running DB schema push..."
& pnpm --filter "@workspace/db" run push 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "  ⚠  DB push had warnings (may be OK if schema already exists)" -ForegroundColor Yellow }
else { Write-OK "DB schema applied" }

Write-Info "Building API server..."
& pnpm --filter "@workspace/api-server" run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "API server build failed." }
Write-OK "API server built"

Write-Info "Building frontend..."
& pnpm --filter "@workspace/hotel-system" run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
Write-OK "Frontend built"

Pop-Location

# ─────────────────────────────────────────────
#  8. WINDOWS SERVICES (NSSM)
# ─────────────────────────────────────────────
Write-Step "Windows Services via NSSM"

$nssmPath = Join-Path $TempDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    # Download NSSM (Non-Sucking Service Manager)
    $nssmZipUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip    = Join-Path $TempDir "nssm.zip"
    Invoke-Download $nssmZipUrl $nssmZip
    Expand-Archive -Path $nssmZip -DestinationPath $TempDir -Force
    $nssmExe = Get-ChildItem -Path $TempDir -Filter "nssm.exe" -Recurse | Where-Object { $_.FullName -match "win64" } | Select-Object -First 1
    Copy-Item $nssmExe.FullName $nssmPath
}

function Install-NssmService([string]$svcName, [string]$displayName, [string]$exe, [string]$args, [hashtable]$envVars) {
    $existing = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Info "Removing existing service '$svcName'..."
        & $nssmPath stop  $svcName 2>&1 | Out-Null
        & $nssmPath remove $svcName confirm 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }

    & $nssmPath install $svcName $exe $args
    & $nssmPath set $svcName DisplayName  $displayName
    & $nssmPath set $svcName Description  "Grand Palace Hotels & Resorts — $displayName"
    & $nssmPath set $svcName AppDirectory  $Config.InstallDir
    & $nssmPath set $svcName Start        SERVICE_AUTO_START
    & $nssmPath set $svcName AppStdout    (Join-Path $Config.InstallDir "logs\$svcName-stdout.log")
    & $nssmPath set $svcName AppStderr    (Join-Path $Config.InstallDir "logs\$svcName-stderr.log")
    & $nssmPath set $svcName AppRotateFiles 1
    & $nssmPath set $svcName AppRotateBytes 10485760

    foreach ($kv in $envVars.GetEnumerator()) {
        & $nssmPath set $svcName AppEnvironmentExtra "$($kv.Key)=$($kv.Value)"
    }

    Write-OK "Service '$svcName' registered"
}

New-Item -ItemType Directory -Force -Path (Join-Path $Config.InstallDir "logs") | Out-Null
$nodePath = (Get-Command node).Source

# API service
Install-NssmService `
    -svcName    "GrandPalaceAPI" `
    -displayName "Grand Palace — API Server" `
    -exe         $nodePath `
    -args        "--enable-source-maps `"$Config.InstallDir\artifacts\api-server\dist\index.mjs`"" `
    -envVars     @{
        PORT         = $Config.ApiPort
        DATABASE_URL = $DatabaseUrl
        CLERK_SECRET_KEY = $Config.ClerkSecretKey
        NODE_ENV     = "production"
    }

# Frontend static service (using `vite preview` — replace with IIS/nginx in production)
$vitePath = Join-Path $Config.InstallDir "node_modules\.bin\vite.cmd"
Install-NssmService `
    -svcName    "GrandPalaceFrontend" `
    -displayName "Grand Palace — Frontend" `
    -exe         "cmd.exe" `
    -args        "/c `"$vitePath`" preview --config `"$Config.InstallDir\artifacts\hotel-system\vite.config.ts`" --host 0.0.0.0 --port $($Config.FrontendPort)" `
    -envVars     @{
        PORT                      = $Config.FrontendPort
        BASE_PATH                 = "/"
        VITE_CLERK_PUBLISHABLE_KEY = $Config.ClerkPublishableKey
        NODE_ENV                  = "production"
    }

# ─────────────────────────────────────────────
#  9. START SERVICES
# ─────────────────────────────────────────────
Write-Step "Starting services"

Start-Service -Name "GrandPalaceAPI"
Start-Sleep -Seconds 3
Start-Service -Name "GrandPalaceFrontend"
Start-Sleep -Seconds 3

$apiStatus      = (Get-Service -Name "GrandPalaceAPI").Status
$frontendStatus = (Get-Service -Name "GrandPalaceFrontend").Status

Write-OK "GrandPalaceAPI      — $apiStatus"
Write-OK "GrandPalaceFrontend — $frontendStatus"

# ─────────────────────────────────────────────
#  10. FIREWALL RULES
# ─────────────────────────────────────────────
Write-Step "Windows Firewall rules"

netsh advfirewall firewall add rule `
    name="Grand Palace API" dir=in action=allow protocol=TCP localport=$($Config.ApiPort) | Out-Null
netsh advfirewall firewall add rule `
    name="Grand Palace Frontend" dir=in action=allow protocol=TCP localport=$($Config.FrontendPort) | Out-Null

Write-OK "Firewall rules added for ports $($Config.ApiPort) and $($Config.FrontendPort)"

# ─────────────────────────────────────────────
#  DONE
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Grand Palace Hotels & Resorts — Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend  →  http://localhost:$($Config.FrontendPort)/" -ForegroundColor White
Write-Host "  API       →  http://localhost:$($Config.ApiPort)/api/" -ForegroundColor White
Write-Host ""
Write-Host "  Services (run as Windows Services, auto-start on reboot):" -ForegroundColor White
Write-Host "    GrandPalaceAPI       — API back-end" -ForegroundColor White
Write-Host "    GrandPalaceFrontend  — Vite static server" -ForegroundColor White
Write-Host ""
Write-Host "  Logs:  $($Config.InstallDir)\logs\" -ForegroundColor White
Write-Host ""
Write-Host "  ⚠  Remember to:" -ForegroundColor Yellow
Write-Host "     1. Replace Clerk keys in $envFile" -ForegroundColor Yellow
Write-Host "     2. Point your domain / IIS reverse proxy to port $($Config.FrontendPort)" -ForegroundColor Yellow
Write-Host "     3. Use a proper SSL certificate (IIS ARR or nginx on Windows)" -ForegroundColor Yellow
Write-Host ""
