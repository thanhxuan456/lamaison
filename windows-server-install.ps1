#Requires -RunAsAdministrator
# Grand Palace Hotels & Resorts - Windows Server Installer
# Compatible with Windows Server 2019 / 2022 / 2025
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File windows-server-install.ps1
#
# FLAGS:
#   -Reinstall    Force reinstall even if already installed
#   -SkipBuild    Skip npm build (useful for config-only updates)
#   -Uninstall    Remove services and optionally delete install directory
#
# WHAT THIS SCRIPT DOES:
#   1.  Checks system requirements (OS, RAM, disk)
#   2.  Installs Node.js (if missing)
#   3.  Installs pnpm (if missing)
#   4.  Sets up database (Neon cloud or local PostgreSQL)
#   5.  Copies application files
#   6.  Writes .env configuration file
#   7.  Patches package.json / pnpm-workspace.yaml for Windows
#   8.  Installs dependencies (pnpm install)
#   9.  Pushes database schema + seeds initial data
#   10. Builds API server + frontend
#   11. Installs Windows Services via NSSM (auto-start)
#   12. Opens firewall ports
#   13. Performs health check

param(
    [switch]$Reinstall,
    [switch]$SkipBuild,
    [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ===========================================================
# CONFIGURATION - Edit these values before running
# ===========================================================
$Config = @{
    # Where the app will be installed
    InstallDir          = "C:\GrandPalace"

    # API back-end port (internal)
    ApiPort             = 8080

    # Front-end port (exposed to users — open this in your firewall)
    FrontendPort        = 3000

    # ── DATABASE (choose one) ─────────────────────────────────────────────
    # Option A: Neon cloud database (recommended — no local PG install needed)
    #   Set NeonDatabaseUrl to your Neon connection string, leave UseLocalPg = $false
    # Option B: Local PostgreSQL
    #   Set UseLocalPg = $true, NeonDatabaseUrl = ""
    UseLocalPg          = $false
    NeonDatabaseUrl     = "postgresql://neondb_owner:npg_YCEZLyV6gwi7@ep-fragrant-sunset-a18l1eva-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

    # Local PostgreSQL settings (used only when UseLocalPg = $true)
    PgSuperPassword     = "ChangeMe123!"
    PgDbName            = "grandpalace"
    PgDbUser            = "grandpalace"
    PgDbPassword        = "ChangeMe456!"

    # ── CLERK AUTHENTICATION ──────────────────────────────────────────────
    # Get these from https://dashboard.clerk.com → Your App → API Keys
    # Use PRODUCTION keys for live deployments (pk_live_... / sk_live_...)
    ClerkPublishableKey = "pk_live_REPLACE_WITH_YOUR_KEY"
    ClerkSecretKey      = "sk_live_REPLACE_WITH_YOUR_SECRET"

    # ── MOMO PAYMENT ──────────────────────────────────────────────────────
    # For testing: leave sandbox defaults below
    # For production: replace with your real MoMo Business credentials from https://business.momo.vn
    MomoPartnerCode     = "MOMO"
    MomoAccessKey       = "F8BBA842ECF85"
    MomoSecretKey       = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
    MomoEndpoint        = "https://test-payment.momo.vn/v2/gateway/api/create"

    # ── PUBLIC URLs (must be reachable from the internet for MoMo callbacks) ──
    # Replace YOUR_SERVER_IP with your server's actual IP or domain name
    ApiPublicUrl        = "http://YOUR_SERVER_IP:8080"
    FrontendUrl         = "http://YOUR_SERVER_IP:3000"

    # ── VERSIONS ──────────────────────────────────────────────────────────
    NodeVersion         = "22.14.0"
    PgVersion           = "16"

    # ── SYSTEM REQUIREMENTS ───────────────────────────────────────────────
    MinRamGB            = 2
    MinDiskGB           = 10
}
# ===========================================================

# Paths
$LogDir  = Join-Path $Config.InstallDir "logs"
$LogFile = Join-Path $env:TEMP "GrandPalaceInstall_$(Get-Date -Format 'yyyyMMdd_HHmmss').log"
$TempDir = Join-Path $env:TEMP "GrandPalaceSetup"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# Start transcript so everything is logged
Start-Transcript -Path $LogFile -Append | Out-Null
Write-Host "Installation log: $LogFile" -ForegroundColor DarkGray

# ===========================================================
# HELPERS
# ===========================================================
function Write-Step([string]$n, [string]$msg) {
    Write-Host ""
    Write-Host "[$n] $msg" -ForegroundColor Cyan
    Write-Host "    $('─' * 55)" -ForegroundColor DarkGray
}
function Write-OK([string]$msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info([string]$msg) { Write-Host "  --> $msg" -ForegroundColor Yellow }
function Write-Warn([string]$msg) { Write-Host "  [!]  $msg" -ForegroundColor DarkYellow }

function Invoke-Download([string]$url, [string]$dest) {
    Write-Info "Downloading: $url"
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $dest)
    } catch {
        Write-Warn "WebClient failed, trying Invoke-WebRequest..."
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    }
}

function Test-CommandExists([string]$cmd) {
    return ($null -ne (Get-Command $cmd -ErrorAction SilentlyContinue))
}

function Update-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = "$machinePath;$userPath"
}

