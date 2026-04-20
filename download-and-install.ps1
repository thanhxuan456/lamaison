#Requires -RunAsAdministrator
# MAISON DELUXE Hotels & Resorts - Download & Install Script
# Compatible with Windows Server 2019 / 2022 / 2025
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File download-and-install.ps1
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
#   5.  DOWNLOADS source code ZIP from SourceZipUrl and extracts it
#   6.  Writes the .env configuration file (secrets auto-generated)
#   7.  Patches package.json / pnpm-workspace.yaml for Windows
#   8.  Installs all npm dependencies (pnpm install)
#   9.  Pushes DB schema (drizzle-kit push) + seeds initial data
#   10. Builds API server + frontend
#   11. Installs auto-starting Windows Services via NSSM
#   12. Opens firewall ports + health check

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
    InstallDir      = "C:\GrandPalace"
    ApiPort         = 8080
    FrontendPort    = 3000

    # -- SOURCE DOWNLOAD ---------------------------------------------------
    # URL to a ZIP archive of the project source code.
    # Examples:
    #   GitHub release :  https://github.com/YOUR_ORG/YOUR_REPO/archive/refs/heads/main.zip
    #   Direct ZIP      :  https://example.com/maison-deluxe-src.zip
    # Leave SourceZipUrl empty ("") to skip download and copy from the script directory instead.
    SourceZipUrl    = ""

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
    MomoPartnerCode     = "MOMO"
    MomoAccessKey       = "F8BBA842ECF85"
    MomoSecretKey       = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
    MomoEndpoint        = "https://test-payment.momo.vn/v2/gateway/api/create"

    # -- PUBLIC SERVER URLS ------------------------------------------------
    # Set to your server's real IP address or domain name
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

