#Requires -RunAsAdministrator
# Grand Palace Hotels & Resorts - All-in-One Management Script
# Run as Administrator:
#   powershell -ExecutionPolicy Bypass -File final.ps1

# ============================================================
# SETTINGS  (edit before running)
# ============================================================
$PG_SUPER_PASS  = "ZeroCode123@#!~"     # postgres superuser password
$PG_DB_NAME     = "grandpalace"
$PG_DB_USER     = "grandpalace"
$PG_DB_PASS     = "ZeroCode123@#!~"     # app database user password
$PG_VERSION     = "16"
$NODE_VERSION   = "22.14.0"
$INSTALL_DIR    = "C:\GrandPalace"
$API_PORT       = 8080
$FRONTEND_PORT  = 3000
$CLERK_PUB_KEY  = "pk_test_cGlja2VkLWNyYWItNTguY2xlcmsuYWNjb3VudHMuZGV2JA"
$CLERK_SEC_KEY  = "sk_test_cPh6CPPBJ9oRO9qmRahsEHOLH9IOYUUwdUyJw11se6"
# ============================================================

$SVC_API = "GrandPalaceAPI"
$SVC_FE  = "GrandPalaceFrontend"
$TEMP    = Join-Path $env:TEMP "GrandPalaceSetup"
New-Item -ItemType Directory -Force -Path $TEMP | Out-Null

# ─── tiny helpers ────────────────────────────────────────────
function p($m){ Write-Host "  $m" }
function ok($m){ Write-Host "  [OK] $m" -ForegroundColor Green }
function info($m){ Write-Host "  --> $m" -ForegroundColor Yellow }
function err($m){ Write-Host "  [ERROR] $m" -ForegroundColor Red }
function header($m){
    Write-Host ""
    Write-Host ">>> $m" -ForegroundColor Cyan
}
function pause-exit {
    Write-Host ""
    Read-Host "Press Enter to close"
    exit
}

# Find real psql.exe — look for the file directly, skip pgAdmin internals
function Find-Psql {
    # 1. Already in PATH?
    $inPath = Get-Command psql -ErrorAction SilentlyContinue
    if ($inPath -and $inPath.Source -notlike "*pgAdmin*" -and $inPath.Source -notlike "*node_modules*") {
        return $inPath.Source
    }
    # 2. Search Program Files for psql.exe NOT inside pgAdmin or node_modules
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "psql.exe" -Recurse -ErrorAction SilentlyContinue |
             Where-Object { $_.FullName -notlike "*pgAdmin*" -and $_.FullName -notlike "*node_modules*" } |
             Sort-Object FullName -Descending |
             Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

function Find-PgBin {
    $psql = Find-Psql
    if ($psql) { return Split-Path $psql }
    return $null
}

function Find-PgHba {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "pg_hba.conf" -Recurse -ErrorAction SilentlyContinue |
             Where-Object { $_.FullName -notlike "*pgAdmin*" } |
             Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

# Reliably stop then start the PostgreSQL service with fallbacks
function Restart-Pg([string]$svcName) {
    info "Stopping PostgreSQL service..."
    $ErrorActionPreference = "Continue"

    # Try Stop-Service first
    Stop-Service -Name $svcName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    # Make sure it's really stopped — force kill if needed
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne "Stopped") {
        net stop $svcName /y 2>&1 | Out-Null
        Start-Sleep -Seconds 3
    }

    info "Starting PostgreSQL service..."
    Start-Service -Name $svcName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 4

    # If Start-Service failed, try net start
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne "Running") {
        net start $svcName 2>&1 | Out-Null
        Start-Sleep -Seconds 5
    }

    # Last check
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    $ErrorActionPreference = "Stop"

    if ($svc -and $svc.Status -eq "Running") {
        ok "PostgreSQL service is running"
        return $true
    }

    # Try pg_ctl as last resort
    $pgBin = Find-PgBin
    $pgData = $null
    $dataSearch = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "PG_VERSION" -Recurse -ErrorAction SilentlyContinue |
                  Where-Object { $_.FullName -notlike "*pgAdmin*" } | Select-Object -First 1
    if ($dataSearch) { $pgData = Split-Path $dataSearch.FullName }

    if ($pgBin -and $pgData) {
        $ErrorActionPreference = "Continue"
        & "$pgBin\pg_ctl.exe" start -D $pgData 2>&1 | Out-Null
        Start-Sleep -Seconds 6
        $ErrorActionPreference = "Stop"
        $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
        if ($svc -and $svc.Status -eq "Running") {
            ok "PostgreSQL service is running (started via pg_ctl)"
            return $true
        }
    }

    err "Could not start PostgreSQL service. Try restarting it manually in Services (services.msc)."
    return $false
}

