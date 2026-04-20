#Requires -RunAsAdministrator
# MAISON DELUXE Hotels & Resorts - Windows Server Installer
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
    NeonDatabaseUrl     = "postgresql://neondb_owner:npg_YCEZLyV6gwi7@ep-fragrant-sunset-a18l1eva-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

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
    netsh advfirewall firewall delete rule name="MAISON DELUXE API"      2>&1 | Out-Null
    netsh advfirewall firewall delete rule name="MAISON DELUXE Frontend" 2>&1 | Out-Null
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

# When ApiPublicUrl is still the placeholder, use relative URLs so the
# Node.js frontend proxy (serve-frontend.mjs) forwards /api/* to port 8080.
# This avoids baking an unresolvable hostname into the JS bundle.
$ViteApiUrl = if ($Config.ApiPublicUrl -match "YOUR_SERVER_IP") { "" } else { $Config.ApiPublicUrl }
if ($ViteApiUrl -eq "") {
    Write-Warn "ApiPublicUrl not configured -- frontend will use relative API URLs (proxied via port $($Config.FrontendPort))"
}

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

    # ------------------------------------------------------------------
    # Re-load the .env file written in Step 6 so every child process
    # (drizzle-kit, seed, esbuild...) inherits the correct values even
    # when PowerShell's $env: inheritance is unreliable across pnpm's
    # subprocess chain on Windows Server.
    # ------------------------------------------------------------------
    function Load-DotEnv([string]$path) {
        if (-not (Test-Path $path)) { return }
        Get-Content $path -Encoding UTF8 | ForEach-Object {
            $line = $_.Trim()
            if ($line -eq "" -or $line.StartsWith("#")) { return }
            $idx = $line.IndexOf("=")
            if ($idx -lt 1) { return }
            $k = $line.Substring(0, $idx).Trim()
            $v = $line.Substring($idx + 1)
            [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
        }
    }
    Load-DotEnv (Join-Path $Config.InstallDir ".env")

    # Belt-and-suspenders: explicitly set the two critical DB vars so they
    # are present even if the .env reload somehow misses them.
    [System.Environment]::SetEnvironmentVariable("DATABASE_URL",      $DatabaseUrl,     "Process")
    [System.Environment]::SetEnvironmentVariable("NEON_DATABASE_URL", $NeonDatabaseUrl, "Process")

    $previewUrl = if ($DatabaseUrl.Length -gt 60) { $DatabaseUrl.Substring(0,60) + "..." } else { $DatabaseUrl }
    Write-Info "DB URL (first 60 chars): $previewUrl"

    if ([string]::IsNullOrEmpty($DatabaseUrl)) {
        Fail "DATABASE_URL is empty before schema push -- check NeonDatabaseUrl in the Config block."
    }

    Write-Info "Applying database schema..."
    # Use cmd /c with inline SET so drizzle-kit inherits the vars even in
    # restricted PowerShell execution environments on Windows Server.
    & cmd /c "set DATABASE_URL=$DatabaseUrl && set NEON_DATABASE_URL=$NeonDatabaseUrl && pnpm --filter `"@workspace/db`" run push"
    if ($LASTEXITCODE -ne 0) { Fail "Database schema push failed. Check NeonDatabaseUrl and network connectivity to Neon." }
    Write-OK "Database schema applied"

    Write-Info "Seeding initial data (auto-skipped if data already exists)..."
    & cmd /c "set DATABASE_URL=$DatabaseUrl && set NEON_DATABASE_URL=$NeonDatabaseUrl && pnpm --filter `"@workspace/scripts`" run seed"
    if ($LASTEXITCODE -ne 0) { Fail "Database seed script failed. See output above." }
    Write-OK "Database seed complete"

    if (-not $SkipBuild) {
        $apiDistDir = Join-Path $Config.InstallDir "artifacts\api-server\dist"
        if (Test-Path $apiDistDir) {
            Write-Info "Removing old API build..."
            Remove-Item $apiDistDir -Recurse -Force
        }
        Write-Info "Building API server..."
        & cmd /c "set DATABASE_URL=$DatabaseUrl && set NEON_DATABASE_URL=$NeonDatabaseUrl && set NODE_ENV=production && pnpm --filter `"@workspace/api-server`" run build"
        if ($LASTEXITCODE -ne 0) { Fail "API server build failed." }
        Write-OK "API server built"

        $frontendDistDir = Join-Path $Config.InstallDir "artifacts\hotel-system\dist"
        if (Test-Path $frontendDistDir) {
            Write-Info "Removing old frontend build..."
            Remove-Item $frontendDistDir -Recurse -Force
        }
        Write-Info "Building frontend..."
        & cmd /c "set PORT=$($Config.FrontendPort) && set BASE_PATH=/ && set NODE_ENV=production && set VITE_CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey) && set VITE_CLERK_PROXY_URL=$clerkProxyUrl && set VITE_API_URL=$ViteApiUrl && pnpm --filter `"@workspace/hotel-system`" run build"
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
    'set "PORT=' + $Config.ApiPort + '"',
    'set "DATABASE_URL=' + $DatabaseUrl + '"',
    'set "NEON_DATABASE_URL=' + $NeonDatabaseUrl + '"',
    'set "CLERK_SECRET_KEY=' + $Config.ClerkSecretKey + '"',
    'set "CLERK_PUBLISHABLE_KEY=' + $Config.ClerkPublishableKey + '"',
    'set "SESSION_SECRET=' + $sessionSecret + '"',
    'set "CONTACT_ENCRYPTION_KEY=' + $contactEncKey + '"',
    'set "NODE_ENV=production"',
    'set "MOMO_PARTNER_CODE=' + $Config.MomoPartnerCode + '"',
    'set "MOMO_ACCESS_KEY=' + $Config.MomoAccessKey + '"',
    'set "MOMO_SECRET_KEY=' + $Config.MomoSecretKey + '"',
    'set "MOMO_ENDPOINT=' + $Config.MomoEndpoint + '"',
    'set "API_PUBLIC_URL=' + $Config.ApiPublicUrl + '"',
    'set "FRONTEND_URL=' + $Config.FrontendUrl + '"',
    "`"" + $nodePath + "`" --enable-source-maps `"" + $apiDistPath + "`""
)
[System.IO.File]::WriteAllText($apiLauncher, ($apiLines -join "`r`n"), $utf8NoBom)
Write-OK "Created start-api.cmd"

# Write a self-contained Node.js static file server that avoids all Vite/Replit
# plugin dependencies. It serves the built frontend and proxies /api/* to the API.
$serveScript = Join-Path $Config.InstallDir "serve-frontend.mjs"
$serveLines = @(
    "import http from 'http';",
    "import https from 'https';",
    "import fs from 'fs';",
    "import path from 'path';",
    "import { fileURLToPath } from 'url';",
    "const PORT = parseInt(process.env.PORT || '3000', 10);",
    "const API_URL = process.env.VITE_API_URL || 'http://localhost:8080';",
    "const __dirname = path.dirname(fileURLToPath(import.meta.url));",
    "const ROOT = path.join(__dirname, 'artifacts', 'hotel-system', 'dist', 'public');",
    "const MIME = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.webp':'image/webp', '.txt':'text/plain' };",
    "const parsed = new URL(API_URL);",
    "const apiHost = parsed.hostname;",
    "const apiPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');",
    "const apiMod = parsed.protocol === 'https:' ? https : http;",
    "http.createServer((req, res) => {",
    "  if (req.url.startsWith('/api/')) {",
    "    const opts = { hostname: apiHost, port: apiPort, path: req.url, method: req.method, headers: { ...req.headers, host: apiHost + ':' + apiPort } };",
    "    const pr = apiMod.request(opts, ps => { res.writeHead(ps.statusCode, ps.headers); ps.pipe(res); });",
    "    pr.on('error', () => { res.writeHead(502); res.end('Bad Gateway'); });",
    "    req.pipe(pr); return;",
    "  }",
    "  let fp = path.join(ROOT, req.url.split('?')[0].split('#')[0]);",
    "  if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) fp = path.join(ROOT, 'index.html');",
    "  if (!fs.existsSync(fp)) { res.writeHead(404); res.end('Not found'); return; }",
    "  const ext = path.extname(fp).toLowerCase();",
    "  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });",
    "  fs.createReadStream(fp).pipe(res);",
    "}).listen(PORT, '0.0.0.0', () => console.log('Frontend serving on port ' + PORT));"
)
[System.IO.File]::WriteAllText($serveScript, ($serveLines -join "`r`n") + "`r`n", $utf8NoBom)
Write-OK "Created serve-frontend.mjs"

$frontendLauncher = Join-Path $Config.InstallDir "start-frontend.cmd"
$frontendLines = @(
    "@echo off",
    'set "PORT=' + $Config.FrontendPort + '"',
    'set "NODE_ENV=production"',
    'set "VITE_API_URL=' + $Config.ApiPublicUrl + '"',
    "`"" + $nodePath + "`" `"" + $serveScript + "`""
)
[System.IO.File]::WriteAllText($frontendLauncher, ($frontendLines -join "`r`n"), $utf8NoBom)
Write-OK "Created start-frontend.cmd (uses built-in Node.js static server)"

# Register a service with NSSM to run node.exe directly (no cmd.exe / batch file),
# then write all environment variables into the Windows registry as REG_MULTI_SZ.
# This completely avoids cmd.exe quoting issues with &, :, //, spaces, etc.
function Install-NssmService {
    param(
        [string]$SvcName,
        [string]$DisplayName,
        [string]$Application,
        [string]$AppParameters,
        [string[]]$EnvVars
    )
    $existing = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Info "Removing old service: $SvcName"
        try { & $nssmPath stop $SvcName 2>&1 | Out-Null } catch {}
        Start-Sleep -Seconds 2
        try { & $nssmPath remove $SvcName confirm 2>&1 | Out-Null } catch {}
        Start-Sleep -Seconds 2
    }
    & $nssmPath install $SvcName $Application $AppParameters
    & $nssmPath set $SvcName DisplayName    $DisplayName
    & $nssmPath set $SvcName Description    "MAISON DELUXE Hotels and Resorts - $DisplayName"
    & $nssmPath set $SvcName AppDirectory   $Config.InstallDir
    & $nssmPath set $SvcName Start          SERVICE_AUTO_START
    & $nssmPath set $SvcName AppStdout      (Join-Path $LogDir "$SvcName-out.log")
    & $nssmPath set $SvcName AppStderr      (Join-Path $LogDir "$SvcName-err.log")
    & $nssmPath set $SvcName AppRotateFiles  1
    & $nssmPath set $SvcName AppRotateBytes  10485760
    & $nssmPath set $SvcName AppRotateOnline 1
    & $nssmPath set $SvcName AppRestartDelay 3000
    & $nssmPath set $SvcName AppThrottle     10000

    # Write environment variables directly to the registry as REG_MULTI_SZ.
    # Values with &, :, //, spaces are stored verbatim -- no cmd.exe parsing at all.
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$SvcName\Parameters"
    if (Test-Path $regPath) {
        New-ItemProperty -Path $regPath -Name "AppEnvironmentExtra" `
            -Value $EnvVars -PropertyType MultiString -Force | Out-Null
        Write-Info "Environment variables written to registry for $SvcName"
    } else {
        Write-Warn "Registry path not found for $SvcName -- env vars may not be set"
    }
    Write-OK "Service registered: $SvcName"
}

$apiEnvVars = @(
    "PORT=$($Config.ApiPort)",
    "DATABASE_URL=$DatabaseUrl",
    "NEON_DATABASE_URL=$NeonDatabaseUrl",
    "CLERK_SECRET_KEY=$($Config.ClerkSecretKey)",
    "CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "SESSION_SECRET=$sessionSecret",
    "CONTACT_ENCRYPTION_KEY=$contactEncKey",
    "NODE_ENV=production",
    "MOMO_PARTNER_CODE=$($Config.MomoPartnerCode)",
    "MOMO_ACCESS_KEY=$($Config.MomoAccessKey)",
    "MOMO_SECRET_KEY=$($Config.MomoSecretKey)",
    "MOMO_ENDPOINT=$($Config.MomoEndpoint)",
    "API_PUBLIC_URL=$($Config.ApiPublicUrl)",
    "FRONTEND_URL=$($Config.FrontendUrl)"
)
Install-NssmService `
    -SvcName      "GrandPalaceAPI" `
    -DisplayName  "MAISON DELUXE - API Server" `
    -Application  $nodePath `
    -AppParameters "--enable-source-maps `"$apiDistPath`"" `
    -EnvVars      $apiEnvVars

$frontendEnvVars = @(
    "PORT=$($Config.FrontendPort)",
    "NODE_ENV=production",
    "VITE_API_URL=$($Config.ApiPublicUrl)"
)
Install-NssmService `
    -SvcName      "GrandPalaceFrontend" `
    -DisplayName  "MAISON DELUXE - Frontend" `
    -Application  $nodePath `
    -AppParameters "`"$serveScript`"" `
    -EnvVars      $frontendEnvVars

# ===========================================================
# STEP 11 -- START SERVICES + HEALTH CHECK
# ===========================================================
Write-Step "11/12" "Starting services and health check"

# -- Start both services ------------------------------------------------
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

# -- [CHECK 1] API basic health ------------------------------------------
$apiReady  = $false
$healthUrl = "http://localhost:" + $Config.ApiPort + "/api/healthz"
Write-Info "Waiting for API at $healthUrl ..."
for ($i = 1; $i -le 15; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -lt 400) { $apiReady = $true; break }
    } catch {}
    Write-Info "  Attempt $i/15 -- waiting 5 s..."
    Start-Sleep -Seconds 5
}
if ($apiReady) { Write-OK "[CHECK 1] API health check passed" }
else {
    Write-Err "[CHECK 1] API did not respond within 75 s"
    $errLog = Join-Path $LogDir "GrandPalaceAPI-err.log"
    if (Test-Path $errLog) {
        Write-Host "  --- Last 30 lines of API error log ---" -ForegroundColor DarkRed
        Get-Content $errLog -ErrorAction SilentlyContinue | Select-Object -Last 30 |
            ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
}

# -- [CHECK 2] Verify env vars in Windows registry ----------------------
Write-Info "[CHECK 2] Verifying GrandPalaceAPI environment variables in registry..."
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\GrandPalaceAPI\Parameters"
if (Test-Path $regPath) {
    $regVal = (Get-ItemProperty -Path $regPath -Name "AppEnvironmentExtra" -ErrorAction SilentlyContinue).AppEnvironmentExtra
    if ($regVal) {
        $hasClerk  = ($regVal | Where-Object { $_ -match "^CLERK_SECRET_KEY=.+" }) -ne $null
        $hasDb     = ($regVal | Where-Object { $_ -match "^(NEON_DATABASE_URL|DATABASE_URL)=.+" }) -ne $null
        $hasPort   = ($regVal | Where-Object { $_ -match "^PORT=" }) -ne $null
        if ($hasClerk -and $hasDb -and $hasPort) {
            Write-OK "[CHECK 2] CLERK_SECRET_KEY, DATABASE_URL, PORT all present in service registry"
        } else {
            if (-not $hasClerk) { Write-Err "[CHECK 2] CLERK_SECRET_KEY MISSING from service registry -- all API routes will return 500!" }
            if (-not $hasDb)    { Write-Err "[CHECK 2] DATABASE_URL / NEON_DATABASE_URL MISSING from service registry!" }
            if (-not $hasPort)  { Write-Err "[CHECK 2] PORT MISSING from service registry!" }
            Write-Warn "Registered env vars for GrandPalaceAPI:"
            $regVal | ForEach-Object {
                $display = if ($_ -match "^(CLERK_SECRET_KEY|.*_KEY|.*_SECRET|.*PASSWORD)=") { ($_ -replace "=.*", "=***hidden***") } else { $_ }
                Write-Host "    $display" -ForegroundColor DarkYellow
            }
        }
    } else {
        Write-Err "[CHECK 2] AppEnvironmentExtra key EMPTY in registry -- no env vars injected into service!"
    }
} else {
    Write-Warn "[CHECK 2] Registry path not found: $regPath"
}

# -- [CHECK 3] Database connectivity and seed data ----------------------
Write-Info "[CHECK 3] Verifying database has data (hotels + rooms)..."
if ($apiReady) {
    try {
        $hotelsResp = Invoke-WebRequest -Uri "http://localhost:$($Config.ApiPort)/api/hotels" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $hotelsJson = $hotelsResp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        $hotelCount = if ($hotelsJson -is [Array]) { $hotelsJson.Count } elseif ($hotelsJson) { 1 } else { 0 }
        if ($hotelsJson -and $hotelCount -gt 0) {
            Write-OK "[CHECK 3a] Hotels endpoint OK -- $hotelCount hotel(s) found in database"
        } else {
            Write-Err "[CHECK 3a] Hotels endpoint returned 0 records -- seed may have failed"
        }
    } catch {
        Write-Err "[CHECK 3a] Hotels endpoint failed: $_"
    }
    try {
        $roomsResp = Invoke-WebRequest -Uri "http://localhost:$($Config.ApiPort)/api/rooms" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $roomsJson = $roomsResp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        $roomCount = if ($roomsJson -is [Array]) { $roomsJson.Count } elseif ($roomsJson) { 1 } else { 0 }
        if ($roomsJson -and $roomCount -gt 0) {
            Write-OK "[CHECK 3b] Rooms endpoint OK -- $roomCount room(s) found in database"
        } else {
            Write-Err "[CHECK 3b] Rooms endpoint returned 0 records!"
            Write-Warn "Re-run seed manually from $($Config.InstallDir):"
            Write-Host "    cmd /c `"set DATABASE_URL=$DatabaseUrl && pnpm --filter @workspace/scripts run seed`"" -ForegroundColor Yellow
        }
    } catch {
        Write-Err "[CHECK 3b] Rooms endpoint failed: $_"
    }
} else {
    Write-Warn "[CHECK 3] Skipped -- API is not responding"
}

# -- [CHECK 4] Frontend reachable ----------------------------------------
Write-Info "[CHECK 4] Verifying frontend is serving on port $($Config.FrontendPort)..."
$frontendReady = $false
for ($i = 1; $i -le 6; $i++) {
    try {
        $fr = Invoke-WebRequest -Uri "http://localhost:$($Config.FrontendPort)/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($fr.StatusCode -lt 400) { $frontendReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 3
}
if ($frontendReady) { Write-OK "[CHECK 4] Frontend serving on port $($Config.FrontendPort)" }
else {
    Write-Err "[CHECK 4] Frontend not responding on port $($Config.FrontendPort)"
    $feLog = Join-Path $LogDir "GrandPalaceFrontend-err.log"
    if (Test-Path $feLog) {
        Write-Host "  --- Last 20 lines of frontend error log ---" -ForegroundColor DarkRed
        Get-Content $feLog -ErrorAction SilentlyContinue | Select-Object -Last 20 |
            ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
}

# -- [CHECK 5] VITE_API_URL baked into bundle ----------------------------
Write-Info "[CHECK 5] Checking API URL baked into frontend bundle..."
$distAssets = Join-Path $Config.InstallDir "artifacts\hotel-system\dist\public\assets"
if (Test-Path $distAssets) {
    $jsFile = Get-ChildItem -Path $distAssets -Filter "index-*.js" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($jsFile) {
        $bundleSnip = Get-Content $jsFile.FullName -Raw -ErrorAction SilentlyContinue
        if ($bundleSnip -match "YOUR_SERVER_IP") {
            Write-Err "[CHECK 5] Bundle contains placeholder YOUR_SERVER_IP -- rooms/hotels will NOT load!"
            Write-Warn "Set ApiPublicUrl in the Config block to your real IP and re-run final.ps1 (without -SkipBuild)"
        } elseif ($ViteApiUrl -eq "") {
            Write-OK "[CHECK 5] Frontend uses relative API URLs -- proxied via serve-frontend.mjs. OK."
        } else {
            Write-OK "[CHECK 5] Frontend API URL: $ViteApiUrl"
        }
    } else {
        Write-Warn "[CHECK 5] No index-*.js found in dist/assets -- was the frontend built?"
    }
} else {
    Write-Warn "[CHECK 5] Frontend dist/assets directory not found: $distAssets"
}

# -- Summary -------------------------------------------------------------
$apiStatus      = (Get-Service -Name "GrandPalaceAPI"      -ErrorAction SilentlyContinue).Status
$frontendStatus = (Get-Service -Name "GrandPalaceFrontend" -ErrorAction SilentlyContinue).Status
Write-OK "GrandPalaceAPI:      $apiStatus"
Write-OK "GrandPalaceFrontend: $frontendStatus"
# ===========================================================
# STEP 12 -- FIREWALL RULES
# ===========================================================
Write-Step "12/12" "Firewall rules"

netsh advfirewall firewall delete rule name="MAISON DELUXE API"      2>&1 | Out-Null
netsh advfirewall firewall add    rule name="MAISON DELUXE API"      dir=in action=allow protocol=TCP localport=$($Config.ApiPort) | Out-Null
Write-OK "Firewall: 'MAISON DELUXE API' -> port $($Config.ApiPort)"

netsh advfirewall firewall delete rule name="MAISON DELUXE Frontend" 2>&1 | Out-Null
netsh advfirewall firewall add    rule name="MAISON DELUXE Frontend" dir=in action=allow protocol=TCP localport=$($Config.FrontendPort) | Out-Null
Write-OK "Firewall: 'MAISON DELUXE Frontend' -> port $($Config.FrontendPort)"

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
Write-Host "  MAISON DELUXE Hotels and Resorts -- INSTALLED" -ForegroundColor Green
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
