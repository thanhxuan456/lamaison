#Requires -RunAsAdministrator
# Grand Palace Hotels & Resorts - Uninstaller / Cleanup Script
# Removes all services, files, and optionally the database and software.
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File remove.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

$InstallDir  = "C:\GrandPalace"
$ServiceAPI  = "GrandPalaceAPI"
$ServiceFE   = "GrandPalaceFrontend"
$NssmSearch  = Join-Path $env:TEMP "GrandPalaceSetup\nssm.exe"

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host ">>> $msg" -ForegroundColor Cyan
}

function Write-OK([string]$msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Skip([string]$msg) {
    Write-Host "  [--] $msg" -ForegroundColor Gray
}

function Write-Warn([string]$msg) {
    Write-Host "  [!!] $msg" -ForegroundColor Yellow
}

# ===========================================================
# CONFIRM
# ===========================================================
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Red
Write-Host "  Grand Palace Hotels & Resorts - UNINSTALLER" -ForegroundColor Red
Write-Host "=====================================================" -ForegroundColor Red
Write-Host ""
Write-Host "  This will remove:" -ForegroundColor White
Write-Host "    - Windows services (GrandPalaceAPI, GrandPalaceFrontend)" -ForegroundColor White
Write-Host "    - Firewall rules" -ForegroundColor White
Write-Host "    - Application files at $InstallDir" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "  Type YES to continue, anything else to cancel"
if ($confirm -ne "YES") {
    Write-Host "  Cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 0
}

# Ask about database separately
Write-Host ""
$dropDb = Read-Host "  Also DROP the grandpalace database and user? (yes/no)"
$dropDatabase = ($dropDb -eq "yes")

# Ask about software
Write-Host ""
$removeNode = Read-Host "  Uninstall Node.js? (yes/no)"
$removePostgres = Read-Host "  Uninstall PostgreSQL? (yes/no)"
$doRemoveNode     = ($removeNode -eq "yes")
$doRemovePostgres = ($removePostgres -eq "yes")

# ===========================================================
# 1. STOP AND REMOVE SERVICES
# ===========================================================
Write-Step "Step 1: Stopping and removing Windows services"

$nssmPath = $NssmSearch
if (-not (Test-Path $nssmPath)) {
    # Try to find nssm in common locations
    $nssmAlt = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssmAlt) { $nssmPath = $nssmAlt.Source }
}

foreach ($svc in @($ServiceAPI, $ServiceFE)) {
    $existing = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  --> Stopping $svc..." -ForegroundColor Yellow
        Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        if (Test-Path $nssmPath) {
            & $nssmPath remove $svc confirm 2>&1 | Out-Null
            Write-OK "Service removed: $svc"
        } else {
            & sc.exe delete $svc | Out-Null
            Write-OK "Service deleted: $svc (via sc.exe)"
        }
    } else {
        Write-Skip "Service not found: $svc"
    }
}

# ===========================================================
# 2. FIREWALL RULES
# ===========================================================
Write-Step "Step 2: Removing firewall rules"

netsh advfirewall firewall delete rule name="Grand Palace API"      | Out-Null
netsh advfirewall firewall delete rule name="Grand Palace Frontend" | Out-Null
Write-OK "Firewall rules removed"

# ===========================================================
# 3. DROP DATABASE (optional)
# ===========================================================
if ($dropDatabase) {
    Write-Step "Step 3: Dropping database"

    $pgBinSearch = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory -ErrorAction SilentlyContinue
    if ($pgBinSearch) {
        $pgBin = ($pgBinSearch | Select-Object -First 1).FullName
        $env:Path = $env:Path + ";" + $pgBin
    }

    if (Test-CommandExists "psql") {
        Write-Host ""
        Write-Host "  Enter the 'postgres' superuser password to drop the database:" -ForegroundColor Yellow
        $pgPassSecure = Read-Host "  postgres password" -AsSecureString
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassSecure)
        $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

        & psql -U postgres -c "DROP DATABASE IF EXISTS grandpalace;" 2>&1 | Out-Null
        & psql -U postgres -c "DROP ROLE IF EXISTS grandpalace;" 2>&1 | Out-Null
        $env:PGPASSWORD = ""
        Write-OK "Database 'grandpalace' and user 'grandpalace' dropped"
    } else {
        Write-Warn "psql not found in PATH - skipping database drop. Remove manually via pgAdmin."
    }
} else {
    Write-Step "Step 3: Database"
    Write-Skip "Keeping database (skipped by user)"
}

function Test-CommandExists([string]$cmd) {
    return ($null -ne (Get-Command $cmd -ErrorAction SilentlyContinue))
}

# ===========================================================
# 4. REMOVE APPLICATION FILES
# ===========================================================
Write-Step "Step 4: Removing application files"

if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $InstallDir) {
        Write-Warn "Some files could not be deleted (may be locked). Try again after reboot."
    } else {
        Write-OK "Removed: $InstallDir"
    }
} else {
    Write-Skip "Install directory not found: $InstallDir"
}

# ===========================================================
# 5. UNINSTALL NODE.JS (optional)
# ===========================================================
if ($doRemoveNode) {
    Write-Step "Step 5: Uninstalling Node.js"
    $nodeProduct = Get-WmiObject -Class Win32_Product -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "Node.js*" } | Select-Object -First 1
    if ($nodeProduct) {
        Write-Host "  --> Uninstalling $($nodeProduct.Name)..." -ForegroundColor Yellow
        $nodeProduct.Uninstall() | Out-Null
        Write-OK "Node.js uninstalled"
    } else {
        Write-Warn "Node.js not found via Windows installer. Remove manually if needed."
    }
} else {
    Write-Step "Step 5: Node.js"
    Write-Skip "Keeping Node.js (skipped by user)"
}

# ===========================================================
# 6. UNINSTALL POSTGRESQL (optional)
# ===========================================================
if ($doRemovePostgres) {
    Write-Step "Step 6: Uninstalling PostgreSQL"
    $pgProduct = Get-WmiObject -Class Win32_Product -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "PostgreSQL*" } | Select-Object -First 1
    if ($pgProduct) {
        Write-Host "  --> Uninstalling $($pgProduct.Name)..." -ForegroundColor Yellow
        $pgProduct.Uninstall() | Out-Null
        Write-OK "PostgreSQL uninstalled"

        # Remove leftover data directory
        $pgDataDirs = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue
        if ($pgDataDirs) {
            Remove-Item "C:\Program Files\PostgreSQL" -Recurse -Force -ErrorAction SilentlyContinue
            Write-OK "PostgreSQL data directory removed"
        }
    } else {
        Write-Warn "PostgreSQL not found via Windows installer. Remove manually if needed."
    }
} else {
    Write-Step "Step 6: PostgreSQL"
    Write-Skip "Keeping PostgreSQL (skipped by user)"
}

# ===========================================================
# DONE
# ===========================================================
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Uninstall Complete!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  You can now run windows-server-install.ps1 again for a fresh install."
Write-Host ""
Read-Host "Press Enter to close"