# Run psql as postgres with PGPASSWORD set, capture output, return exit code via $?
function Invoke-Psql([string]$sql, [string]$pass, [string]$db = "postgres") {
    $env:PGPASSWORD = $pass
    $psqlExe = Find-Psql
    if (-not $psqlExe) { err "psql.exe not found"; return $false }
    $ErrorActionPreference = "Continue"
    $out = & $psqlExe -U postgres -h 127.0.0.1 -d $db -tAc $sql 2>&1
    $ok  = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = "Stop"
    $env:PGPASSWORD = ""
    return $ok
}

function Test-PgConnection([string]$pass) {
    return (Invoke-Psql "SELECT 1" $pass)
}

# ─── MENU ────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Cyan
Write-Host "    Grand Palace Hotels & Resorts — Server Manager" -ForegroundColor Cyan
Write-Host "  =====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "    1.  Fresh Install (Node.js + PostgreSQL + App + Services)"
Write-Host "    2.  Uninstall / Remove Everything"
Write-Host "    3.  Reset PostgreSQL Passwords"
Write-Host "    4.  Reinstall App Only (skip Node.js & PostgreSQL)"
Write-Host ""
$choice = Read-Host "  Choose an option (1-4)"

# ============================================================
#  OPTION 3 — RESET POSTGRESQL PASSWORDS
# ============================================================
if ($choice -eq "3") {
    header "Resetting PostgreSQL passwords"
    p ""
    p "About PostgreSQL accounts:"
    p "  'postgres'    = built-in superuser (only exists inside PostgreSQL)"
    p "  'grandpalace' = app database user  (created by this installer)"
    p "  Neither account is related to your Windows password."
    p ""
    p "Both will be reset to: $PG_SUPER_PASS"
    p ""
    $c = Read-Host "  Type YES to continue"
    if ($c -ne "YES") { p "Cancelled."; pause-exit }

    $pgBin = Find-PgBin
    if (-not $pgBin) { err "PostgreSQL not installed or psql.exe not found."; pause-exit }
    ok "Found PostgreSQL at: $pgBin"

    $hbaFile = Find-PgHba
    if (-not $hbaFile) { err "Cannot find pg_hba.conf."; pause-exit }
    ok "Found pg_hba.conf at: $hbaFile"

    $hbaBak = $hbaFile + ".bak"
    Copy-Item $hbaFile $hbaBak -Force

    $trustLine = "host    all             all             127.0.0.1/32            trust"
    $hbaOrig   = Get-Content $hbaFile -Raw
    Set-Content $hbaFile ($trustLine + "`n" + $hbaOrig) -Encoding UTF8

    $pgSvc = (Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1).Name
    info "Restarting PostgreSQL to apply trust mode..."
    Restart-Pg $pgSvc

    $psqlExe = Find-Psql
    $env:PGPASSWORD = ""
    $ErrorActionPreference = "Continue"
    & $psqlExe -U postgres -h 127.0.0.1 -c "ALTER USER postgres WITH PASSWORD '$PG_SUPER_PASS';" 2>&1 | Out-Null
    & $psqlExe -U postgres -h 127.0.0.1 -c "ALTER USER $PG_DB_USER WITH PASSWORD '$PG_DB_PASS';" 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"

    Copy-Item $hbaBak $hbaFile -Force
    Remove-Item $hbaBak -Force
    info "Restoring normal authentication and restarting..."
    Restart-Pg $pgSvc

    if (Test-PgConnection $PG_SUPER_PASS) {
        ok "Password reset successful! New password: $PG_SUPER_PASS"
    } else {
        err "Reset failed — try option 2 (full uninstall) then option 1."
    }
    pause-exit
}