function New-RandomSecret([int]$length = 64) {
    $bytes = New-Object byte[] $length
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# ===========================================================
# UNINSTALL MODE
# ===========================================================
if ($Uninstall) {
    Write-Host ""
    Write-Host "=== UNINSTALL MODE ===" -ForegroundColor Red
    foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s) {
            Write-Info "Stopping and removing service: $svc"
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            sc.exe delete $svc | Out-Null
            Write-OK "Removed: $svc"
        }
    }
    netsh advfirewall firewall delete rule name="Grand Palace API"      | Out-Null
    netsh advfirewall firewall delete rule name="Grand Palace Frontend" | Out-Null
    Write-OK "Firewall rules removed"
    $confirm = Read-Host "Delete install directory '$($Config.InstallDir)'? (y/N)"
    if ($confirm -eq "y") {
        Remove-Item $Config.InstallDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-OK "Install directory removed"
    }
    Stop-Transcript | Out-Null
    exit 0
}

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
New-Item -ItemType Directory -Force -Path $Config.InstallDir | Out-Null

# ===========================================================
# STEP 1 — SYSTEM REQUIREMENTS CHECK
# ===========================================================
Write-Step "1/12" "System requirements check"

# OS version
$os = Get-CimInstance Win32_OperatingSystem
Write-Info "OS: $($os.Caption) (Build $($os.BuildNumber))"
if ($os.BuildNumber -lt 17763) {
    throw "Windows Server 2019 or later is required (build 17763+). Current build: $($os.BuildNumber)"
}
Write-OK "OS version OK"

# RAM
$ramGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($ramGB -lt $Config.MinRamGB) {
    throw "Insufficient RAM. Required: $($Config.MinRamGB) GB, Available: $ramGB GB"
}
Write-OK "RAM: $ramGB GB"

# Disk
$disk = Get-PSDrive -Name (Split-Path $Config.InstallDir -Qualifier).TrimEnd(":")
$freeGB = [math]::Round($disk.Free / 1GB, 1)
if ($freeGB -lt $Config.MinDiskGB) {
    throw "Insufficient disk space. Required: $($Config.MinDiskGB) GB, Available: $freeGB GB"
}
Write-OK "Disk free: $freeGB GB"

# ===========================================================
# STEP 2 — NODE.JS
# ===========================================================
Write-Step "2/12" "Node.js $($Config.NodeVersion)"

if ((Test-CommandExists "node") -and -not $Reinstall) {
    $v = (node --version 2>&1).ToString().TrimStart("v")
    Write-OK "Node.js already installed: v$v"
} else {
    $nodeInstaller = Join-Path $TempDir "node-installer.msi"
    $nodeUrl = "https://nodejs.org/dist/v$($Config.NodeVersion)/node-v$($Config.NodeVersion)-x64.msi"
    Invoke-Download $nodeUrl $nodeInstaller
    Write-Info "Installing Node.js silently..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn /norestart ADDLOCAL=ALL" -Wait -NoNewWindow
    Update-EnvPath
    Write-OK "Node.js $($Config.NodeVersion) installed"
}

# ===========================================================
# STEP 3 — PNPM
# ===========================================================
Write-Step "3/12" "pnpm package manager"