$LogFile   = Join-Path $env:TEMP ("MaisonDeluxeInstall_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")
$TempDir   = Join-Path $env:TEMP "MaisonDeluxeSetup"
$LogDir    = Join-Path $Config.InstallDir "logs"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Start-Transcript -Path $LogFile -Append -ErrorAction SilentlyContinue | Out-Null
Write-Host "  Install log: $LogFile" -ForegroundColor DarkGray

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
    Write-Err "Full log: $LogFile"
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
            Write-Info "Service not found: $svc"
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
    Fail "Windows Server 2019 or later required (build 17763+). Found: $($os.BuildNumber)"
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
    $nodeUrl = "https://nodejs.org/dist/v$($Config.NodeVersion)/node-v$($Config.NodeVersion)-x64.msi"
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
        $pgInstaller  = Join-Path $TempDir "pg-installer.exe"
        $pgDownloaded = $false
        foreach ($minor in @("4", "3", "2", "1", "0")) {
            $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$($Config.PgVersion).$minor-1-windows-x64.exe"
            try { Invoke-Download $pgUrl $pgInstaller; $pgDownloaded = $true; break } catch { continue }
        }
        if (-not $pgDownloaded) { Fail "Could not download PostgreSQL installer. Check your internet connection." }
        Write-Info "Installing PostgreSQL $($Config.PgVersion) silently (a few minutes)..."
        $pgArgs = "--mode unattended --unattendedmodeui none --superpassword `"$($Config.PgSuperPassword)`" --serverport 5432"
        Start-Process $pgInstaller -ArgumentList $pgArgs -Wait -NoNewWindow
        Update-EnvPath
        $pgBin = "C:\Program Files\PostgreSQL\$($Config.PgVersion)\bin"
        if (-not (Test-Path $pgBin)) { Fail "PostgreSQL bin not found at: $pgBin" }
        Write-OK "PostgreSQL $($Config.PgVersion) installed"
    }

    if ($pgBin -and (Test-Path $pgBin) -and ($env:Path -notlike "*$pgBin*")) {
        $env:Path = "$($env:Path);$pgBin"
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
    $DatabaseUrl     = "postgresql://$($Config.PgDbUser):$($Config.PgDbPassword)@localhost:5432/$($Config.PgDbName)"
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
# STEP 5 -- DOWNLOAD OR COPY SOURCE FILES
# ===========================================================
Write-Step "5/12" "Source code"

$sourceRoot = $null

if (-not [string]::IsNullOrWhiteSpace($Config.SourceZipUrl)) {
    # ---- DOWNLOAD path ---------------------------------------------------
    Write-Info "Downloading source ZIP from: $($Config.SourceZipUrl)"
    $zipDest    = Join-Path $TempDir "maison-deluxe-src.zip"
    $extractDir = Join-Path $TempDir "src-extracted"

    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

    Invoke-Download $Config.SourceZipUrl $zipDest
    Write-Info "Extracting ZIP..."
    Expand-Archive -Path $zipDest -DestinationPath $extractDir -Force

    # GitHub zips wrap everything in a single top-level folder -- unwrap it
    $children = Get-ChildItem $extractDir
    if ($children.Count -eq 1 -and $children[0].PSIsContainer) {
        $sourceRoot = $children[0].FullName
        Write-Info "Unwrapped GitHub-style ZIP root: $($children[0].Name)"
    } else {
        $sourceRoot = $extractDir
    }

    # Verify this looks like the right project
    $verifyFile = Join-Path $sourceRoot "lib\db\src\schema\index.ts"
    if (-not (Test-Path $verifyFile)) {
        Fail "Downloaded ZIP does not appear to be the MAISON DELUXE source (missing lib\db\src\schema\index.ts). Check SourceZipUrl."
    }
    Write-OK "Source downloaded and verified"

    Write-Info "Copying source to install directory..."
    robocopy "$sourceRoot" "$($Config.InstallDir)" /E /XD ".git" "node_modules" "dist" ".replit-artifact" "attached_assets" ".local" /XF ".env" "*.log" "*.map" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { Fail "File copy failed (robocopy exit code $LASTEXITCODE)." }
    Write-OK "Source files copied to $($Config.InstallDir)"
} else {
    # ---- LOCAL COPY path (fallback when no URL is provided) ---------------
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    Write-Info "No SourceZipUrl configured -- copying from script directory"
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
}

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

$clerkProxyUrl = "$($Config.ApiPublicUrl)/api/__clerk"
$ViteApiUrl    = if ($Config.ApiPublicUrl -match "YOUR_SERVER_IP") { "" } else { $Config.ApiPublicUrl }
if ($ViteApiUrl -eq "") {
    Write-Warn "ApiPublicUrl not configured -- frontend will use relative API URLs (proxied via port $($Config.FrontendPort))"
}

$envLines = @(
    "NODE_ENV=production",
    "DATABASE_URL=$DatabaseUrl",
    "NEON_DATABASE_URL=$NeonDatabaseUrl",
    "CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "CLERK_SECRET_KEY=$($Config.ClerkSecretKey)",
    "VITE_CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "VITE_CLERK_PROXY_URL=$clerkProxyUrl",
    "VITE_API_URL=$ViteApiUrl",
    "SESSION_SECRET=$sessionSecret",
    "CONTACT_ENCRYPTION_KEY=$contactEncKey",
    "PORT=$($Config.ApiPort)",
    "FRONTEND_PORT=$($Config.FrontendPort)",
    "BASE_PATH=/",
    "MOMO_PARTNER_CODE=$($Config.MomoPartnerCode)",
    "MOMO_ACCESS_KEY=$($Config.MomoAccessKey)",
    "MOMO_SECRET_KEY=$($Config.MomoSecretKey)",
    "MOMO_ENDPOINT=$($Config.MomoEndpoint)",
    "API_PUBLIC_URL=$($Config.ApiPublicUrl)",
    "FRONTEND_URL=$($Config.FrontendUrl)"
)
[System.IO.File]::WriteAllText($envFile, ($envLines -join "`n") + "`n", $utf8NoBom)
Write-OK ".env written to $envFile"

foreach ($line in $envLines) {
    if ($line -match "^([^#][^=]*)=(.*)") {
        [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2], "Process")
    }
}
[System.Environment]::SetEnvironmentVariable("DATABASE_URL",      $DatabaseUrl,     "Process")
[System.Environment]::SetEnvironmentVariable("NEON_DATABASE_URL", $NeonDatabaseUrl, "Process")

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
    $wsFiltered = $wsLines | Where-Object { $_ -notmatch '": "-"' }
    [System.IO.File]::WriteAllText($wsYaml, ($wsFiltered -join "`n") + "`n", $utf8NoBom)
    $removedCount = ($wsLines.Count - $wsFiltered.Count)
    Write-OK "Removed $removedCount platform-binary exclusion override(s)"
} else {
    Write-Warn "pnpm-workspace.yaml not found -- skipping"
}

# ===========================================================
# STEP 9 -- INSTALL DEPENDENCIES, PUSH DB SCHEMA, SEED, BUILD
# ===========================================================
Write-Step "9/12" "Install dependencies, push database schema, seed data, and build"

Push-Location $Config.InstallDir

try {
    # Stop any running services so their binaries are not locked
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
        Write-Info "Removing root node_modules for a clean reinstall..."
        & cmd /c "rmdir /s /q `"$nmDir`"" 2>&1 | Out-Null
        if (Test-Path $nmDir) { Start-Sleep -Seconds 4; & cmd /c "rmdir /s /q `"$nmDir`"" 2>&1 | Out-Null }
        if (Test-Path $nmDir) { Fail "Could not remove node_modules. Reboot the server and run again." }
        Write-OK "Root node_modules removed"
    }
    foreach ($pkgBase in @("artifacts", "lib")) {
        $pkgBaseDir = Join-Path $Config.InstallDir $pkgBase
        if (Test-Path $pkgBaseDir) {
            Get-ChildItem -Path $pkgBaseDir -Recurse -Filter "node_modules" -Directory -ErrorAction SilentlyContinue |
                ForEach-Object {
                    Write-Info "Removing $($_.FullName)..."
                    & cmd /c "rmdir /s /q `"$($_.FullName)`"" 2>&1 | Out-Null
                }
        }
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

    # Re-load .env so every child process (drizzle-kit, seed, esbuild) inherits the correct values
    Load-DotEnv (Join-Path $Config.InstallDir ".env")
    [System.Environment]::SetEnvironmentVariable("DATABASE_URL",      $DatabaseUrl,     "Process")
    [System.Environment]::SetEnvironmentVariable("NEON_DATABASE_URL", $NeonDatabaseUrl, "Process")

    # ------------------------------------------------------------------
    # DATABASE SCHEMA PUSH
    # ------------------------------------------------------------------
    $previewUrl = if ($DatabaseUrl.Length -gt 70) { $DatabaseUrl.Substring(0,70) + "..." } else { $DatabaseUrl }
    Write-Info "Pushing database schema to: $previewUrl"

    if ([string]::IsNullOrEmpty($DatabaseUrl)) {
        Fail "DATABASE_URL is empty before schema push -- check NeonDatabaseUrl in the Config block."
    }

    & pnpm --filter "@workspace/db" run push
    if ($LASTEXITCODE -ne 0) { Fail "Database schema push failed. Verify NeonDatabaseUrl and network connectivity." }
    Write-OK "Database schema applied"

    # ------------------------------------------------------------------
    # DATABASE SEED
    # ------------------------------------------------------------------
    Write-Info "Seeding initial data (auto-skipped if data already exists)..."
    & pnpm --filter "@workspace/scripts" run seed
    if ($LASTEXITCODE -ne 0) { Fail "Database seed script failed. See output above." }
    Write-OK "Database seeded"

    # ------------------------------------------------------------------
    # BUILD
    # ------------------------------------------------------------------
    if (-not $SkipBuild) {
        $apiDistDir = Join-Path $Config.InstallDir "artifacts\api-server\dist"
        if (Test-Path $apiDistDir) {
            Write-Info "Removing old API build..."
            Remove-Item $apiDistDir -Recurse -Force
        }
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
        [System.Environment]::SetEnvironmentVariable("PORT",                        [string]$Config.FrontendPort,      "Process")
        [System.Environment]::SetEnvironmentVariable("BASE_PATH",                   "/",                               "Process")
        [System.Environment]::SetEnvironmentVariable("NODE_ENV",                    "production",                      "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_CLERK_PUBLISHABLE_KEY",  $Config.ClerkPublishableKey,       "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_CLERK_PROXY_URL",        $clerkProxyUrl,                    "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_API_URL",                $ViteApiUrl,                       "Process")
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
    $nssmZip        = Join-Path $TempDir "nssm.zip"
    $nssmDownloaded = $false
    foreach ($nssmUrl in @(
        "https://nssm.cc/release/nssm-2.24.zip",
        "https://github.com/nicholasgasior/nssm/releases/download/v2.24/nssm-2.24.zip"
    )) {
        try { Invoke-Download $nssmUrl $nssmZip; $nssmDownloaded = $true; break }
        catch { Write-Warn "NSSM mirror failed: $nssmUrl -- trying next..." }
    }
    if (-not $nssmDownloaded) { Fail "Could not download NSSM. Check internet connectivity." }
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

$nodePath    = (Get-Command node).Source
$apiDistPath = Join-Path $Config.InstallDir "artifacts\api-server\dist\index.mjs"
if (-not (Test-Path $apiDistPath)) {
    Fail "API dist not found: $apiDistPath -- build may have failed."
}

$viteJs = Get-ChildItem (Join-Path $Config.InstallDir "node_modules\.pnpm") -Recurse -Filter "vite.js" -ErrorAction SilentlyContinue |
          Where-Object { $_.FullName -like "*\bin\vite.js" } |
          Sort-Object LastWriteTime -Descending |
          Select-Object -First 1 -ExpandProperty FullName
if (-not $viteJs) { Fail "Could not locate vite.js in pnpm store. Ensure pnpm install succeeded." }
Write-OK "Vite found: $viteJs"

# Build a self-contained static file server that proxies /api/* to the API
$serveScript = Join-Path $Config.InstallDir "serve-frontend.mjs"
$serveLines = @(
    "import http from 'http';",
    "import https from 'https';",
    "import net from 'net';",
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
    "const apiPort = parseInt(parsed.port || (parsed.protocol === 'https:' ? '443' : '80'), 10);",
    "const apiMod  = parsed.protocol === 'https:' ? https : http;",
    "const server = http.createServer((req, res) => {",
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
    "});",
    "server.on('upgrade', (req, socket, head) => {",
    "  if (!req.url.startsWith('/api/')) { socket.destroy(); return; }",
    "  const up = net.createConnection(apiPort, apiHost, () => {",
    "    const hdrs = Object.entries(req.headers).map(([k,v]) => k+': '+v).join('\\r\\n');",
    "    up.write('GET '+req.url+' HTTP/1.1\\r\\nHost: '+apiHost+':'+apiPort+'\\r\\n'+hdrs+'\\r\\n\\r\\n');",
    "    if (head && head.length) up.write(head);",
    "    up.pipe(socket); socket.pipe(up);",
    "  });",
    "  up.on('error', () => socket.destroy());",
    "  socket.on('error', () => up.destroy());",
    "});",
    "server.listen(PORT, '0.0.0.0', () => console.log('Frontend serving on port ' + PORT));"
)
[System.IO.File]::WriteAllText($serveScript, ($serveLines -join "`r`n") + "`r`n", $utf8NoBom)
Write-OK "Created serve-frontend.mjs"

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
    & $nssmPath install     $SvcName $Application $AppParameters
    & $nssmPath set         $SvcName DisplayName  $DisplayName
    & $nssmPath set         $SvcName Description  "MAISON DELUXE Hotels & Resorts - $DisplayName"
    & $nssmPath set         $SvcName Start        SERVICE_AUTO_START
    & $nssmPath set         $SvcName AppStdout    (Join-Path $LogDir "$SvcName-stdout.log")
    & $nssmPath set         $SvcName AppStderr    (Join-Path $LogDir "$SvcName-stderr.log")
    & $nssmPath set         $SvcName AppRotateFiles 1
    & $nssmPath set         $SvcName AppRotateBytes 10485760

    # Write env vars into the Windows registry (avoids cmd.exe quoting issues)
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$SvcName\Parameters\AppEnvironmentExtra"
    if ($EnvVars.Count -gt 0) {
        New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$SvcName\Parameters" `
                         -Name AppEnvironmentExtra -PropertyType MultiString -Value $EnvVars -Force | Out-Null
    }
    Write-OK "Service installed: $SvcName"
}