# ============================================================
#  OPTION 2 — UNINSTALL
# ============================================================
if ($choice -eq "2") {
    header "Uninstall"
    p "This will remove services, firewall rules, and app files."
    p ""
    $dropDb   = (Read-Host "  Also DROP the grandpalace database? (yes/no)") -eq "yes"
    $rmNode   = (Read-Host "  Uninstall Node.js? (yes/no)") -eq "yes"
    $rmPg     = (Read-Host "  Uninstall PostgreSQL? (yes/no)") -eq "yes"
    $c = Read-Host "  Type YES to confirm and start"
    if ($c -ne "YES") { p "Cancelled."; pause-exit }

    # Stop + remove services
    $nssmExe = Get-ChildItem $TEMP -Filter "nssm.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    foreach ($svc in @($SVC_API, $SVC_FE)) {
        if (Get-Service $svc -ErrorAction SilentlyContinue) {
            Stop-Service $svc -Force -ErrorAction SilentlyContinue
            if ($nssmExe) {
                & $nssmExe.FullName remove $svc confirm 2>&1 | Out-Null
            } else {
                sc.exe delete $svc | Out-Null
            }
            ok "Removed service: $svc"
        }
    }

    # Firewall
    netsh advfirewall firewall delete rule name="Grand Palace API"      2>&1 | Out-Null
    netsh advfirewall firewall delete rule name="Grand Palace Frontend" 2>&1 | Out-Null
    ok "Firewall rules removed"

    # Drop database
    if ($dropDb) {
        $pgBin = Find-PgBin
        if ($pgBin) {
            p "Enter postgres password to drop database:"
            $sec  = Read-Host "  postgres password" -AsSecureString
            $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
            $pw   = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
            $env:PGPASSWORD = $pw
            $psqlExe = Find-Psql
            $ErrorActionPreference = "Continue"
            & $psqlExe -U postgres -h 127.0.0.1 -c "DROP DATABASE IF EXISTS $PG_DB_NAME;" 2>&1 | Out-Null
            & $psqlExe -U postgres -h 127.0.0.1 -c "DROP ROLE IF EXISTS $PG_DB_USER;" 2>&1 | Out-Null
            $ErrorActionPreference = "Stop"
            $env:PGPASSWORD = ""
            ok "Database dropped"
        }
    }

    # Remove app files
    if (Test-Path $INSTALL_DIR) {
        Remove-Item $INSTALL_DIR -Recurse -Force -ErrorAction SilentlyContinue
        ok "Removed: $INSTALL_DIR"
    }

    # Uninstall Node.js
    if ($rmNode) {
        $pkg = Get-WmiObject Win32_Product -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "Node.js*" } | Select-Object -First 1
        if ($pkg) { $pkg.Uninstall() | Out-Null; ok "Node.js uninstalled" }
        else { p "Node.js not found in installed programs" }
    }

    # Uninstall PostgreSQL
    if ($rmPg) {
        $pkg = Get-WmiObject Win32_Product -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "PostgreSQL*" } | Select-Object -First 1
        if ($pkg) {
            $pkg.Uninstall() | Out-Null
            Remove-Item "C:\Program Files\PostgreSQL" -Recurse -Force -ErrorAction SilentlyContinue
            ok "PostgreSQL uninstalled"
        } else { p "PostgreSQL not found in installed programs" }
    }

    ok "Uninstall complete. Run this script again and choose option 1 for a fresh install."
    pause-exit
}

# ============================================================
#  SHARED — INSTALL STEPS (used by option 1 and 4)
# ============================================================

function Install-NodeJs {
    header "Step: Node.js $NODE_VERSION"
    $existing = Get-Command node -ErrorAction SilentlyContinue
    if ($existing) { ok "Already installed: $(node --version)"; return }
    $msi = Join-Path $TEMP "node.msi"
    info "Downloading Node.js..."
    (New-Object System.Net.WebClient).DownloadFile("https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-x64.msi", $msi)
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart ADDLOCAL=ALL" -Wait -NoNewWindow
    $machine = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $user    = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$machine;$user"
    ok "Node.js installed"
}

function Install-Pnpm {
    header "Step: pnpm"
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { ok "Already installed: $(pnpm --version)"; return }
    npm install -g pnpm | Out-Null
    $machine = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $user    = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$machine;$user"
    ok "pnpm installed"
}

