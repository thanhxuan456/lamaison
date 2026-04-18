#Requires -RunAsAdministrator
# Grand Palace Hotels & Resorts - Windows Server Installer
# Compatible with Windows Server 2019 / 2022 / 2025
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File final.ps1
#
# OPTIONAL FLAGS:
#   -Reinstall   Force a clean reinstall even if already installed
#   -SkipBuild   Skip the build step (useful for config-only updates)
#   -Uninstall   Stop and remove services, optionally delete install directory
#
# WHAT THIS SCRIPT DOES:
#   1.  Checks system requirements (OS version, RAM, disk space)
#   2.  Installs Node.js (if missing or too old)
#   3.  Installs pnpm (if missing)
#   4.  Sets up the database (Neon cloud or local PostgreSQL)
#   5.  Copies application files to the install directory
#   6.  Writes the .env configuration file (secrets auto-generated)
#   7.  Patches package.json / pnpm-workspace.yaml for Windows
#   8.  Installs all npm dependencies (pnpm install)
#   9.  Applies DB schema, seeds data, builds API + frontend
#   10. Installs auto-starting Windows Services via NSSM
#   11. Starts both services and runs a health check
#   12. Opens firewall ports

param(
    [switch]$Reinstall,
    [switch]$SkipBuild,
    [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ===========================================================
# CONFIGURATION -- Edit these values before running
# ===========================================================
$Config = @{
    InstallDir          = "C:\GrandPalace"
    ApiPort             = 8080
    FrontendPort        = 3000

    # -- DATABASE ----------------------------------------------------------
    # Option A: Neon cloud DB (recommended, no local install needed)
    #   Fill NeonDatabaseUrl below, leave UseLocalPg = $false
    # Option B: Local PostgreSQL -- set UseLocalPg = $true
    UseLocalPg          = $false
    NeonDatabaseUrl     = "postgresql://neondb_owner:npg_YCEZLyV6gwi7@ep-fragrant-sunset-a18l1eva-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

    PgSuperPassword     = "ZeroCode123#!!"
    PgDbName            = "grandpalace"
    PgDbUser            = "grandpalace"
    PgDbPassword        = "ZeroCode123#!!"

    # -- CLERK AUTHENTICATION ----------------------------------------------
    # Get from https://dashboard.clerk.com -> Your App -> API Keys
    ClerkPublishableKey = "pk_test_cGlja2VkLWNyYWItNTguY2xlcmsuYWNjb3VudHMuZGV2JA"
    ClerkSecretKey      = "sk_test_cPh6CPPBJ9oRO9qmRahsEHOLH9IOYUUwdUyJw11se6"

    # -- MOMO PAYMENT ------------------------------------------------------
    # Replace with real credentials from https://business.momo.vn for production
    MomoPartnerCode     = "MOMO"
    MomoAccessKey       = "F8BBA842ECF85"
    MomoSecretKey       = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
    MomoEndpoint        = "https://test-payment.momo.vn/v2/gateway/api/create"

    # -- PUBLIC SERVER URLS ------------------------------------------------
    # Set to your server IP or domain (needed for MoMo callbacks + Clerk proxy)
    ApiPublicUrl        = "http://YOUR_SERVER_IP:8080"
    FrontendUrl         = "http://YOUR_SERVER_IP:3000"

    # -- VERSIONS ----------------------------------------------------------
    NodeVersion         = "22.14.0"
    NodeMinMajor        = 20
    PgVersion           = "16"

    # -- SYSTEM REQUIREMENTS -----------------------------------------------
    MinRamGB            = 2
    MinDiskGB           = 10
}
# ===========================================================

$LogDir    = Join-Path $Config.InstallDir "logs"
$TempDir   = Join-Path $env:TEMP "GrandPalaceSetup"
$LogFile   = Join-Path $env:TEMP ("GrandPalaceInstall_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# ---- Helpers -------------------------------------------------
function Write-Step([string]$n, [string]$msg) {
    Write-Host ""
    Write-Host "[$n] $msg" -ForegroundColor Cyan
    Write-Host "    ---------------------------------------------------" -ForegroundColor DarkGray
}
function Write-OK([string]$msg)   { Write-Host "  [OK] $msg"    -ForegroundColor Green }
function Write-Info([string]$msg) { Write-Host "  --> $msg"     -ForegroundColor Yellow }
function Write-Warn([string]$msg) { Write-Host "  [!] $msg"     -ForegroundColor DarkYellow }
function Write-Err([string]$msg)  { Write-Host "  [ERROR] $msg" -ForegroundColor Red }

function Fail([string]$msg) {
    Write-Err $msg
    Write-Err "Full install log: $LogFile"
    Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
    throw $msg
}

function Invoke-Download([string]$url, [string]$dest) {
    Write-Info "Downloading: $url"
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $dest)
    } catch {
        Write-Warn "WebClient failed, retrying with Invoke-WebRequest..."
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
    }
}

function Test-CommandExists([string]$cmd) {
    return ($null -ne (Get-Command $cmd -ErrorAction SilentlyContinue))
}

function Update-EnvPath {
    $m = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $u = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$m;$u"
}

function New-RandomSecret([int]$bytes = 48) {
    $buf = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
    return [Convert]::ToBase64String($buf)
}

Start-Transcript -Path $LogFile -Append -ErrorAction SilentlyContinue | Out-Null
Write-Host "  Install log: $LogFile" -ForegroundColor DarkGray

# ===========================================================
# UNINSTALL MODE
# ===========================================================
if ($Uninstall) {
    Write-Host ""
    Write-Host "=== UNINSTALL MODE ===" -ForegroundColor Red
    $nssmU = Join-Path $TempDir "nssm.exe"
    foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s) {
            Write-Info "Stopping and removing: $svc"
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            Start-Sleep -Seconds 2
            if (Test-Path $nssmU) {
                & $nssmU remove $svc confirm 2>&1 | Out-Null
            } else {
                sc.exe delete $svc | Out-Null
            }
            Write-OK "Removed: $svc"
        } else {
            Write-Info "Not found: $svc"
        }
    }
    netsh advfirewall firewall delete rule name="Grand Palace API"      2>&1 | Out-Null
    netsh advfirewall firewall delete rule name="Grand Palace Frontend" 2>&1 | Out-Null
    Write-OK "Firewall rules removed"
    $confirm = Read-Host "Delete install directory '$($Config.InstallDir)'? (y/N)"
    if ($confirm -ieq "y") {
        Remove-Item $Config.InstallDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-OK "Install directory deleted"
    }
    Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
    exit 0
}