if ((Test-CommandExists "pnpm") -and -not $Reinstall) {
    Write-OK "pnpm already installed: $(pnpm --version)"
} else {
    Write-Info "Installing pnpm via npm..."
    & npm install -g pnpm | Out-Null
    Update-EnvPath
    Write-OK "pnpm installed: $(pnpm --version)"
}

# ===========================================================
# STEP 4 — DATABASE SETUP
# ===========================================================
Write-Step "4/12" "Database setup"

if ($Config.UseLocalPg) {
    Write-Info "Using local PostgreSQL $($Config.PgVersion)"
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService) {
        Write-OK "PostgreSQL already installed: $($pgService.Name)"
        $pgBinSearch = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory -ErrorAction SilentlyContinue
        if ($pgBinSearch) { $pgBin = ($pgBinSearch | Select-Object -First 1).FullName }
    } else {
        $pgInstaller = Join-Path $TempDir "pg-installer.exe"
        # Try multiple minor versions for robustness
        $pgFound = $false
        foreach ($minor in @("4", "3", "2", "1", "0")) {
            $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$($Config.PgVersion).$minor-1-windows-x64.exe"
            try {
                Invoke-Download $pgUrl $pgInstaller
                $pgFound = $true
                break
            } catch { continue }
        }
        if (-not $pgFound) { throw "Could not download PostgreSQL installer. Check your internet connection." }
        Write-Info "Installing PostgreSQL silently (this takes a few minutes)..."
        $pgArgs = "--mode unattended --unattendedmodeui none --superpassword $($Config.PgSuperPassword) --serverport 5432"
        Start-Process $pgInstaller -ArgumentList $pgArgs -Wait -NoNewWindow
        Update-EnvPath
        $pgBin = "C:\Program Files\PostgreSQL\$($Config.PgVersion)\bin"
        Write-OK "PostgreSQL $($Config.PgVersion) installed"
    }
    if ($pgBin -and (Test-Path $pgBin)) { $env:Path = "$($env:Path);$pgBin" }

    $env:PGPASSWORD = $Config.PgSuperPassword
    $checkDb = & psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($Config.PgDbName)'" 2>&1
    if ($checkDb -match "1") {
        Write-OK "Database '$($Config.PgDbName)' already exists"
    } else {
        Write-Info "Creating database user and database..."
        & psql -U postgres -c "CREATE ROLE `"$($Config.PgDbUser)`" WITH LOGIN PASSWORD '$($Config.PgDbPassword)';" 2>&1 | Out-Null
        & psql -U postgres -c "CREATE DATABASE `"$($Config.PgDbName)`" OWNER `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
        & psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE `"$($Config.PgDbName)`" TO `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
        Write-OK "Database '$($Config.PgDbName)' created"
    }
    $DatabaseUrl     = "postgresql://$($Config.PgDbUser):$($Config.PgDbPassword)@localhost:5432/$($Config.PgDbName)"
    $NeonDatabaseUrl = ""
} else {
    Write-Info "Using Neon cloud database (no local PostgreSQL install required)"
    if (-not $Config.NeonDatabaseUrl -or $Config.NeonDatabaseUrl -like "*PASS*" -or $Config.NeonDatabaseUrl -like "*ep-xxx*") {
        throw "NeonDatabaseUrl is not configured. Edit the `$Config block at the top of this script."
    }
    $DatabaseUrl     = $Config.NeonDatabaseUrl
    $NeonDatabaseUrl = $Config.NeonDatabaseUrl
    Write-OK "Neon database: $($NeonDatabaseUrl.Split('@')[1].Split('/')[0])"
}

# ===========================================================
# STEP 5 — COPY APPLICATION FILES
# ===========================================================
Write-Step "5/12" "Copying application files"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Info "Source : $scriptDir"
Write-Info "Target : $($Config.InstallDir)"

robocopy $scriptDir $Config.InstallDir /E /XD ".git" "node_modules" "dist" ".replit-artifact" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "File copy failed (robocopy exit code $LASTEXITCODE)." }

$schemaFile = Join-Path $Config.InstallDir "lib\db\src\schema\index.ts"
if (-not (Test-Path $schemaFile)) {
    Write-Info "lib directory missing — copying directly..."
    robocopy (Join-Path $scriptDir "lib") (Join-Path $Config.InstallDir "lib") /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
}
Write-OK "Files copied"