function Install-PostgreSQL {
    header "Step: PostgreSQL $PG_VERSION"
    $pgSvc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgSvc) {
        ok "PostgreSQL already installed: $($pgSvc.Name)"
        # Add real bin to PATH
        $pgBin = Find-PgBin
        if ($pgBin) { $env:Path = $env:Path + ";$pgBin" }
        return
    }
    $exe = Join-Path $TEMP "pg.exe"
    info "Downloading PostgreSQL $PG_VERSION..."
    (New-Object System.Net.WebClient).DownloadFile("https://get.enterprisedb.com/postgresql/postgresql-$PG_VERSION.4-1-windows-x64.exe", $exe)
    info "Installing PostgreSQL (this takes a few minutes)..."
    # Use --superpassword via a temp pwdfile to avoid shell quoting issues with special chars
    $pwdFile = Join-Path $TEMP "pgpwd.txt"
    Set-Content $pwdFile $PG_SUPER_PASS -Encoding ASCII -NoNewline
    Start-Process $exe -ArgumentList @(
        "--mode","unattended","--unattendedmodeui","none",
        "--superpassword",$PG_SUPER_PASS,
        "--serverport","5432"
    ) -Wait -NoNewWindow
    Remove-Item $pwdFile -Force -ErrorAction SilentlyContinue
    $machine = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $user    = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$machine;$user"
    $pgBin = Find-PgBin
    if ($pgBin) { $env:Path = $env:Path + ";$pgBin" }
    ok "PostgreSQL installed"
}

function Setup-Database {
    header "Step: Database setup"

    # Check connection — auto-recover if password is wrong
    info "Testing connection to PostgreSQL..."
    if (-not (Test-PgConnection $PG_SUPER_PASS)) {
        p ""
        p "Cannot connect. The postgres user has a different password."
        p "Attempting automatic password reset (no action needed from you)..."
        p ""

        $pgBin   = Find-PgBin
        $hbaFile = Find-PgHba

        if (-not $pgBin -or -not $hbaFile) {
            err "Cannot find PostgreSQL files. Run option 2 (uninstall) then try again."
            pause-exit
        }

        $hbaBak  = $hbaFile + ".bak"
        Copy-Item $hbaFile $hbaBak -Force
        $trustLine = "host    all             all             127.0.0.1/32            trust"
        Set-Content $hbaFile ($trustLine + "`n" + (Get-Content $hbaFile -Raw)) -Encoding UTF8

        $pgSvc = (Get-Service -Name "postgresql*" | Select-Object -First 1).Name
        Restart-Pg $pgSvc

        $psqlExe = Find-Psql
        $env:PGPASSWORD = ""
        $ErrorActionPreference = "Continue"
        & $psqlExe -U postgres -h 127.0.0.1 -c "ALTER USER postgres WITH PASSWORD '$PG_SUPER_PASS';" 2>&1 | Out-Null
        $ErrorActionPreference = "Stop"

        Copy-Item $hbaBak $hbaFile -Force
        Remove-Item $hbaBak -Force
        Restart-Pg $pgSvc

        if (-not (Test-PgConnection $PG_SUPER_PASS)) {
            err "Auto-reset failed. Run option 3 (Reset PostgreSQL Passwords) first, then retry."
            pause-exit
        }
        ok "Password reset and connection verified"
    } else {
        ok "Connection successful"
    }

    $env:PGPASSWORD = $PG_SUPER_PASS
    $psqlExe = Find-Psql
    $ErrorActionPreference = "Continue"

    # Create role if missing
    $roleExists = & $psqlExe -U postgres -h 127.0.0.1 -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PG_DB_USER'" 2>&1
    if ($roleExists -notmatch "1") {
        & $psqlExe -U postgres -h 127.0.0.1 -c "CREATE ROLE $PG_DB_USER WITH LOGIN PASSWORD '$PG_DB_PASS';" 2>&1 | Out-Null
        ok "Created role: $PG_DB_USER"
    } else { ok "Role '$PG_DB_USER' already exists" }

    # Create database if missing
    $dbExists = & $psqlExe -U postgres -h 127.0.0.1 -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DB_NAME'" 2>&1
    if ($dbExists -notmatch "1") {
        & $psqlExe -U postgres -h 127.0.0.1 -c "CREATE DATABASE $PG_DB_NAME OWNER $PG_DB_USER;" 2>&1 | Out-Null
        & $psqlExe -U postgres -h 127.0.0.1 -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB_NAME TO $PG_DB_USER;" 2>&1 | Out-Null
        ok "Created database: $PG_DB_NAME"
    } else { ok "Database '$PG_DB_NAME' already exists" }

    $ErrorActionPreference = "Stop"
    $env:PGPASSWORD = ""
}