New-Item -ItemType Directory -Force -Path $Config.InstallDir | Out-Null

# ===========================================================
# STEP 1 -- SYSTEM REQUIREMENTS
# ===========================================================
Write-Step "1/12" "System requirements check"

$os = Get-CimInstance Win32_OperatingSystem
Write-Info "OS: $($os.Caption) (Build $($os.BuildNumber))"
if ([int]$os.BuildNumber -lt 17763) {
    Fail "Windows Server 2019 or later is required (build 17763+). Found: $($os.BuildNumber)"
}
Write-OK "OS version OK"

$ramGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($ramGB -lt $Config.MinRamGB) {
    Fail "Not enough RAM. Required: $($Config.MinRamGB) GB, Found: $ramGB GB"
}
Write-OK "RAM: $ramGB GB"

$driveLetter = (Split-Path $Config.InstallDir -Qualifier).TrimEnd(":")
$disk = Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
if ($disk) {
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGB -lt $Config.MinDiskGB) {
        Fail "Not enough disk space. Required: $($Config.MinDiskGB) GB, Free: $freeGB GB"
    }
    Write-OK "Disk free: $freeGB GB"
} else {
    Write-Warn "Could not check disk space for drive $driveLetter"
}

# ===========================================================
# STEP 2 -- NODE.JS
# ===========================================================
Write-Step "2/12" "Node.js (minimum v$($Config.NodeMinMajor))"

$nodeOk = $false
if (Test-CommandExists "node") {
    $rawVer = (node --version 2>&1).ToString().TrimStart("v")
    $major  = [int]($rawVer.Split(".")[0])
    if ($major -ge $Config.NodeMinMajor -and -not $Reinstall) {
        Write-OK "Node.js already installed: v$rawVer"
        $nodeOk = $true
    } else {
        Write-Warn "Node v$rawVer found but minimum v$($Config.NodeMinMajor) required -- installing v$($Config.NodeVersion)"
    }
}