$commonEnv = @(
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
    -DisplayName  "MAISON DELUXE API Server" `
    -Application  $nodePath `
    -AppParameters "--enable-source-maps `"$apiDistPath`"" `
    -EnvVars      ($commonEnv + @("PORT=$($Config.ApiPort)"))

Install-NssmService `
    -SvcName      "GrandPalaceFrontend" `
    -DisplayName  "MAISON DELUXE Frontend" `
    -Application  $nodePath `
    -AppParameters "`"$serveScript`"" `
    -EnvVars      ($commonEnv + @(
        "PORT=$($Config.FrontendPort)",
        "VITE_API_URL=$ViteApiUrl"
    ))

# ===========================================================
# STEP 11 -- START SERVICES
# ===========================================================
Write-Step "11/12" "Starting services"

foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend")) {
    Write-Info "Starting $svc..."
    try {
        Start-Service -Name $svc -ErrorAction Stop
        Write-OK "$svc started"
    } catch {
        Write-Warn "Could not start $svc automatically: $_"
        Write-Warn "Try manually: Start-Service -Name $svc"
    }
}

# ===========================================================
# STEP 12 -- FIREWALL + HEALTH CHECK
# ===========================================================
Write-Step "12/12" "Firewall rules and health check"

foreach ($rule in @(
    @{ Name="MAISON DELUXE API";      Port=$Config.ApiPort      },
    @{ Name="MAISON DELUXE Frontend"; Port=$Config.FrontendPort }
)) {
    netsh advfirewall firewall delete rule name=$($rule.Name) 2>&1 | Out-Null
    netsh advfirewall firewall add rule `
        name=$($rule.Name) `
        dir=in action=allow protocol=TCP `
        localport=$($rule.Port) 2>&1 | Out-Null
    Write-OK "Firewall opened: TCP $($rule.Port) ($($rule.Name))"
}

Start-Sleep -Seconds 5
Write-Info "Running health check on API (http://localhost:$($Config.ApiPort)/api/hotels)..."
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$($Config.ApiPort)/api/hotels" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    if ($resp.StatusCode -eq 200) {
        Write-OK "API health check passed (HTTP 200)"
    } else {
        Write-Warn "API returned HTTP $($resp.StatusCode) -- may still be starting up"
    }
} catch {
    Write-Warn "Health check failed: $_"
    Write-Warn "The service may need a few more seconds. Check: http://localhost:$($Config.ApiPort)/api/hotels"
}

# ===========================================================
# DONE
# ===========================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  MAISON DELUXE installation complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-OK "API server  : http://localhost:$($Config.ApiPort)"
Write-OK "Frontend    : http://localhost:$($Config.FrontendPort)"
Write-OK "Admin panel : http://localhost:$($Config.FrontendPort)/admin"
Write-OK "Install log : $LogFile"
Write-Host ""
if ($Config.ApiPublicUrl -match "YOUR_SERVER_IP") {
    Write-Warn "REMINDER: Update ApiPublicUrl and FrontendUrl in the Config block with your real server IP or domain."
    Write-Warn "          Then re-run this script to regenerate .env and the service environment."
}
Write-Host ""

Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