function Write-EnvFile([string]$dbUrl) {
    header "Step: Writing .env file"
    $envPath = Join-Path $INSTALL_DIR ".env"
    @"
DATABASE_URL=$dbUrl
CLERK_PUBLISHABLE_KEY=$CLERK_PUB_KEY
CLERK_SECRET_KEY=$CLERK_SEC_KEY
VITE_CLERK_PUBLISHABLE_KEY=$CLERK_PUB_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUB_KEY
PORT=$API_PORT
FRONTEND_PORT=$FRONTEND_PORT
BASE_PATH=/
NODE_ENV=production
"@ | Set-Content $envPath -Encoding UTF8
    ok ".env written"
}

function Build-App {
    header "Step: Installing dependencies and building"
    Push-Location $INSTALL_DIR

    # Load env into current session
    Get-Content (Join-Path $INSTALL_DIR ".env") | Where-Object { $_ -match "^[^#].+=." } | ForEach-Object {
        $k,$v = $_ -split "=",2
        [System.Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim(), "Process")
    }

    # Remove Linux-only preinstall hook
    $pkgFile = Join-Path $INSTALL_DIR "package.json"
    $pkg = Get-Content $pkgFile -Raw | ConvertFrom-Json
    if ($pkg.scripts.PSObject.Properties.Name -contains "preinstall") {
        $pkg.scripts.PSObject.Properties.Remove("preinstall")
        $pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgFile -Encoding UTF8
        ok "Removed Linux-only preinstall script"
    }

    info "Running pnpm install..."
    $ErrorActionPreference = "Continue"
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = "Stop"; err "pnpm install failed"; pause-exit }

    info "Pushing database schema..."
    & pnpm --filter "@workspace/db" run push 2>&1 | Out-Null

    info "Building API server..."
    & pnpm --filter "@workspace/api-server" run build
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = "Stop"; err "API build failed"; pause-exit }

    info "Building frontend..."
    & pnpm --filter "@workspace/hotel-system" run build
    if ($LASTEXITCODE -ne 0) { $ErrorActionPreference = "Stop"; err "Frontend build failed"; pause-exit }

    $ErrorActionPreference = "Stop"
    Pop-Location
    ok "Build complete"
}

function Install-Services {
    header "Step: Installing Windows Services"

    # Download NSSM if needed
    $nssmExe = Join-Path $TEMP "nssm.exe"
    if (-not (Test-Path $nssmExe)) {
        info "Downloading NSSM service manager..."
        $nssmZip = Join-Path $TEMP "nssm.zip"
        (New-Object System.Net.WebClient).DownloadFile("https://nssm.cc/release/nssm-2.24.zip", $nssmZip)
        Expand-Archive $nssmZip $TEMP -Force
        $nssmFound = Get-ChildItem $TEMP -Recurse -Filter "nssm.exe" | Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
        if ($nssmFound) { Copy-Item $nssmFound.FullName $nssmExe }
    }

    New-Item -ItemType Directory -Force -Path (Join-Path $INSTALL_DIR "logs") | Out-Null
    $nodePath = (Get-Command node).Source

    function Register-Svc($name, $display, $exe, $args, $envPairs) {
        if (Get-Service $name -ErrorAction SilentlyContinue) {
            & $nssmExe stop   $name 2>&1 | Out-Null
            & $nssmExe remove $name confirm 2>&1 | Out-Null
            Start-Sleep -Seconds 2
        }
        & $nssmExe install $name $exe $args
        & $nssmExe set $name DisplayName  $display
        & $nssmExe set $name AppDirectory $INSTALL_DIR
        & $nssmExe set $name Start        SERVICE_AUTO_START
        & $nssmExe set $name AppStdout    (Join-Path $INSTALL_DIR "logs\$name-out.log")
        & $nssmExe set $name AppStderr    (Join-Path $INSTALL_DIR "logs\$name-err.log")
        & $nssmExe set $name AppRotateFiles 1
        & $nssmExe set $name AppRotateBytes 10485760
        foreach ($pair in $envPairs) {
            & $nssmExe set $name AppEnvironmentExtra $pair
        }
        ok "Registered service: $name"
    }

    # Build database URL with URL-encoded password
    $dbPassEncoded = [System.Uri]::EscapeDataString($PG_DB_PASS)
    $dbUrl = "postgresql://${PG_DB_USER}:${dbPassEncoded}@localhost:5432/${PG_DB_NAME}"

    $apiDist = Join-Path $INSTALL_DIR "artifacts\api-server\dist\index.mjs"
    Register-Svc $SVC_API "Grand Palace - API" $nodePath "--enable-source-maps `"$apiDist`"" @(
        "PORT=$API_PORT",
        "DATABASE_URL=$dbUrl",
        "CLERK_SECRET_KEY=$CLERK_SEC_KEY",
        "NODE_ENV=production"
    )

    $viteBin    = Join-Path $INSTALL_DIR "node_modules\.bin\vite.cmd"
    $viteConfig = Join-Path $INSTALL_DIR "artifacts\hotel-system\vite.config.ts"
    Register-Svc $SVC_FE "Grand Palace - Frontend" "cmd.exe" "/c `"$viteBin`" preview --config `"$viteConfig`" --host 0.0.0.0 --port $FRONTEND_PORT" @(
        "PORT=$FRONTEND_PORT",
        "BASE_PATH=/",
        "VITE_CLERK_PUBLISHABLE_KEY=$CLERK_PUB_KEY",
        "NODE_ENV=production"
    )

    # Firewall
    netsh advfirewall firewall delete rule name="Grand Palace API"      2>&1 | Out-Null
    netsh advfirewall firewall delete rule name="Grand Palace Frontend" 2>&1 | Out-Null
    netsh advfirewall firewall add rule name="Grand Palace API"      dir=in action=allow protocol=TCP localport=$API_PORT      | Out-Null
    netsh advfirewall firewall add rule name="Grand Palace Frontend" dir=in action=allow protocol=TCP localport=$FRONTEND_PORT | Out-Null
    ok "Firewall rules set"

    Start-Service -Name $SVC_API -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Start-Service -Name $SVC_FE  -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    ok "API service: $((Get-Service $SVC_API).Status)"
    ok "Frontend service: $((Get-Service $SVC_FE).Status)"
}