if (-not $nodeOk) {
    $nodeInstaller = Join-Path $TempDir "node-installer.msi"
    $nodeUrl = "https://nodejs.org/dist/v" + $Config.NodeVersion + "/node-v" + $Config.NodeVersion + "-x64.msi"
    Invoke-Download $nodeUrl $nodeInstaller
    Write-Info "Installing Node.js $($Config.NodeVersion) silently..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn /norestart ADDLOCAL=ALL" -Wait -NoNewWindow
    Update-EnvPath
    if (-not (Test-CommandExists "node")) { Fail "Node.js install finished but 'node' not found in PATH." }
    Write-OK "Node.js $($Config.NodeVersion) installed"
}

# ===========================================================
# STEP 3 -- PNPM
# ===========================================================
Write-Step "3/12" "pnpm package manager"

if (Test-CommandExists "pnpm" -and -not $Reinstall) {
    Write-OK "pnpm already installed: $(pnpm --version)"
} else {
    Write-Info "Installing pnpm via npm..."
    & npm install -g pnpm
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install via npm failed." }
    Update-EnvPath
    if (-not (Test-CommandExists "pnpm")) { Fail "'pnpm' not found in PATH after installation." }
    Write-OK "pnpm installed: $(pnpm --version)"
}

# ===========================================================
# STEP 4 -- DATABASE SETUP
# ===========================================================
Write-Step "4/12" "Database setup"

$DatabaseUrl     = ""
$NeonDatabaseUrl = ""

if ($Config.UseLocalPg) {
    Write-Info "Setting up local PostgreSQL $($Config.PgVersion)"
    $pgBin     = $null
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue

    if ($pgService -and -not $Reinstall) {
        Write-OK "PostgreSQL service already running: $($pgService.Name)"
        $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory -ErrorAction SilentlyContinue |
                 Select-Object -First 1
        if ($found) { $pgBin = $found.FullName }
    } else {
        $pgInstaller = Join-Path $TempDir "pg-installer.exe"
        $pgDownloaded = $false
        foreach ($minor in @("4", "3", "2", "1", "0")) {
            $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-" + $Config.PgVersion + ".$minor-1-windows-x64.exe"
            try { Invoke-Download $pgUrl $pgInstaller; $pgDownloaded = $true; break } catch { continue }
        }
        if (-not $pgDownloaded) { Fail "Could not download PostgreSQL installer. Check your internet connection." }
        Write-Info "Installing PostgreSQL $($Config.PgVersion) silently (a few minutes)..."
        $pgArgs = "--mode unattended --unattendedmodeui none --superpassword `"" + $Config.PgSuperPassword + "`" --serverport 5432"
        Start-Process $pgInstaller -ArgumentList $pgArgs -Wait -NoNewWindow
        Update-EnvPath
        $pgBin = "C:\Program Files\PostgreSQL\" + $Config.PgVersion + "\bin"
        if (-not (Test-Path $pgBin)) { Fail "PostgreSQL bin not found at: $pgBin" }
        Write-OK "PostgreSQL $($Config.PgVersion) installed"
    }

    if ($pgBin -and (Test-Path $pgBin) -and ($env:Path -notlike "*$pgBin*")) {
        $env:Path = $env:Path + ";" + $pgBin
    }

    $env:PGPASSWORD = $Config.PgSuperPassword
    $checkDb = & psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($Config.PgDbName)'" 2>&1
    if ($LASTEXITCODE -eq 0 -and ($checkDb -match "1")) {
        Write-OK "Database '$($Config.PgDbName)' already exists"
    } else {
        Write-Info "Creating database role and database..."
        & psql -U postgres -c "CREATE ROLE `"$($Config.PgDbUser)`" WITH LOGIN PASSWORD '$($Config.PgDbPassword)';" 2>&1 | Out-Null
        & psql -U postgres -c "CREATE DATABASE `"$($Config.PgDbName)`" OWNER `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
        & psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE `"$($Config.PgDbName)`" TO `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
        Write-OK "Database '$($Config.PgDbName)' created"
    }
    $DatabaseUrl     = "postgresql://" + $Config.PgDbUser + ":" + $Config.PgDbPassword + "@localhost:5432/" + $Config.PgDbName
    $NeonDatabaseUrl = ""
} else {
    Write-Info "Using Neon cloud database (no local PostgreSQL needed)"
    if ([string]::IsNullOrWhiteSpace($Config.NeonDatabaseUrl) -or
        $Config.NeonDatabaseUrl -like "*ep-xxx*" -or
        $Config.NeonDatabaseUrl -like "*REPLACE*") {
        Fail "NeonDatabaseUrl is not configured. Edit the Config block at the top of this script."
    }
    $DatabaseUrl     = $Config.NeonDatabaseUrl
    $NeonDatabaseUrl = $Config.NeonDatabaseUrl
    Write-OK "Neon database URL configured"
}