# ===========================================================
# STEP 6 — WRITE .ENV FILE
# ===========================================================
Write-Step "6/12" "Writing environment configuration"

$envFile = Join-Path $Config.InstallDir ".env"

# Re-use existing SESSION_SECRET if already present (so services keep sessions valid after reinstall)
$existingSecret = ""
if (Test-Path $envFile) {
    $existingLines = Get-Content $envFile -ErrorAction SilentlyContinue
    $secretLine = $existingLines | Where-Object { $_ -match "^SESSION_SECRET=" } | Select-Object -First 1
    if ($secretLine) { $existingSecret = $secretLine.Split("=", 2)[1] }
}
$sessionSecret = if ($existingSecret) { $existingSecret } else { New-RandomSecret 64 }

# Build Clerk proxy URL for frontend (proxied through API server)
$clerkProxyUrl = "$($Config.ApiPublicUrl)/api/__clerk"

$envContent = @(
    "DATABASE_URL=$DatabaseUrl",
    "NEON_DATABASE_URL=$NeonDatabaseUrl",
    "CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "CLERK_SECRET_KEY=$($Config.ClerkSecretKey)",
    "VITE_CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "VITE_CLERK_PROXY_URL=$clerkProxyUrl",
    "VITE_API_URL=$($Config.ApiPublicUrl)",
    "SESSION_SECRET=$sessionSecret",
    "PORT=$($Config.ApiPort)",
    "FRONTEND_PORT=$($Config.FrontendPort)",
    "BASE_PATH=/",
    "NODE_ENV=production",
    "MOMO_PARTNER_CODE=$($Config.MomoPartnerCode)",
    "MOMO_ACCESS_KEY=$($Config.MomoAccessKey)",
    "MOMO_SECRET_KEY=$($Config.MomoSecretKey)",
    "MOMO_ENDPOINT=$($Config.MomoEndpoint)",
    "API_PUBLIC_URL=$($Config.ApiPublicUrl)",
    "FRONTEND_URL=$($Config.FrontendUrl)"
)
[System.IO.File]::WriteAllText($envFile, ($envContent -join "`n") + "`n", $utf8NoBom)
Write-OK ".env written to $envFile"

# Load all env vars into the current process for subsequent steps
foreach ($line in $envContent) {
    if ($line -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}

# ===========================================================
# STEP 7 — PATCH PACKAGE.JSON FOR WINDOWS
# ===========================================================
Write-Step "7/12" "Patching package.json for Windows compatibility"

$rootPkg = Join-Path $Config.InstallDir "package.json"
$pkgJson = Get-Content $rootPkg -Raw | ConvertFrom-Json

if ($pkgJson.scripts.PSObject.Properties.Name -contains "preinstall") {
    $pkgJson.scripts.PSObject.Properties.Remove("preinstall")
    [System.IO.File]::WriteAllText($rootPkg, ($pkgJson | ConvertTo-Json -Depth 10), $utf8NoBom)
    Write-OK "Removed Linux-only preinstall script"
} else {
    Write-OK "No preinstall script found — nothing to patch"
}

# ===========================================================
# STEP 8 — PATCH PNPM-WORKSPACE.YAML FOR WINDOWS
# ===========================================================
Write-Step "8/12" "Patching pnpm-workspace.yaml for Windows"

$wsYaml = Join-Path $Config.InstallDir "pnpm-workspace.yaml"
$lines   = Get-Content $wsYaml
$filtered = $lines | Where-Object { $_ -notmatch '^\s+"[^"]+>.*":\s+[''"]+-[''"]' }
[System.IO.File]::WriteAllText($wsYaml, ($filtered -join "`n") + "`n", $utf8NoBom)
Write-OK "Removed Linux-only platform exclusions"

# ===========================================================
# STEP 9 — INSTALL, MIGRATE & BUILD
# ===========================================================
Write-Step "9/12" "Install dependencies, migrate database, and build"

Push-Location $Config.InstallDir

# Stop any running Grand Palace services so their binaries are not locked
foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend")) {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s -and $s.Status -ne "Stopped") {
        Write-Info "Stopping $svc before cleaning node_modules..."
        try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Seconds 2
    }
}

