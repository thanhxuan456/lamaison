#Requires -RunAsAdministrator
# Grand Palace Hotels & Resorts - PostgreSQL Updater
# Safely backs up the database, upgrades PostgreSQL, and restores data.
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File update-postgres.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ===========================================================
# CONFIGURATION
# ===========================================================
$Config = @{
    # Target PostgreSQL version to upgrade TO
    NewPgVersion    = "16"

    # Your database name and superuser
    DbName          = "grandpalace"
    BackupDir       = "C:\GrandPalace\pg-backups"

    # Application services to stop during upgrade
    Services        = @("GrandPalaceAPI", "GrandPalaceFrontend")
}
# ===========================================================

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ">>> $msg" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Info([string]$msg) {
    Write-Host "  --> $msg" -ForegroundColor Yellow
}

function Write-Warn([string]$msg) {
    Write-Host "  [!!] $msg" -ForegroundColor Yellow
}

function Invoke-Download([string]$url, [string]$dest) {
    Write-Info "Downloading: $url"
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $dest)
}

function Get-PgBin {
    # Only return a bin directory that actually contains psql.exe directly inside it
    $pgBinSearch = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName "psql.exe") } |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if ($pgBinSearch) { return $pgBinSearch.FullName }
    return $null
}

function Get-PgVersion {
    $pgBin = Get-PgBin
    if ($pgBin) {
        $ver = & "$pgBin\psql.exe" --version 2>&1
        if ($ver -match "(\d+\.\d+)") { return $Matches[1] }
    }
    return "unknown"
}

$TempDir = Join-Path $env:TEMP "GrandPalaceSetup"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
New-Item -ItemType Directory -Force -Path $Config.BackupDir | Out-Null

# ===========================================================
# SHOW CURRENT STATE
# ===========================================================
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Grand Palace - PostgreSQL Updater" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

$currentVer = Get-PgVersion
Write-Host "  Current PostgreSQL version : $currentVer" -ForegroundColor White
Write-Host "  Target  PostgreSQL version : $($Config.NewPgVersion)" -ForegroundColor White
Write-Host ""

if ($currentVer -like "$($Config.NewPgVersion)*") {
    Write-Host "  PostgreSQL is already at version $($Config.NewPgVersion)." -ForegroundColor Green
    Write-Host "  Nothing to upgrade." -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 0
}

Write-Host "  This script will:" -ForegroundColor White
Write-Host "    1. Stop the Grand Palace services" -ForegroundColor White
Write-Host "    2. Back up the database to $($Config.BackupDir)" -ForegroundColor White
Write-Host "    3. Install PostgreSQL $($Config.NewPgVersion)" -ForegroundColor White
Write-Host "    4. Restore the database" -ForegroundColor White
Write-Host "    5. Restart the services" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "  Type YES to continue, anything else to cancel"
if ($confirm -ne "YES") {
    Write-Host "  Cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 0
}

# Get postgres password
Write-Host ""
$pgPassSecure = Read-Host "  Enter the 'postgres' superuser password" -AsSecureString
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassSecure)
$pgPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$pgBin = Get-PgBin
if ($pgBin) { $env:Path = $env:Path + ";" + $pgBin }
$env:PGPASSWORD = $pgPassword

# Verify connection
Write-Info "Verifying database connection..."
$test = & psql -U postgres -tAc "SELECT 1" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Cannot connect to PostgreSQL. Check your password." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}
Write-OK "Connection verified"

# ===========================================================
# 1. STOP SERVICES
# ===========================================================
Write-Step "Step 1: Stopping application services"

foreach ($svc in $Config.Services) {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s -and $s.Status -eq "Running") {
        Stop-Service -Name $svc -Force
        Write-OK "Stopped: $svc"
    } else {
        Write-Warn "Service not running or not found: $svc"
    }
}

# ===========================================================
# 2. BACKUP DATABASE
# ===========================================================
Write-Step "Step 2: Backing up database"

$timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $Config.BackupDir ("grandpalace_backup_" + $timestamp + ".sql")

Write-Info "Dumping '$($Config.DbName)' to $backupFile ..."
& pg_dump -U postgres -d $Config.DbName -f $backupFile 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Backup failed. Upgrade cancelled. Services will be restarted." -ForegroundColor Red
    foreach ($svc in $Config.Services) { Start-Service -Name $svc -ErrorAction SilentlyContinue }
    Read-Host "Press Enter to close"
    exit 1
}
Write-OK "Backup saved: $backupFile"

# ===========================================================
# 3. INSTALL NEW POSTGRESQL VERSION
# ===========================================================
Write-Step "Step 3: Installing PostgreSQL $($Config.NewPgVersion)"

$pgInstaller = Join-Path $TempDir "pg-new-installer.exe"
$pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-" + $Config.NewPgVersion + ".4-1-windows-x64.exe"
Invoke-Download $pgUrl $pgInstaller

Write-Info "Running installer (this takes a few minutes)..."
$pgArgs = "--mode unattended --unattendedmodeui none --superpassword " + $pgPassword + " --serverport 5432"
Start-Process $pgInstaller -ArgumentList $pgArgs -Wait -NoNewWindow

# Refresh PATH to pick up new postgres bin
$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path    = $machinePath + ";" + $userPath

$newPgBin = Get-PgBin
if ($newPgBin) { $env:Path = $env:Path + ";" + $newPgBin }

Write-OK "PostgreSQL $($Config.NewPgVersion) installed"

# ===========================================================
# 4. RESTORE DATABASE
# ===========================================================
Write-Step "Step 4: Restoring database"

$env:PGPASSWORD = $pgPassword

# Re-create the database if it doesn't exist
$checkDb = & psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($Config.DbName)'" 2>&1
if ($checkDb -notmatch "1") {
    Write-Info "Re-creating database '$($Config.DbName)'..."
    & psql -U postgres -c "CREATE ROLE grandpalace WITH LOGIN PASSWORD '$pgPassword';" 2>&1 | Out-Null
    & psql -U postgres -c "CREATE DATABASE grandpalace OWNER grandpalace;" 2>&1 | Out-Null
}

Write-Info "Restoring from backup..."
& psql -U postgres -d $Config.DbName -f $backupFile 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN] Restore had warnings. Check the backup file manually:" -ForegroundColor Yellow
    Write-Host "         $backupFile" -ForegroundColor Yellow
} else {
    Write-OK "Database restored successfully"
}

# Update DATABASE_URL in .env if needed (version change doesn't affect the URL)
Write-OK "Connection string unchanged - no .env update needed"

# ===========================================================
# 5. RESTART SERVICES
# ===========================================================
Write-Step "Step 5: Restarting application services"

foreach ($svc in $Config.Services) {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s) {
        Start-Service -Name $svc -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        $status = (Get-Service -Name $svc).Status
        Write-OK "$svc - $status"
    } else {
        Write-Warn "Service not found: $svc (may need to re-run the installer)"
    }
}

# ===========================================================
# DONE
# ===========================================================
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  PostgreSQL Upgrade Complete!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
$newVer = Get-PgVersion
Write-Host "  PostgreSQL version now : $newVer" -ForegroundColor White
Write-Host "  Backup kept at         : $backupFile" -ForegroundColor White
Write-Host ""
Write-Host "  You can delete the backup file once you have verified the app works." -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to close"