# ===========================================================
# STEP 5 -- COPY APPLICATION FILES
# ===========================================================
Write-Step "5/12" "Copying application files"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Info "Source : $scriptDir"
Write-Info "Target : $($Config.InstallDir)"

robocopy "$scriptDir" "$($Config.InstallDir)" /E /XD ".git" "node_modules" "dist" ".replit-artifact" "attached_assets" ".local" /XF ".env" "*.log" "*.map" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "File copy failed (robocopy exit code $LASTEXITCODE)." }

$schemaFile = Join-Path $Config.InstallDir "lib\db\src\schema\index.ts"
if (-not (Test-Path $schemaFile)) {
    Write-Warn "lib directory not found in copy -- attempting direct copy..."
    robocopy (Join-Path $scriptDir "lib") (Join-Path $Config.InstallDir "lib") /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if (-not (Test-Path $schemaFile)) { Fail "DB schema still missing after direct copy: $schemaFile" }
}
Write-OK "Files copied"

# ===========================================================
# STEP 6 -- WRITE .ENV FILE
# ===========================================================
Write-Step "6/12" "Writing environment configuration"

$envFile = Join-Path $Config.InstallDir ".env"

$sessionSecret = ""
$contactEncKey = ""
if (Test-Path $envFile) {
    $prevLines = Get-Content $envFile -ErrorAction SilentlyContinue
    $sl = $prevLines | Where-Object { $_ -match "^SESSION_SECRET=" }         | Select-Object -First 1
    $el = $prevLines | Where-Object { $_ -match "^CONTACT_ENCRYPTION_KEY=" } | Select-Object -First 1
    if ($sl) { $sessionSecret = $sl.Split("=", 2)[1] }
    if ($el) { $contactEncKey = $el.Split("=", 2)[1] }
}
if ([string]::IsNullOrEmpty($sessionSecret)) { $sessionSecret = New-RandomSecret 48 }
if ([string]::IsNullOrEmpty($contactEncKey)) { $contactEncKey = New-RandomSecret 32 }

$clerkProxyUrl = $Config.ApiPublicUrl + "/api/__clerk"

$envLines = @(
    "NODE_ENV=production",
    "DATABASE_URL=" + $DatabaseUrl,
    "NEON_DATABASE_URL=" + $NeonDatabaseUrl,
    "CLERK_PUBLISHABLE_KEY=" + $Config.ClerkPublishableKey,
    "CLERK_SECRET_KEY=" + $Config.ClerkSecretKey,
    "VITE_CLERK_PUBLISHABLE_KEY=" + $Config.ClerkPublishableKey,
    "VITE_CLERK_PROXY_URL=" + $clerkProxyUrl,
    "VITE_API_URL=" + $Config.ApiPublicUrl,
    "SESSION_SECRET=" + $sessionSecret,
    "CONTACT_ENCRYPTION_KEY=" + $contactEncKey,
    "PORT=" + $Config.ApiPort,
    "FRONTEND_PORT=" + $Config.FrontendPort,
    "BASE_PATH=/",
    "MOMO_PARTNER_CODE=" + $Config.MomoPartnerCode,
    "MOMO_ACCESS_KEY=" + $Config.MomoAccessKey,
    "MOMO_SECRET_KEY=" + $Config.MomoSecretKey,
    "MOMO_ENDPOINT=" + $Config.MomoEndpoint,
    "API_PUBLIC_URL=" + $Config.ApiPublicUrl,
    "FRONTEND_URL=" + $Config.FrontendUrl
)
[System.IO.File]::WriteAllText($envFile, ($envLines -join "`n") + "`n", $utf8NoBom)
Write-OK ".env written to $envFile"