# Kill stray node/esbuild processes that may lock files
Write-Info "Releasing file locks..."
@("node", "esbuild") | ForEach-Object {
    Get-Process -Name $_ -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_.Kill(); $_.WaitForExit(3000) } catch {}
    }
}
Start-Sleep -Seconds 2

# Clean node_modules for a fresh Windows-native install
$nodeModulesDir = Join-Path $Config.InstallDir "node_modules"
if (Test-Path $nodeModulesDir) {
    Write-Info "Removing old node_modules for a clean reinstall..."
    & cmd /c "rmdir /s /q `"$nodeModulesDir`""
    if (Test-Path $nodeModulesDir) {
        Start-Sleep -Seconds 3
        & cmd /c "rmdir /s /q `"$nodeModulesDir`""
    }
    if (Test-Path $nodeModulesDir) {
        throw "Failed to remove node_modules. A process may still hold a file lock. Reboot the server and run this script again."
    }
    Write-OK "node_modules removed"
}

# Remove lockfile so pnpm re-resolves Windows-native binaries
$lockFile = Join-Path $Config.InstallDir "pnpm-lock.yaml"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Write-Info "Lockfile removed — pnpm will resolve Windows-native binaries fresh"
}

Write-Info "Running pnpm install (may take several minutes)..."
& pnpm install
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed." }
Write-OK "Dependencies installed"

Write-Info "Pushing database schema to $( if ($Config.UseLocalPg) { 'local PostgreSQL' } else { 'Neon' } )..."
& pnpm --filter "@workspace/db" run push
if ($LASTEXITCODE -ne 0) { throw "Database schema push failed. Check your database URL and connectivity." }
Write-OK "Database schema applied"

Write-Info "Seeding database with initial data..."
& pnpm --filter "@workspace/scripts" run seed
if ($LASTEXITCODE -ne 0) { throw "Database seeding failed." }
Write-OK "Database seeded (or skipped if already seeded)"

if (-not $SkipBuild) {
    # Build API server
    $apiDistDir = Join-Path $Config.InstallDir "artifacts\api-server\dist"
    if (Test-Path $apiDistDir) {
        Write-Info "Removing old API build..."
        Remove-Item $apiDistDir -Recurse -Force
    }
    Write-Info "Building API server..."
    & pnpm --filter "@workspace/api-server" run build
    if ($LASTEXITCODE -ne 0) { throw "API server build failed." }
    Write-OK "API server built"

    # Build frontend
    $frontendDistDir = Join-Path $Config.InstallDir "artifacts\hotel-system\dist"
    if (Test-Path $frontendDistDir) {
        Write-Info "Removing old frontend build..."
        Remove-Item $frontendDistDir -Recurse -Force
    }
    Write-Info "Building frontend..."
    $env:PORT      = [string]$Config.FrontendPort
    $env:BASE_PATH = "/"
    $env:NODE_ENV  = "production"
    $env:VITE_CLERK_PUBLISHABLE_KEY = $Config.ClerkPublishableKey
    $env:VITE_CLERK_PROXY_URL       = $clerkProxyUrl
    $env:VITE_API_URL               = $Config.ApiPublicUrl
    & pnpm --filter "@workspace/hotel-system" run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
    Write-OK "Frontend built"
} else {
    Write-Warn "SkipBuild flag set — skipping API and frontend build"
}

Pop-Location

# ===========================================================
# STEP 10 — WINDOWS SERVICES (NSSM)
# ===========================================================
Write-Step "10/12" "Installing Windows Services via NSSM"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

# Download NSSM if not cached
$nssmPath = Join-Path $TempDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    $nssmZipUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip    = Join-Path $TempDir "nssm.zip"
    Invoke-Download $nssmZipUrl $nssmZip
    Expand-Archive -Path $nssmZip -DestinationPath $TempDir -Force
    $nssmExe = Get-ChildItem -Path $TempDir -Filter "nssm.exe" -Recurse |
               Where-Object { $_.FullName -like "*win64*" } |
               Select-Object -First 1
    Copy-Item $nssmExe.FullName $nssmPath
}

$nodePath     = (Get-Command node).Source
$apiDistPath  = Join-Path $Config.InstallDir "artifacts\api-server\dist\index.mjs"
$apiLauncher  = Join-Path $Config.InstallDir "start-api.cmd"