# ============================================================
#  OPTION 1 — FULL FRESH INSTALL
# ============================================================
if ($choice -eq "1") {
    header "Full Fresh Install"
    p ""
    p "This will install:"
    p "  - Node.js $NODE_VERSION"
    p "  - PostgreSQL $PG_VERSION"
    p "  - Grand Palace app to $INSTALL_DIR"
    p "  - Two Windows auto-start services"
    p ""
    $c = Read-Host "  Type YES to begin"
    if ($c -ne "YES") { p "Cancelled."; pause-exit }

    Install-NodeJs
    Install-Pnpm
    Install-PostgreSQL
    Setup-Database

    # Copy files
    header "Step: Copying application files"
    if (-not (Test-Path $INSTALL_DIR)) { New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null }
    $src = Split-Path -Parent $MyInvocation.MyCommand.Definition
    $excludes = @(".git","node_modules","dist",".replit-artifact","*.log")
    Get-ChildItem $src -Exclude $excludes | ForEach-Object {
        Copy-Item $_.FullName $INSTALL_DIR -Recurse -Force -ErrorAction SilentlyContinue
    }
    ok "Files copied"

    $dbPassEncoded = [System.Uri]::EscapeDataString($PG_DB_PASS)
    $dbUrl = "postgresql://${PG_DB_USER}:${dbPassEncoded}@localhost:5432/${PG_DB_NAME}"
    Write-EnvFile $dbUrl
    Build-App
    Install-Services
}

# ============================================================
#  OPTION 4 — REINSTALL APP ONLY
# ============================================================
if ($choice -eq "4") {
    header "Reinstall App Only"
    p "Skipping Node.js and PostgreSQL installation."
    p "Existing services will be stopped and rebuilt."
    p ""
    $c = Read-Host "  Type YES to begin"
    if ($c -ne "YES") { p "Cancelled."; pause-exit }

    # Stop services first
    foreach ($svc in @($SVC_API, $SVC_FE)) {
        Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue
    }

    Setup-Database

    $dbPassEncoded = [System.Uri]::EscapeDataString($PG_DB_PASS)
    $dbUrl = "postgresql://${PG_DB_USER}:${dbPassEncoded}@localhost:5432/${PG_DB_NAME}"
    Write-EnvFile $dbUrl
    Build-App
    Install-Services
}

# ============================================================
#  DONE
# ============================================================
Write-Host ""
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host "    Installation Complete!" -ForegroundColor Green
Write-Host "  =====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "    Frontend  ->  http://localhost:$FRONTEND_PORT/" -ForegroundColor White
Write-Host "    API       ->  http://localhost:$API_PORT/api/" -ForegroundColor White
Write-Host ""
Write-Host "    Services auto-start on every reboot." -ForegroundColor Gray
Write-Host "    Logs: $INSTALL_DIR\logs\" -ForegroundColor Gray
Write-Host ""
pause-exit