# Load all env vars into the session so every child process inherits them
foreach ($line in $envLines) {
    if ($line -match "^([^#][^=]*)=(.*)") {
        $k = $Matches[1].Trim()
        $v = $Matches[2]
        Set-Item -Path "Env:$k" -Value $v
    }
}
# Belt-and-suspenders: ensure the critical DB vars are explicitly visible
$env:DATABASE_URL      = $DatabaseUrl
$env:NEON_DATABASE_URL = $NeonDatabaseUrl

# ===========================================================
# STEP 7 -- PATCH package.json FOR WINDOWS
# ===========================================================
Write-Step "7/12" "Patching package.json for Windows"

$rootPkg = Join-Path $Config.InstallDir "package.json"
if (Test-Path $rootPkg) {
    $pkgJson = Get-Content $rootPkg -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pkgJson.scripts.PSObject.Properties.Name -contains "preinstall") {
        $pkgJson.scripts.PSObject.Properties.Remove("preinstall")
        [System.IO.File]::WriteAllText($rootPkg, ($pkgJson | ConvertTo-Json -Depth 20), $utf8NoBom)
        Write-OK "Removed Linux-only preinstall hook"
    } else {
        Write-OK "No preinstall hook found -- nothing to remove"
    }
} else {
    Write-Warn "package.json not found at $rootPkg -- skipping"
}

# ===========================================================
# STEP 8 -- PATCH pnpm-workspace.yaml FOR WINDOWS
# ===========================================================
Write-Step "8/12" "Patching pnpm-workspace.yaml for Windows"

$wsYaml = Join-Path $Config.InstallDir "pnpm-workspace.yaml"
if (Test-Path $wsYaml) {
    $wsLines    = Get-Content $wsYaml -Encoding UTF8
    $wsFiltered = $wsLines | Where-Object { $_ -notmatch 'os\s*:\s*\[.*linux' -and $_ -notmatch '^\s+os:\s*linux' }
    [System.IO.File]::WriteAllText($wsYaml, ($wsFiltered -join "`n") + "`n", $utf8NoBom)
    Write-OK "Removed Linux-only platform restrictions"
} else {
    Write-Warn "pnpm-workspace.yaml not found -- skipping"
}

# ===========================================================
# STEP 9 -- INSTALL DEPENDENCIES, MIGRATE DB, BUILD
# ===========================================================
Write-Step "9/12" "Install dependencies, migrate database, and build"

Push-Location $Config.InstallDir