# Locate Vite binary for preview server
$viteJs = Get-ChildItem (Join-Path $Config.InstallDir "node_modules\.pnpm\vite@*\node_modules\vite\bin\vite.js") -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending |
          Select-Object -First 1 -ExpandProperty FullName
if (-not $viteJs) { throw "Could not locate vite.js in pnpm store. Ensure pnpm install succeeded." }
Write-OK "Found Vite at: $viteJs"

$viteConfig       = Join-Path $Config.InstallDir "artifacts\hotel-system\vite.config.ts"
$frontendLauncher = Join-Path $Config.InstallDir "start-frontend.cmd"

# Write launcher scripts (env vars embedded — NSSM service env inheritance is unreliable)
$apiCmd = @(
    "@echo off",
    "set PORT=$($Config.ApiPort)",
    "set DATABASE_URL=$DatabaseUrl",
    "set NEON_DATABASE_URL=$NeonDatabaseUrl",
    "set CLERK_SECRET_KEY=$($Config.ClerkSecretKey)",
    "set CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "set SESSION_SECRET=$sessionSecret",
    "set NODE_ENV=production",
    "set MOMO_PARTNER_CODE=$($Config.MomoPartnerCode)",
    "set MOMO_ACCESS_KEY=$($Config.MomoAccessKey)",
    "set MOMO_SECRET_KEY=$($Config.MomoSecretKey)",
    "set MOMO_ENDPOINT=$($Config.MomoEndpoint)",
    "set API_PUBLIC_URL=$($Config.ApiPublicUrl)",
    "set FRONTEND_URL=$($Config.FrontendUrl)",
    "`"$nodePath`" --enable-source-maps `"$apiDistPath`""
) -join "`r`n"
[System.IO.File]::WriteAllText($apiLauncher, $apiCmd, $utf8NoBom)
Write-OK "Created start-api.cmd"

$frontendCmd = @(
    "@echo off",
    "set PORT=$($Config.FrontendPort)",
    "set BASE_PATH=/",
    "set VITE_CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "set VITE_CLERK_PROXY_URL=$clerkProxyUrl",
    "set VITE_API_URL=$($Config.ApiPublicUrl)",
    "set NODE_ENV=production",
    "`"$nodePath`" `"$viteJs`" preview --config `"$viteConfig`" --host 0.0.0.0 --port $($Config.FrontendPort)"
) -join "`r`n"
[System.IO.File]::WriteAllText($frontendLauncher, $frontendCmd, $utf8NoBom)
Write-OK "Created start-frontend.cmd"