try {
    foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s -and $s.Status -ne "Stopped") {
            Write-Info "Stopping $svc before cleaning node_modules..."
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            Start-Sleep -Seconds 3
        }
    }

    Write-Info "Releasing file locks (node / esbuild processes)..."
    foreach ($pn in @("node", "esbuild")) {
        Get-Process -Name $pn -ErrorAction SilentlyContinue | ForEach-Object {
            try { $_.Kill(); $_.WaitForExit(3000) } catch {}
        }
    }
    Start-Sleep -Seconds 2

    $nmDir = Join-Path $Config.InstallDir "node_modules"
    if (Test-Path $nmDir) {
        Write-Info "Removing node_modules for a clean reinstall..."
        & cmd /c "rmdir /s /q `"$nmDir`"" 2>&1 | Out-Null
        if (Test-Path $nmDir) { Start-Sleep -Seconds 4; & cmd /c "rmdir /s /q `"$nmDir`"" 2>&1 | Out-Null }
        if (Test-Path $nmDir) { Fail "Could not remove node_modules. Reboot the server and run again." }
        Write-OK "node_modules removed"
    }

    $lockFile = Join-Path $Config.InstallDir "pnpm-lock.yaml"
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force
        Write-Info "Lockfile removed -- pnpm will resolve Windows-native binaries fresh"
    }

    Write-Info "Running pnpm install (may take several minutes)..."
    & pnpm install --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed. See output above." }
    Write-OK "Dependencies installed"

    # Ensure DB vars are visible to the drizzle-kit child process
    $env:DATABASE_URL      = $DatabaseUrl
    $env:NEON_DATABASE_URL = $NeonDatabaseUrl
    Write-Info "DB URL (first 60 chars): $($DatabaseUrl.Substring(0, [Math]::Min(60, $DatabaseUrl.Length)))..."
    Write-Info "Applying database schema..."
    & pnpm --filter "@workspace/db" run push
    if ($LASTEXITCODE -ne 0) { Fail "Database schema push failed. Check DATABASE_URL and connectivity." }
    Write-OK "Database schema applied"

    $env:DATABASE_URL      = $DatabaseUrl
    $env:NEON_DATABASE_URL = $NeonDatabaseUrl
    Write-Info "Seeding initial data (auto-skipped if data already exists)..."
    & pnpm --filter "@workspace/scripts" run seed
    if ($LASTEXITCODE -ne 0) { Fail "Database seed script failed. See output above." }
    Write-OK "Database seed complete"

    if (-not $SkipBuild) {
        $apiDistDir = Join-Path $Config.InstallDir "artifacts\api-server\dist"
        if (Test-Path $apiDistDir) {
            Write-Info "Removing old API build..."
            Remove-Item $apiDistDir -Recurse -Force
        }
        $env:DATABASE_URL      = $DatabaseUrl
        $env:NEON_DATABASE_URL = $NeonDatabaseUrl
        Write-Info "Building API server..."
        & pnpm --filter "@workspace/api-server" run build
        if ($LASTEXITCODE -ne 0) { Fail "API server build failed." }
        Write-OK "API server built"

        $frontendDistDir = Join-Path $Config.InstallDir "artifacts\hotel-system\dist"
        if (Test-Path $frontendDistDir) {
            Write-Info "Removing old frontend build..."
            Remove-Item $frontendDistDir -Recurse -Force
        }
        Write-Info "Building frontend..."
        $env:PORT                       = [string]$Config.FrontendPort
        $env:BASE_PATH                  = "/"
        $env:NODE_ENV                   = "production"
        $env:VITE_CLERK_PUBLISHABLE_KEY = $Config.ClerkPublishableKey
        $env:VITE_CLERK_PROXY_URL       = $clerkProxyUrl
        $env:VITE_API_URL               = $Config.ApiPublicUrl
        & pnpm --filter "@workspace/hotel-system" run build
        if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed." }
        Write-OK "Frontend built"
    } else {
        Write-Warn "-SkipBuild set -- skipping API and frontend build"
    }
} finally {
    Pop-Location
}

# ===========================================================
# STEP 10 -- WINDOWS SERVICES (NSSM)
# ===========================================================
Write-Step "10/12" "Installing Windows Services via NSSM"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$nssmPath = Join-Path $TempDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    $nssmZip = Join-Path $TempDir "nssm.zip"
    Invoke-Download "https://nssm.cc/release/nssm-2.24.zip" $nssmZip
    try {
        Expand-Archive -Path $nssmZip -DestinationPath $TempDir -Force
    } catch {
        Fail "Failed to extract nssm.zip: $_"
    }
    $nssmExe = Get-ChildItem -Path $TempDir -Filter "nssm.exe" -Recurse |
               Where-Object { $_.FullName -like "*win64*" } |
               Select-Object -First 1
    if (-not $nssmExe) { Fail "nssm.exe (win64) not found inside the zip." }
    Copy-Item $nssmExe.FullName $nssmPath -Force
    Write-OK "NSSM ready: $nssmPath"
}

$nodePath       = (Get-Command node).Source
$apiDistPath    = Join-Path $Config.InstallDir "artifacts\api-server\dist\index.mjs"
$viteConfigPath = Join-Path $Config.InstallDir "artifacts\hotel-system\vite.config.ts"

if (-not (Test-Path $apiDistPath)) {
    Fail "API dist not found: $apiDistPath -- the build may have failed."
}

$viteJs = Get-ChildItem (Join-Path $Config.InstallDir "node_modules\.pnpm") -Recurse -Filter "vite.js" -ErrorAction SilentlyContinue |
          Where-Object { $_.FullName -like "*\bin\vite.js" } |
          Sort-Object LastWriteTime -Descending |
          Select-Object -First 1 -ExpandProperty FullName
if (-not $viteJs) { Fail "Could not find vite.js in pnpm store. Ensure pnpm install ran successfully." }
Write-OK "Vite found: $viteJs"

$apiLauncher = Join-Path $Config.InstallDir "start-api.cmd"
$apiLines = @(
    "@echo off",
    "set PORT=" + $Config.ApiPort,
    "set DATABASE_URL=" + $DatabaseUrl,
    "set NEON_DATABASE_URL=" + $NeonDatabaseUrl,
    "set CLERK_SECRET_KEY=" + $Config.ClerkSecretKey,
    "set CLERK_PUBLISHABLE_KEY=" + $Config.ClerkPublishableKey,
    "set SESSION_SECRET=" + $sessionSecret,
    "set CONTACT_ENCRYPTION_KEY=" + $contactEncKey,
    "set NODE_ENV=production",
    "set MOMO_PARTNER_CODE=" + $Config.MomoPartnerCode,
    "set MOMO_ACCESS_KEY=" + $Config.MomoAccessKey,
    "set MOMO_SECRET_KEY=" + $Config.MomoSecretKey,
    "set MOMO_ENDPOINT=" + $Config.MomoEndpoint,
    "set API_PUBLIC_URL=" + $Config.ApiPublicUrl,
    "set FRONTEND_URL=" + $Config.FrontendUrl,
    "`"" + $nodePath + "`" --enable-source-maps `"" + $apiDistPath + "`""
)
[System.IO.File]::WriteAllText($apiLauncher, ($apiLines -join "`r`n"), $utf8NoBom)
Write-OK "Created start-api.cmd"

$frontendLauncher = Join-Path $Config.InstallDir "start-frontend.cmd"
$frontendLines = @(
    "@echo off",
    "set PORT=" + $Config.FrontendPort,
    "set BASE_PATH=/",
    "set VITE_CLERK_PUBLISHABLE_KEY=" + $Config.ClerkPublishableKey,
    "set VITE_CLERK_PROXY_URL=" + $clerkProxyUrl,
    "set VITE_API_URL=" + $Config.ApiPublicUrl,
    "set NODE_ENV=production",
    "`"" + $nodePath + "`" `"" + $viteJs + "`" preview --config `"" + $viteConfigPath + "`" --host 0.0.0.0 --port " + $Config.FrontendPort
)
[System.IO.File]::WriteAllText($frontendLauncher, ($frontendLines -join "`r`n"), $utf8NoBom)
Write-OK "Created start-frontend.cmd"