# Install/update NSSM services
function Install-NssmService {
    param([string]$svcName, [string]$displayName, [string]$launcher)

    $existing = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Info "Removing old service: $svcName"
        try { & $nssmPath stop $svcName 2>&1 | Out-Null } catch {}
        Start-Sleep -Seconds 1
        try { & $nssmPath remove $svcName confirm 2>&1 | Out-Null } catch {}
        Start-Sleep -Seconds 2
    }

    & $nssmPath install  $svcName "cmd.exe" "/c `"$launcher`""
    & $nssmPath set      $svcName DisplayName  $displayName
    & $nssmPath set      $svcName Description  "Grand Palace Hotels & Resorts - $displayName"
    & $nssmPath set      $svcName AppDirectory $Config.InstallDir
    & $nssmPath set      $svcName Start        SERVICE_AUTO_START
    & $nssmPath set      $svcName AppStdout    (Join-Path $LogDir "$svcName-out.log")
    & $nssmPath set      $svcName AppStderr    (Join-Path $LogDir "$svcName-err.log")
    & $nssmPath set      $svcName AppRotateFiles 1
    & $nssmPath set      $svcName AppRotateBytes 10485760  # 10 MB
    Write-OK "Service registered: $svcName"
}

Install-NssmService -svcName "GrandPalaceAPI"      -displayName "Grand Palace - API Server" -launcher $apiLauncher
Install-NssmService -svcName "GrandPalaceFrontend" -displayName "Grand Palace - Frontend"   -launcher $frontendLauncher

# ===========================================================
# STEP 11 — START SERVICES
# ===========================================================
Write-Step "11/12" "Starting services"

foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend")) {
    try {
        Start-Service -Name $svc
        Write-OK "$svc started"
        Start-Sleep -Seconds 3
    } catch {
        $errLog = Join-Path $LogDir "$svc-err.log"
        Write-Host "  [ERROR] $svc failed to start. Check logs:" -ForegroundColor Red
        Write-Host "    $errLog" -ForegroundColor Red
        if (Test-Path $errLog) {
            Get-Content $errLog -ErrorAction SilentlyContinue | Select-Object -Last 20 |
                ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }
    }
}

# ===========================================================
# STEP 12 — FIREWALL & HEALTH CHECK
# ===========================================================
Write-Step "12/12" "Firewall rules and health check"

# Idempotent firewall rules (delete then re-add)
netsh advfirewall firewall delete rule name="Grand Palace API"      | Out-Null
netsh advfirewall firewall delete rule name="Grand Palace Frontend" | Out-Null
netsh advfirewall firewall add rule name="Grand Palace API"      dir=in action=allow protocol=TCP localport=$($Config.ApiPort) | Out-Null
netsh advfirewall firewall add rule name="Grand Palace Frontend" dir=in action=allow protocol=TCP localport=$($Config.FrontendPort) | Out-Null
Write-OK "Firewall rules set for ports $($Config.ApiPort) (API) and $($Config.FrontendPort) (Frontend)"

# Health check — ping the API health endpoint
Write-Info "Waiting for API server to become ready..."
$apiReady   = $false
$retries    = 12
$healthUrl  = "http://localhost:$($Config.ApiPort)/api/health"
for ($i = 1; $i -le $retries; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($resp.StatusCode -lt 400) { $apiReady = $true; break }
    } catch {}
    Write-Info "  Attempt $i/$retries — waiting 5 s..."
    Start-Sleep -Seconds 5
}
if ($apiReady) { Write-OK "API health check passed" }
else { Write-Warn "API health check timed out. The service may still be starting. Check logs at $LogDir" }

# Final service status
$apiStatus      = (Get-Service -Name "GrandPalaceAPI"      -ErrorAction SilentlyContinue).Status
$frontendStatus = (Get-Service -Name "GrandPalaceFrontend" -ErrorAction SilentlyContinue).Status
Write-OK "GrandPalaceAPI:      $apiStatus"
Write-OK "GrandPalaceFrontend: $frontendStatus"

# ===========================================================
# DONE
# ===========================================================
Stop-Transcript | Out-Null

$serverIp = (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1).IPV4Address.IPAddressToString

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Grand Palace Hotels & Resorts — INSTALLED         ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://$($serverIp):$($Config.FrontendPort)/"    -ForegroundColor White
Write-Host "  API       : http://$($serverIp):$($Config.ApiPort)/api/"     -ForegroundColor White
Write-Host "  Admin     : http://$($serverIp):$($Config.FrontendPort)/admin" -ForegroundColor White
Write-Host ""
Write-Host "  Services (auto-start on reboot):"
Write-Host "    GrandPalaceAPI      → port $($Config.ApiPort)"
Write-Host "    GrandPalaceFrontend → port $($Config.FrontendPort)"
Write-Host ""
Write-Host "  Logs      : $LogDir\"
Write-Host "  Install log : $LogFile"
Write-Host "  .env file : $(Join-Path $Config.InstallDir '.env')"
Write-Host ""
if ($Config.ClerkPublishableKey -like "*REPLACE*") {
    Write-Host "  ACTION REQUIRED:" -ForegroundColor Red
    Write-Host "    Update Clerk keys in the .env file and re-run with -SkipBuild -Reinstall" -ForegroundColor Red
    Write-Host "    Get your keys at: https://dashboard.clerk.com" -ForegroundColor Red
    Write-Host ""
}
if ($Config.ApiPublicUrl -like "*YOUR_SERVER_IP*") {
    Write-Host "  ACTION REQUIRED:" -ForegroundColor Yellow
    Write-Host "    Update ApiPublicUrl and FrontendUrl in `$Config with your real IP/domain" -ForegroundColor Yellow
    Write-Host "    (Required for MoMo payment callbacks)" -ForegroundColor Yellow
    Write-Host ""
}

Read-Host "Press Enter to close"