function Install-NssmService {
    param([string]$SvcName, [string]$DisplayName, [string]$Launcher)
    $existing = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Info "Removing old service: $SvcName"
        try { & $nssmPath stop $SvcName 2>&1 | Out-Null } catch {}
        Start-Sleep -Seconds 2
        try { & $nssmPath remove $SvcName confirm 2>&1 | Out-Null } catch {}
        Start-Sleep -Seconds 2
    }
    & $nssmPath install     $SvcName "cmd.exe" "/c `"$Launcher`""
    & $nssmPath set         $SvcName DisplayName    $DisplayName
    & $nssmPath set         $SvcName Description    "Grand Palace Hotels and Resorts - $DisplayName"
    & $nssmPath set         $SvcName AppDirectory   $Config.InstallDir
    & $nssmPath set         $SvcName Start          SERVICE_AUTO_START
    & $nssmPath set         $SvcName AppStdout      (Join-Path $LogDir "$SvcName-out.log")
    & $nssmPath set         $SvcName AppStderr      (Join-Path $LogDir "$SvcName-err.log")
    & $nssmPath set         $SvcName AppRotateFiles  1
    & $nssmPath set         $SvcName AppRotateBytes  10485760
    & $nssmPath set         $SvcName AppRotateOnline 1
    & $nssmPath set         $SvcName AppRestartDelay 3000
    & $nssmPath set         $SvcName AppThrottle     10000
    Write-OK "Service registered: $SvcName"
}

Install-NssmService -SvcName "GrandPalaceAPI"      -DisplayName "Grand Palace - API Server" -Launcher $apiLauncher
Install-NssmService -SvcName "GrandPalaceFrontend" -DisplayName "Grand Palace - Frontend"   -Launcher $frontendLauncher

# ===========================================================
# STEP 11 -- START SERVICES + HEALTH CHECK
# ===========================================================
Write-Step "11/12" "Starting services and health check"

$startFailed = @()
foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend")) {
    try {
        Start-Service -Name $svc
        Write-OK "$svc started"
    } catch {
        $startFailed += $svc
        Write-Err "$svc failed to start: $_"
        $errLog = Join-Path $LogDir "$svc-err.log"
        if (Test-Path $errLog) {
            Write-Host "  Last log lines:" -ForegroundColor Red
            Get-Content $errLog -ErrorAction SilentlyContinue | Select-Object -Last 20 |
                ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }
    }
    Start-Sleep -Seconds 3
}

$apiReady  = $false
$healthUrl = "http://localhost:" + $Config.ApiPort + "/api/healthz"
Write-Info "Waiting for API at $healthUrl ..."
for ($i = 1; $i -le 12; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -lt 400) { $apiReady = $true; break }
    } catch {}
    Write-Info "  Attempt $i/12 -- waiting 5 s..."
    Start-Sleep -Seconds 5
}
if ($apiReady) { Write-OK "API health check passed" }
else { Write-Warn "API did not respond within 60 s. Check: $LogDir\GrandPalaceAPI-err.log" }

$apiStatus      = (Get-Service -Name "GrandPalaceAPI"      -ErrorAction SilentlyContinue).Status
$frontendStatus = (Get-Service -Name "GrandPalaceFrontend" -ErrorAction SilentlyContinue).Status
Write-OK "GrandPalaceAPI:      $apiStatus"
Write-OK "GrandPalaceFrontend: $frontendStatus"

# ===========================================================
# STEP 12 -- FIREWALL RULES
# ===========================================================
Write-Step "12/12" "Firewall rules"

netsh advfirewall firewall delete rule name="Grand Palace API"      2>&1 | Out-Null
netsh advfirewall firewall add    rule name="Grand Palace API"      dir=in action=allow protocol=TCP localport=$($Config.ApiPort) | Out-Null
Write-OK "Firewall: 'Grand Palace API' -> port $($Config.ApiPort)"

netsh advfirewall firewall delete rule name="Grand Palace Frontend" 2>&1 | Out-Null
netsh advfirewall firewall add    rule name="Grand Palace Frontend" dir=in action=allow protocol=TCP localport=$($Config.FrontendPort) | Out-Null
Write-OK "Firewall: 'Grand Palace Frontend' -> port $($Config.FrontendPort)"

# ===========================================================
# DONE
# ===========================================================
Stop-Transcript -ErrorAction SilentlyContinue | Out-Null

$serverIp = try {
    (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
     Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
     Select-Object -First 1 -ExpandProperty IPAddress)
} catch {
    try { (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1).IPV4Address.IPAddressToString }
    catch { "YOUR_SERVER_IP" }
}
if (-not $serverIp) { $serverIp = "YOUR_SERVER_IP" }

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Grand Palace Hotels and Resorts -- INSTALLED" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://$serverIp`:$($Config.FrontendPort)/"    -ForegroundColor White
Write-Host "  API      : http://$serverIp`:$($Config.ApiPort)/api/"     -ForegroundColor White
Write-Host "  Admin    : http://$serverIp`:$($Config.FrontendPort)/admin" -ForegroundColor White
Write-Host ""
Write-Host "  Services (auto-start on reboot):"
Write-Host "    GrandPalaceAPI      port $($Config.ApiPort)"
Write-Host "    GrandPalaceFrontend port $($Config.FrontendPort)"
Write-Host ""
Write-Host "  Logs     : $LogDir"
Write-Host "  Env file : $envFile"
Write-Host "  Log file : $LogFile"

if ($startFailed.Count -gt 0) {
    Write-Host ""
    Write-Host "  WARNING: Services that failed to start:" -ForegroundColor Red
    $startFailed | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host "  Check error logs in: $LogDir" -ForegroundColor Red
}

if ($Config.ClerkPublishableKey -like "*REPLACE*" -or $Config.ClerkSecretKey -like "*REPLACE*") {
    Write-Host ""
    Write-Host "  ACTION REQUIRED: Clerk keys are still placeholders." -ForegroundColor Red
    Write-Host "    Edit the Config block at the top and run the script again." -ForegroundColor Red
    Write-Host "    Get your keys at: https://dashboard.clerk.com" -ForegroundColor Red
}

if ($Config.ApiPublicUrl -like "*YOUR_SERVER_IP*") {
    Write-Host ""
    Write-Host "  TIP: Update ApiPublicUrl / FrontendUrl in Config for MoMo callbacks." -ForegroundColor Yellow
    Write-Host "    Then re-run with: -SkipBuild" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to close"
