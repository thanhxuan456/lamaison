#Requires -RunAsAdministrator
# MAISON DELUXE Hotels & Resorts -- All-in-one Windows Server Installer
# Compatible with Windows Server 2019 / 2022 / 2025
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File final.ps1
#
# OPTIONAL FLAGS:
#   -Reinstall    Force a clean reinstall even if already installed
#   -SkipBuild    Skip the npm build step (config-only updates)
#   -SkipSsl      Install nginx but skip Let's Encrypt SSL (HTTP only via nginx)
#   -SkipNginx    Use a Node.js proxy instead of nginx (no domain needed, good for LAN)
#   -Uninstall    Stop and remove all services, optionally delete install directory
#
# DEFAULT ARCHITECTURE (nginx mode):
#   Internet --> nginx :80/:443 --> /api/*  --> Node.js API :8080 (internal)
#                              --> /*       --> Static files served by nginx
#   - SSL auto-issued by Let's Encrypt (win-acme), auto-renewed via Scheduled Task
#   - WebSocket live chat (/api/chat/ws/*) transparently proxied
#   - No CORS -- browser always talks to the same origin
#
# FALLBACK ARCHITECTURE (-SkipNginx mode):
#   Browser --> Node.js proxy :3000 --> /api/* --> Node.js API :8080
#                                   --> /*      --> Static files
#   - No SSL, no domain required -- suitable for LAN / internal testing

param(
    [switch]$Reinstall,
    [switch]$SkipBuild,
    [switch]$SkipSsl,
    [switch]$SkipNginx,
    [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ===========================================================
# CONFIGURATION -- Edit these values before running
# ===========================================================
$Config = @{
    InstallDir      = "C:\GrandPalace"
    ApiPort         = 8080          # API always runs on this port (never exposed directly in nginx mode)

    # -- DOMAIN & SSL (nginx mode -- ignored when -SkipNginx is set) -------
    # DNS A-record for Domain must already point to this server's public IP
    # before running, otherwise Let's Encrypt validation will fail.
    Domain          = "maisondeluxehotel.com"
    Email           = "tthanhxuan456@gmail.com"   # Let's Encrypt notifications

    # -- NODE PROXY PORTS (only used when -SkipNginx is set) ---------------
    FrontendPort    = 3000

    # -- DATABASE ----------------------------------------------------------
    UseLocalPg      = $false
    NeonDatabaseUrl = "postgresql://neondb_owner:npg_YCEZLyV6gwi7@ep-fragrant-sunset-a18l1eva-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

    PgSuperPassword = "ZeroCode123#!!"
    PgDbName        = "grandpalace"
    PgDbUser        = "grandpalace"
    PgDbPassword    = "ZeroCode123#!!"

    # -- CLERK AUTHENTICATION ----------------------------------------------
    ClerkPublishableKey = "pk_live_Y2xlcmsudm50aGVtZXMuc3RvcmUk"
    ClerkSecretKey      = "sk_live_EyvwhwIk0n04frReYRDEi5rGb55vqwbzEuKbh1dqdn"

    # -- MOMO PAYMENT ------------------------------------------------------
    MomoPartnerCode = "MOMO"
    MomoAccessKey   = "F8BBA842ECF85"
    MomoSecretKey   = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
    MomoEndpoint    = "https://test-payment.momo.vn/v2/gateway/api/create"

    # -- VERSIONS ----------------------------------------------------------
    NodeVersion     = "22.14.0"
    NodeMinMajor    = 20
    PgVersion       = "16"
    NginxVersion    = "1.26.3"     # nginx stable branch

    # -- SYSTEM REQUIREMENTS -----------------------------------------------
    MinRamGB        = 2
    MinDiskGB       = 10
}
# ===========================================================

$LogFile   = Join-Path $env:TEMP ("MaisonDeluxeInstall_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")
$TempDir   = Join-Path $env:TEMP "MaisonDeluxeSetup"
$LogDir    = Join-Path $Config.InstallDir "logs"
$NginxDir  = Join-Path $Config.InstallDir "nginx"
$SslDir    = Join-Path $Config.InstallDir "ssl"
$AcmeRoot  = Join-Path $Config.InstallDir "acme-challenge"
$WacsDir   = Join-Path $TempDir "wacs"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Start-Transcript -Path $LogFile -Append -ErrorAction SilentlyContinue | Out-Null
Write-Host "  Install log: $LogFile" -ForegroundColor DarkGray
Write-Host "  Mode: $(if ($SkipNginx) { 'Node.js proxy (no nginx)' } else { 'nginx reverse proxy' })" -ForegroundColor DarkGray

# ---- Helpers -------------------------------------------------------
function Write-Step([string]$n, [string]$msg) {
    Write-Host ""; Write-Host "[$n] $msg" -ForegroundColor Cyan
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
        $wc = New-Object System.Net.WebClient; $wc.DownloadFile($url, $dest)
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
        $idx = $line.IndexOf("="); if ($idx -lt 1) { return }
        $k = $line.Substring(0, $idx).Trim()
        $v = $line.Substring($idx + 1)
        [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
    }
}

# nginx path helper -- nginx.conf requires forward slashes on Windows too
function To-NginxPath([string]$p) { return $p.Replace("\", "/") }

# ===========================================================
# UNINSTALL MODE
# ===========================================================
if ($Uninstall) {
    Write-Host ""; Write-Host "=== UNINSTALL MODE ===" -ForegroundColor Red
    $nssmU = Join-Path $TempDir "nssm.exe"
    foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend", "GrandPalaceNginx")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s) {
            Write-Info "Stopping and removing: $svc"
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            Start-Sleep -Seconds 2
            if (Test-Path $nssmU) { & $nssmU remove $svc confirm 2>&1 | Out-Null }
            else { sc.exe delete $svc | Out-Null }
            Write-OK "Removed: $svc"
        } else { Write-Info "Not found: $svc" }
    }
    foreach ($rule in @("MAISON DELUXE HTTP", "MAISON DELUXE HTTPS", "MAISON DELUXE API", "MAISON DELUXE Frontend")) {
        netsh advfirewall firewall delete rule name=$rule 2>&1 | Out-Null
    }
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
Write-Step "1/13" "System requirements"

$os = Get-CimInstance Win32_OperatingSystem
Write-Info "OS: $($os.Caption) (Build $($os.BuildNumber))"
if ([int]$os.BuildNumber -lt 17763) { Fail "Windows Server 2019 or later required (build 17763+)." }
Write-OK "OS version OK"

$ramGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($ramGB -lt $Config.MinRamGB) { Fail "Not enough RAM. Required: $($Config.MinRamGB) GB, Found: $ramGB GB" }
Write-OK "RAM: $ramGB GB"

$driveLetter = (Split-Path $Config.InstallDir -Qualifier).TrimEnd(":")
$disk = Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
if ($disk) {
    $freeGB = [math]::Round($disk.Free / 1GB, 1)
    if ($freeGB -lt $Config.MinDiskGB) { Fail "Not enough disk space. Required: $($Config.MinDiskGB) GB, Free: $freeGB GB" }
    Write-OK "Disk free: $freeGB GB"
}

if (-not $SkipNginx) {
    if ([string]::IsNullOrWhiteSpace($Config.Domain) -or $Config.Domain -match "yourdomain|example\.com") {
        Fail "Domain is not configured. Edit the Config block, or run with -SkipNginx for a local install."
    }
    Write-OK "Domain: $($Config.Domain)"
}

# ===========================================================
# STEP 2 -- NODE.JS
# ===========================================================
Write-Step "2/13" "Node.js (minimum v$($Config.NodeMinMajor))"

$nodeOk = $false
if (Test-CommandExists "node") {
    $rawVer = (node --version 2>&1).ToString().TrimStart("v")
    $major  = [int]($rawVer.Split(".")[0])
    if ($major -ge $Config.NodeMinMajor -and -not $Reinstall) {
        Write-OK "Node.js already installed: v$rawVer"; $nodeOk = $true
    } else { Write-Warn "Node v$rawVer found but minimum v$($Config.NodeMinMajor) required -- upgrading" }
}
if (-not $nodeOk) {
    $nodeInstaller = Join-Path $TempDir "node-installer.msi"
    Invoke-Download "https://nodejs.org/dist/v$($Config.NodeVersion)/node-v$($Config.NodeVersion)-x64.msi" $nodeInstaller
    Write-Info "Installing Node.js $($Config.NodeVersion) silently..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn /norestart ADDLOCAL=ALL" -Wait -NoNewWindow
    Update-EnvPath
    if (-not (Test-CommandExists "node")) { Fail "Node.js not found in PATH after installation." }
    Write-OK "Node.js $($Config.NodeVersion) installed"
}

# ===========================================================
# STEP 3 -- PNPM
# ===========================================================
Write-Step "3/13" "pnpm package manager"

if (Test-CommandExists "pnpm" -and -not $Reinstall) {
    Write-OK "pnpm already installed: $(pnpm --version)"
} else {
    Write-Info "Installing pnpm via npm..."
    & npm install -g pnpm
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed." }
    Update-EnvPath
    Write-OK "pnpm installed: $(pnpm --version)"
}

# ===========================================================
# STEP 4 -- DATABASE
# ===========================================================
Write-Step "4/13" "Database setup"

$DatabaseUrl = ""; $NeonDatabaseUrl = ""

if ($Config.UseLocalPg) {
    Write-Info "Setting up local PostgreSQL $($Config.PgVersion)"
    $pgBin = $null
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue

    if ($pgService -and -not $Reinstall) {
        Write-OK "PostgreSQL already running: $($pgService.Name)"
        $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { $pgBin = $found.FullName }
    } else {
        $pgInstaller = Join-Path $TempDir "pg-installer.exe"
        $pgDownloaded = $false
        foreach ($minor in @("4","3","2","1","0")) {
            $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-$($Config.PgVersion).$minor-1-windows-x64.exe"
            try { Invoke-Download $pgUrl $pgInstaller; $pgDownloaded = $true; break } catch { continue }
        }
        if (-not $pgDownloaded) { Fail "Could not download PostgreSQL installer." }
        Write-Info "Installing PostgreSQL silently (a few minutes)..."
        Start-Process $pgInstaller -ArgumentList "--mode unattended --unattendedmodeui none --superpassword `"$($Config.PgSuperPassword)`" --serverport 5432" -Wait -NoNewWindow
        Update-EnvPath
        $pgBin = "C:\Program Files\PostgreSQL\$($Config.PgVersion)\bin"
        if (-not (Test-Path $pgBin)) { Fail "PostgreSQL bin not found at: $pgBin" }
        Write-OK "PostgreSQL installed"
    }
    if ($pgBin -and (Test-Path $pgBin) -and ($env:Path -notlike "*$pgBin*")) { $env:Path = "$($env:Path);$pgBin" }
    $env:PGPASSWORD = $Config.PgSuperPassword
    $checkDb = & psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$($Config.PgDbName)'" 2>&1
    if ($LASTEXITCODE -eq 0 -and ($checkDb -match "1")) {
        Write-OK "Database '$($Config.PgDbName)' already exists"
    } else {
        & psql -U postgres -c "CREATE ROLE `"$($Config.PgDbUser)`" WITH LOGIN PASSWORD '$($Config.PgDbPassword)';" 2>&1 | Out-Null
        & psql -U postgres -c "CREATE DATABASE `"$($Config.PgDbName)`" OWNER `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
        & psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE `"$($Config.PgDbName)`" TO `"$($Config.PgDbUser)`";" 2>&1 | Out-Null
        Write-OK "Database created"
    }
    $DatabaseUrl = "postgresql://$($Config.PgDbUser):$($Config.PgDbPassword)@localhost:5432/$($Config.PgDbName)"
} else {
    if ([string]::IsNullOrWhiteSpace($Config.NeonDatabaseUrl) -or $Config.NeonDatabaseUrl -like "*ep-xxx*") {
        Fail "NeonDatabaseUrl is not configured. Edit the Config block."
    }
    $DatabaseUrl = $Config.NeonDatabaseUrl; $NeonDatabaseUrl = $Config.NeonDatabaseUrl
    Write-OK "Neon database URL configured"
}

# ===========================================================
# STEP 5 -- COPY SOURCE FILES
# ===========================================================
Write-Step "5/13" "Copying source files"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Info "Source : $scriptDir"
Write-Info "Target : $($Config.InstallDir)"

$schemaCheck = Join-Path $scriptDir "lib\db\src\schema\index.ts"
if (-not (Test-Path $schemaCheck)) {
    Fail "Source validation failed: lib\db\src\schema\index.ts not found in $scriptDir`nRun this script from inside the extracted project folder."
}
Write-OK "Source folder verified"

if ($scriptDir -ne $Config.InstallDir) {
    robocopy "$scriptDir" "$($Config.InstallDir)" /E `
        /XD ".git" "node_modules" "dist" ".replit-artifact" "attached_assets" ".local" "nginx" "ssl" "acme-challenge" `
        /XF ".env" "*.log" "*.map" `
        /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { Fail "File copy failed (robocopy exit code $LASTEXITCODE)." }
    Write-OK "Files copied"
} else {
    Write-OK "Script is running from install dir -- skipping copy"
}

# ===========================================================
# STEP 6 -- WRITE .ENV FILE
# ===========================================================
Write-Step "6/13" "Writing environment configuration"

$envFile = Join-Path $Config.InstallDir ".env"
$sessionSecret = ""; $contactEncKey = ""
if (Test-Path $envFile) {
    $prevLines = Get-Content $envFile -ErrorAction SilentlyContinue
    $sl = $prevLines | Where-Object { $_ -match "^SESSION_SECRET=" }         | Select-Object -First 1
    $el = $prevLines | Where-Object { $_ -match "^CONTACT_ENCRYPTION_KEY=" } | Select-Object -First 1
    if ($sl) { $sessionSecret = $sl.Split("=", 2)[1] }
    if ($el) { $contactEncKey = $el.Split("=", 2)[1] }
}
if ([string]::IsNullOrEmpty($sessionSecret)) { $sessionSecret = New-RandomSecret 48 }
if ([string]::IsNullOrEmpty($contactEncKey)) { $contactEncKey = New-RandomSecret 32 }

# Public URLs differ by mode:
#   nginx mode  : https://domain  (or http://domain if -SkipSsl)
#   node proxy  : http://IP:port  (discovered at the end; use placeholder for now)
if (-not $SkipNginx) {
    $publicBase = if ($SkipSsl) { "http://$($Config.Domain)" } else { "https://$($Config.Domain)" }
} else {
    $serverIpEarly = try {
        (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
         Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
         Select-Object -First 1 -ExpandProperty IPAddress)
    } catch { "YOUR_SERVER_IP" }
    if (-not $serverIpEarly) { $serverIpEarly = "YOUR_SERVER_IP" }
    $publicBase = "http://$($serverIpEarly):$($Config.ApiPort)"
}

# Clerk proxy only works with live keys (pk_live_) on a proper HTTPS domain.
$clerkProxyUrl = "$publicBase/api/__clerk"
if ($Config.ClerkPublishableKey.StartsWith("pk_test_")) {
    $clerkProxyUrl = ""
    Write-Warn "Clerk test key detected -- VITE_CLERK_PROXY_URL disabled (requires pk_live_)"
}
if ($SkipNginx -and $SkipSsl) {
    # No HTTPS available in node proxy mode, so proxy won't work
    $clerkProxyUrl = ""
    Write-Warn "Node proxy mode (HTTP only) -- VITE_CLERK_PROXY_URL disabled"
}

# VITE_API_URL is always empty: browser uses relative /api/ paths in both modes.
$envLines = @(
    "NODE_ENV=production",
    "DATABASE_URL=$DatabaseUrl",
    "NEON_DATABASE_URL=$NeonDatabaseUrl",
    "CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "CLERK_SECRET_KEY=$($Config.ClerkSecretKey)",
    "VITE_CLERK_PUBLISHABLE_KEY=$($Config.ClerkPublishableKey)",
    "VITE_CLERK_PROXY_URL=$clerkProxyUrl",
    "VITE_API_URL=",
    "SESSION_SECRET=$sessionSecret",
    "CONTACT_ENCRYPTION_KEY=$contactEncKey",
    "PORT=$($Config.ApiPort)",
    "BASE_PATH=/",
    "MOMO_PARTNER_CODE=$($Config.MomoPartnerCode)",
    "MOMO_ACCESS_KEY=$($Config.MomoAccessKey)",
    "MOMO_SECRET_KEY=$($Config.MomoSecretKey)",
    "MOMO_ENDPOINT=$($Config.MomoEndpoint)",
    "API_PUBLIC_URL=$publicBase",
    "FRONTEND_URL=$publicBase"
)
[System.IO.File]::WriteAllText($envFile, ($envLines -join "`n") + "`n", $utf8NoBom)
foreach ($line in $envLines) {
    if ($line -match "^([^#][^=]*)=(.*)") {
        [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2], "Process")
    }
}
[System.Environment]::SetEnvironmentVariable("DATABASE_URL",      $DatabaseUrl,     "Process")
[System.Environment]::SetEnvironmentVariable("NEON_DATABASE_URL", $NeonDatabaseUrl, "Process")
Write-OK ".env written to $envFile"

# ===========================================================
# STEP 7 -- PATCH package.json FOR WINDOWS
# ===========================================================
Write-Step "7/13" "Patching package.json for Windows"

$rootPkg = Join-Path $Config.InstallDir "package.json"
if (Test-Path $rootPkg) {
    $pkgJson = Get-Content $rootPkg -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pkgJson.scripts.PSObject.Properties.Name -contains "preinstall") {
        $pkgJson.scripts.PSObject.Properties.Remove("preinstall")
        [System.IO.File]::WriteAllText($rootPkg, ($pkgJson | ConvertTo-Json -Depth 20), $utf8NoBom)
        Write-OK "Removed Linux-only preinstall hook"
    } else { Write-OK "No preinstall hook -- nothing to remove" }
} else { Write-Warn "package.json not found -- skipping" }

# ===========================================================
# STEP 8 -- PATCH pnpm-workspace.yaml FOR WINDOWS
# ===========================================================
Write-Step "8/13" "Patching pnpm-workspace.yaml for Windows"

$wsYaml = Join-Path $Config.InstallDir "pnpm-workspace.yaml"
if (Test-Path $wsYaml) {
    $wsLines    = Get-Content $wsYaml -Encoding UTF8
    $wsFiltered = $wsLines | Where-Object { $_ -notmatch '": "-"' }
    [System.IO.File]::WriteAllText($wsYaml, ($wsFiltered -join "`n") + "`n", $utf8NoBom)
    Write-OK "Removed $($wsLines.Count - $wsFiltered.Count) platform-binary exclusion(s)"
} else { Write-Warn "pnpm-workspace.yaml not found -- skipping" }

# ===========================================================
# STEP 9 -- INSTALL DEPS, DB SCHEMA, SEED, BUILD
# ===========================================================
Write-Step "9/13" "Install dependencies, push DB schema, seed data, build"

Push-Location $Config.InstallDir
try {
    foreach ($svc in @("GrandPalaceAPI", "GrandPalaceFrontend", "GrandPalaceNginx")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s -and $s.Status -ne "Stopped") {
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            Start-Sleep -Seconds 2
        }
    }
    foreach ($pn in @("node", "esbuild", "nginx")) {
        Get-Process -Name $pn -ErrorAction SilentlyContinue | ForEach-Object {
            try { $_.Kill(); $_.WaitForExit(3000) } catch {}
        }
    }
    Start-Sleep -Seconds 2

    $nmDir = Join-Path $Config.InstallDir "node_modules"
    if (Test-Path $nmDir) {
        Write-Info "Removing root node_modules..."
        & cmd /c "rmdir /s /q `"$nmDir`"" 2>&1 | Out-Null
        if (Test-Path $nmDir) { Start-Sleep -Seconds 4; & cmd /c "rmdir /s /q `"$nmDir`"" 2>&1 | Out-Null }
        if (Test-Path $nmDir) { Fail "Could not remove node_modules. Reboot and run again." }
        Write-OK "Root node_modules removed"
    }
    foreach ($pkgBase in @("artifacts", "lib")) {
        $base = Join-Path $Config.InstallDir $pkgBase
        if (Test-Path $base) {
            Get-ChildItem $base -Recurse -Filter "node_modules" -Directory -ErrorAction SilentlyContinue |
                ForEach-Object { & cmd /c "rmdir /s /q `"$($_.FullName)`"" 2>&1 | Out-Null }
        }
    }
    $lockFile = Join-Path $Config.InstallDir "pnpm-lock.yaml"
    if (Test-Path $lockFile) { Remove-Item $lockFile -Force; Write-Info "Lockfile removed (fresh resolution)" }

    Write-Info "Running pnpm install (may take several minutes)..."
    & pnpm install --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed." }
    Write-OK "Dependencies installed"

    Load-DotEnv (Join-Path $Config.InstallDir ".env")
    [System.Environment]::SetEnvironmentVariable("DATABASE_URL",      $DatabaseUrl,     "Process")
    [System.Environment]::SetEnvironmentVariable("NEON_DATABASE_URL", $NeonDatabaseUrl, "Process")
    $previewUrl = if ($DatabaseUrl.Length -gt 60) { $DatabaseUrl.Substring(0,60) + "..." } else { $DatabaseUrl }
    Write-Info "DB URL (first 60 chars): $previewUrl"

    Write-Info "Pushing database schema..."
    & pnpm --filter "@workspace/db" run push
    if ($LASTEXITCODE -ne 0) { Fail "Database schema push failed. Check NeonDatabaseUrl and network connectivity." }
    Write-OK "Database schema applied"

    Write-Info "Seeding initial data (skipped if already seeded)..."
    & pnpm --filter "@workspace/scripts" run seed
    if ($LASTEXITCODE -ne 0) { Fail "Database seed failed." }
    Write-OK "Database seeded"

    if (-not $SkipBuild) {
        $apiDistDir = Join-Path $Config.InstallDir "artifacts\api-server\dist"
        if (Test-Path $apiDistDir) { Remove-Item $apiDistDir -Recurse -Force }
        Write-Info "Building API server..."
        & pnpm --filter "@workspace/api-server" run build
        if ($LASTEXITCODE -ne 0) { Fail "API server build failed." }
        Write-OK "API server built"

        $frontendDistDir = Join-Path $Config.InstallDir "artifacts\hotel-system\dist"
        if (Test-Path $frontendDistDir) { Remove-Item $frontendDistDir -Recurse -Force }
        Write-Info "Building frontend..."
        [System.Environment]::SetEnvironmentVariable("BASE_PATH",                  "/",                         "Process")
        [System.Environment]::SetEnvironmentVariable("NODE_ENV",                   "production",                "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_CLERK_PUBLISHABLE_KEY", $Config.ClerkPublishableKey, "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_CLERK_PROXY_URL",       $clerkProxyUrl,              "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_API_URL",               "",                          "Process")
        & pnpm --filter "@workspace/hotel-system" run build
        if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed." }
        Write-OK "Frontend built"
    } else {
        Write-Warn "-SkipBuild set -- skipping build"
    }
} finally { Pop-Location }

# ===========================================================
# STEP 10 -- NSSM (service manager)
# ===========================================================
Write-Step "10/13" "Downloading NSSM (service manager)"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$nssmPath = Join-Path $TempDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    $nssmZip = Join-Path $TempDir "nssm.zip"
    $nssmOk  = $false
    foreach ($url in @(
        "https://nssm.cc/release/nssm-2.24.zip",
        "https://github.com/nicholasgasior/nssm/releases/download/v2.24/nssm-2.24.zip"
    )) {
        try { Invoke-Download $url $nssmZip; $nssmOk = $true; break }
        catch { Write-Warn "NSSM mirror failed: $url -- trying next..." }
    }
    if (-not $nssmOk) { Fail "Could not download NSSM from any mirror." }
    Expand-Archive -Path $nssmZip -DestinationPath $TempDir -Force
    $nssmExe = Get-ChildItem $TempDir -Filter "nssm.exe" -Recurse |
               Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
    if (-not $nssmExe) { Fail "nssm.exe (win64) not found in zip." }
    Copy-Item $nssmExe.FullName $nssmPath -Force
    Write-OK "NSSM ready"
}

function Install-NssmService {
    param(
        [string]$SvcName, [string]$DisplayName,
        [string]$Application, [string]$AppParameters,
        [string]$WorkDir, [string[]]$EnvVars
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
    & $nssmPath set $SvcName DisplayName   $DisplayName
    & $nssmPath set $SvcName Description   "MAISON DELUXE Hotels and Resorts - $DisplayName"
    & $nssmPath set $SvcName AppDirectory  $WorkDir
    & $nssmPath set $SvcName Start         SERVICE_AUTO_START
    & $nssmPath set $SvcName AppStdout     (Join-Path $LogDir "$SvcName-out.log")
    & $nssmPath set $SvcName AppStderr     (Join-Path $LogDir "$SvcName-err.log")
    & $nssmPath set $SvcName AppRotateFiles  1
    & $nssmPath set $SvcName AppRotateBytes  10485760
    & $nssmPath set $SvcName AppRotateOnline 1
    & $nssmPath set $SvcName AppRestartDelay 3000
    & $nssmPath set $SvcName AppThrottle     10000
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$SvcName\Parameters"
    if (($EnvVars.Count -gt 0) -and (Test-Path $regPath)) {
        New-ItemProperty -Path $regPath -Name "AppEnvironmentExtra" `
            -Value $EnvVars -PropertyType MultiString -Force | Out-Null
        Write-Info "Env vars written to registry for $SvcName"
    }
    Write-OK "Service registered: $SvcName"
}

$nodePath    = (Get-Command node).Source
$apiDistPath = Join-Path $Config.InstallDir "artifacts\api-server\dist\index.mjs"
if (-not (Test-Path $apiDistPath)) { Fail "API dist not found: $apiDistPath -- build may have failed." }

$apiEnv = @(
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
    "API_PUBLIC_URL=$publicBase",
    "FRONTEND_URL=$publicBase"
)

# ===========================================================
# STEP 11 -- nginx (skipped when -SkipNginx)
# ===========================================================
if (-not $SkipNginx) {
    Write-Step "11/13" "Installing nginx $($Config.NginxVersion)"

    $nginxZip = Join-Path $TempDir "nginx.zip"
    $nginxUrl = "https://nginx.org/download/nginx-$($Config.NginxVersion).zip"

    if (-not (Test-Path (Join-Path $NginxDir "nginx.exe")) -or $Reinstall) {
        Invoke-Download $nginxUrl $nginxZip
        Write-Info "Extracting nginx..."
        $nginxExtract = Join-Path $TempDir "nginx-extract"
        if (Test-Path $nginxExtract) { Remove-Item $nginxExtract -Recurse -Force }
        Expand-Archive -Path $nginxZip -DestinationPath $nginxExtract -Force
        $nginxSrc = Get-ChildItem $nginxExtract -Directory | Select-Object -First 1
        if (-not $nginxSrc) { Fail "Could not find nginx folder inside zip." }
        if (Test-Path $NginxDir) { Remove-Item $NginxDir -Recurse -Force }
        Copy-Item $nginxSrc.FullName $NginxDir -Recurse -Force
        Write-OK "nginx extracted to $NginxDir"
    } else {
        Write-OK "nginx already present -- skipping download"
    }

    $nginxExe = Join-Path $NginxDir "nginx.exe"
    if (-not (Test-Path $nginxExe)) { Fail "nginx.exe not found at $nginxExe" }

    New-Item -ItemType Directory -Force -Path (Join-Path $NginxDir "logs")                         | Out-Null
    New-Item -ItemType Directory -Force -Path $SslDir                                               | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $AcmeRoot ".well-known\acme-challenge")    | Out-Null
    Write-OK "nginx directories ready"

    # -- Write nginx.conf ---------------------------------------------------
    Write-Step "11b/13" "Configuring nginx"

    $nginxFrontendRoot = To-NginxPath (Join-Path $Config.InstallDir "artifacts\hotel-system\dist\public")
    $nginxAcmeRoot     = To-NginxPath $AcmeRoot
    $nginxLogDir       = To-NginxPath (Join-Path $NginxDir "logs")
    $nginxConfPath     = Join-Path $NginxDir "conf\nginx.conf"

    function Write-NginxConf([bool]$includeSsl) {
        $sslCertFile = To-NginxPath (Join-Path $SslDir "$($Config.Domain)-chain.pem")
        $sslKeyFile  = To-NginxPath (Join-Path $SslDir "$($Config.Domain)-key.pem")

        $httpsBlock = ""
        if ($includeSsl) {
            $httpsBlock = @"

    # ---- HTTPS -------------------------------------------------------
    server {
        listen 443 ssl http2;
        server_name $($Config.Domain);

        ssl_certificate     $sslCertFile;
        ssl_certificate_key $sslKeyFile;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        ssl_session_timeout 1d;
        ssl_session_cache   shared:SSL:10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options           "SAMEORIGIN"                          always;
        add_header X-Content-Type-Options    "nosniff"                             always;
        add_header Referrer-Policy           "strict-origin-when-cross-origin"     always;

        # ---- WebSocket live chat (/api/chat/ws/*) ----------------------
        # Separate location with unlimited read timeout so long-lived WebSocket
        # connections are never cut by nginx's normal 60s proxy timeout.
        location /api/chat/ws/ {
            proxy_pass              http://127.0.0.1:$($Config.ApiPort)/api/chat/ws/;
            proxy_http_version      1.1;

            # The map variable resolves to "upgrade" for WebSocket requests and
            # to "" for regular HTTP -- clearing Connection enables upstream keepalive.
            proxy_set_header        Upgrade         `$http_upgrade;
            proxy_set_header        Connection      `$connection_upgrade;

            proxy_set_header        Host            `$host;
            proxy_set_header        X-Real-IP       `$remote_addr;
            proxy_set_header        X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header        X-Forwarded-Proto https;

            proxy_read_timeout      86400s;   # never time out a live WebSocket (24 h)
            proxy_send_timeout      86400s;
            proxy_connect_timeout   10s;
            proxy_socket_keepalive  on;       # TCP keepalive stops firewall from killing idle WS
            proxy_buffering         off;
        }

        # ---- REST API (/api/*) ----------------------------------------
        location /api/ {
            proxy_pass              http://127.0.0.1:$($Config.ApiPort)/api/;
            proxy_http_version      1.1;
            proxy_set_header        Connection      "";  # clear for upstream keepalive
            proxy_set_header        Host            `$host;
            proxy_set_header        X-Real-IP       `$remote_addr;
            proxy_set_header        X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header        X-Forwarded-Proto https;
            proxy_read_timeout      60s;
            proxy_send_timeout      60s;
            proxy_connect_timeout   10s;
            proxy_socket_keepalive  on;
            proxy_buffering         off;
        }

        # ---- Static frontend files ------------------------------------
        location / {
            root       $nginxFrontendRoot;
            try_files  `$uri `$uri/ /index.html;
            expires    1h;
            add_header Cache-Control "public, no-transform";
        }

        location = /index.html {
            root       $nginxFrontendRoot;
            expires    -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
"@
        }

        $conf = @"
worker_processes  auto;
error_log  $nginxLogDir/error.log warn;
pid        $nginxLogDir/nginx.pid;

events {
    worker_connections 1024;
    use                select;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '`$remote_addr - `$remote_user [`$time_local] "`$request" '
                      '`$status `$body_bytes_sent "`$http_referer" '
                      '"`$http_user_agent" "`$http_x_forwarded_for"';
    access_log  $nginxLogDir/access.log  main;

    sendfile             on;
    tcp_nopush           on;
    tcp_nodelay          on;
    keepalive_timeout    65;
    client_max_body_size 50m;

    gzip       on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    # WebSocket upgrade map.
    # Resolves to "upgrade" when the client sends "Upgrade: websocket",
    # and to "" for all other requests (enables normal upstream keepalive).
    map `$http_upgrade `$connection_upgrade {
        default  upgrade;
        ''       "";
    }

    # ---- HTTP (port 80) -----------------------------------------------
    server {
        listen      80;
        server_name $($Config.Domain);

        # Let's Encrypt ACME HTTP-01 challenge
        location /.well-known/acme-challenge/ {
            root         $nginxAcmeRoot;
            default_type text/plain;
        }

        location / {
$(if ($includeSsl) { "            return 301 https://`$host`$request_uri;" } else {
"            # SSL not yet configured -- proxy to API/static directly over HTTP`n" +
"            root       $nginxFrontendRoot;`n" +
"            try_files  `$uri `$uri/ /index.html;`n" +
"`n" +
"            location /api/chat/ws/ {`n" +
"                proxy_pass             http://127.0.0.1:$($Config.ApiPort)/api/chat/ws/;`n" +
"                proxy_http_version     1.1;`n" +
"                proxy_set_header       Upgrade    `$http_upgrade;`n" +
"                proxy_set_header       Connection `$connection_upgrade;`n" +
"                proxy_set_header       Host       `$host;`n" +
"                proxy_read_timeout     86400s;`n" +
"                proxy_socket_keepalive on;`n" +
"                proxy_buffering        off;`n" +
"            }`n" +
"`n" +
"            location /api/ {`n" +
"                proxy_pass             http://127.0.0.1:$($Config.ApiPort)/api/;`n" +
"                proxy_http_version     1.1;`n" +
"                proxy_set_header       Connection `"`";`n" +
"                proxy_set_header       Host       `$host;`n" +
"                proxy_socket_keepalive on;`n" +
"                proxy_buffering        off;`n" +
"            }"
})
        }
    }
$httpsBlock
}
"@
        [System.IO.File]::WriteAllText($nginxConfPath, $conf, $utf8NoBom)
    }

    # Write initial HTTP-only config (nginx starts for ACME challenge before cert exists)
    Write-NginxConf -includeSsl $false
    Write-Info "Testing nginx configuration..."
    $testResult = & $nginxExe -t -c $nginxConfPath -p $NginxDir 2>&1
    if ($LASTEXITCODE -ne 0) { Fail "nginx config test failed:`n$testResult" }
    Write-OK "nginx configuration OK"
}

# ===========================================================
# STEP 12 -- WINDOWS SERVICES
# ===========================================================
Write-Step "12/13" "Installing Windows services"

Install-NssmService `
    -SvcName      "GrandPalaceAPI" `
    -DisplayName  "MAISON DELUXE - API Server" `
    -Application  $nodePath `
    -AppParameters "--enable-source-maps `"$apiDistPath`"" `
    -WorkDir      $Config.InstallDir `
    -EnvVars      $apiEnv

if (-not $SkipNginx) {
    # nginx mode: nginx serves static files and proxies /api/* -- no frontend service needed
    $nginxExe      = Join-Path $NginxDir "nginx.exe"
    $nginxConfPath = Join-Path $NginxDir "conf\nginx.conf"
    Install-NssmService `
        -SvcName      "GrandPalaceNginx" `
        -DisplayName  "MAISON DELUXE - nginx" `
        -Application  $nginxExe `
        -AppParameters "-g `"daemon off;`" -c `"$nginxConfPath`" -p `"$NginxDir`"" `
        -WorkDir      $NginxDir `
        -EnvVars      @()
} else {
    # Node proxy mode: a self-contained Node.js static server + /api/* proxy
    $serveScript = Join-Path $Config.InstallDir "serve-frontend.mjs"
    $serveLines = @(
        "import http from 'http';",
        "import https from 'https';",
        "import net from 'net';",
        "import fs from 'fs';",
        "import path from 'path';",
        "import { fileURLToPath } from 'url';",
        "const PORT    = parseInt(process.env.PORT || '3000', 10);",
        "const API_URL = process.env.API_BACKEND_URL || 'http://localhost:8080';",
        "const __dirname = path.dirname(fileURLToPath(import.meta.url));",
        "const ROOT = path.join(__dirname, 'artifacts', 'hotel-system', 'dist', 'public');",
        "const MIME = { '.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.webp':'image/webp','.txt':'text/plain' };",
        "const parsed  = new URL(API_URL);",
        "const apiHost = parsed.hostname;",
        "const apiPort = parseInt(parsed.port || (parsed.protocol === 'https:' ? '443' : '80'), 10);",
        "const apiMod  = parsed.protocol === 'https:' ? https : http;",
        "const server  = http.createServer((req, res) => {",
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
        "// WebSocket proxy for live chat (/api/chat/ws/*)",
        "// Filters browser host/connection headers and sets correct upstream values.",
        "// TCP keepalive prevents Windows Server firewall from silently dropping",
        "// idle WebSocket connections after ~4 minutes.",
        "server.on('upgrade', (req, socket, head) => {",
        "  if (!req.url.startsWith('/api/')) { socket.destroy(); return; }",
        "  const skipHdrs = new Set(['host', 'connection']);",
        "  const filteredHdrs = Object.entries(req.headers)",
        "    .filter(([k]) => !skipHdrs.has(k.toLowerCase()))",
        "    .map(([k, v]) => k + ': ' + v)",
        "    .join('\r\n');",
        "  const up = net.createConnection({ port: apiPort, host: apiHost }, () => {",
        "    up.setKeepAlive(true, 15000);",
        "    up.write(",
        "      req.method + ' ' + req.url + ' HTTP/1.1\r\n' +",
        "      'Host: ' + apiHost + ':' + apiPort + '\r\n' +",
        "      'Connection: Upgrade\r\n' +",
        "      filteredHdrs + '\r\n' +",
        "      '\r\n'",
        "    );",
        "    if (head && head.length > 0) up.write(head);",
        "    up.pipe(socket);",
        "    socket.pipe(up);",
        "  });",
        "  up.on('error', (e) => { console.error('WS proxy err:', e.message); try { socket.destroy(); } catch {} });",
        "  socket.on('error', () => { try { up.destroy(); } catch {} });",
        "  socket.on('close', () => { try { up.destroy(); } catch {} });",
        "});",
        "server.listen(PORT, '0.0.0.0', () => console.log('Frontend serving on port ' + PORT));"
    )
    [System.IO.File]::WriteAllText($serveScript, ($serveLines -join "`r`n") + "`r`n", $utf8NoBom)
    Write-OK "Created serve-frontend.mjs"

    $frontendEnv = @(
        "PORT=$($Config.FrontendPort)",
        "NODE_ENV=production",
        "API_BACKEND_URL=http://localhost:$($Config.ApiPort)"
    )
    Install-NssmService `
        -SvcName      "GrandPalaceFrontend" `
        -DisplayName  "MAISON DELUXE - Frontend" `
        -Application  $nodePath `
        -AppParameters "`"$serveScript`"" `
        -WorkDir      $Config.InstallDir `
        -EnvVars      $frontendEnv
}

# ===========================================================
# STEP 13 -- FIREWALL + START + SSL + HEALTH CHECK
# ===========================================================
Write-Step "13/13" "Firewall, start services, SSL, health check"

if (-not $SkipNginx) {
    foreach ($rule in @(
        @{ Name="MAISON DELUXE HTTP";  Port=80  },
        @{ Name="MAISON DELUXE HTTPS"; Port=443 }
    )) {
        netsh advfirewall firewall delete rule name=$($rule.Name) 2>&1 | Out-Null
        netsh advfirewall firewall add rule name=$($rule.Name) dir=in action=allow protocol=TCP localport=$($rule.Port) 2>&1 | Out-Null
        Write-OK "Firewall opened: TCP $($rule.Port)"
    }
} else {
    foreach ($rule in @(
        @{ Name="MAISON DELUXE API";      Port=$Config.ApiPort      },
        @{ Name="MAISON DELUXE Frontend"; Port=$Config.FrontendPort }
    )) {
        netsh advfirewall firewall delete rule name=$($rule.Name) 2>&1 | Out-Null
        netsh advfirewall firewall add rule name=$($rule.Name) dir=in action=allow protocol=TCP localport=$($rule.Port) 2>&1 | Out-Null
        Write-OK "Firewall opened: TCP $($rule.Port)"
    }
}

# -- Start services --------------------------------------------------
$startFailed = @()
$svcsToStart = if ($SkipNginx) { @("GrandPalaceAPI", "GrandPalaceFrontend") } else { @("GrandPalaceAPI", "GrandPalaceNginx") }

foreach ($svc in $svcsToStart) {
    try {
        Start-Service -Name $svc -ErrorAction Stop
        Write-OK "$svc started"
    } catch {
        $startFailed += $svc
        Write-Err "$svc failed to start: $_"
        $errLog = Join-Path $LogDir "$svc-err.log"
        if (Test-Path $errLog) {
            Get-Content $errLog -ErrorAction SilentlyContinue | Select-Object -Last 20 |
                ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }
    }
    Start-Sleep -Seconds 3
}

# -- SSL certificate (nginx mode only) --------------------------------
if (-not $SkipNginx -and -not $SkipSsl) {
    Write-Info "Downloading win-acme (Let's Encrypt client for Windows)..."
    $wacsZip = Join-Path $TempDir "wacs.zip"
    $wacsOk  = $false
    foreach ($wacsUrl in @(
        "https://github.com/win-acme/win-acme/releases/download/v2.2.9.1701/win-acme.v2.2.9.1701.x64.pluggable.zip",
        "https://github.com/win-acme/win-acme/releases/download/v2.2.8.1507/win-acme.v2.2.8.1507.x64.pluggable.zip"
    )) {
        try { Invoke-Download $wacsUrl $wacsZip; $wacsOk = $true; break }
        catch { Write-Warn "win-acme mirror failed: $wacsUrl -- trying next..." }
    }
    if (-not $wacsOk) {
        Write-Warn "Could not download win-acme automatically."
        Write-Warn "Manual steps:"
        Write-Warn "  1. Download win-acme from https://www.win-acme.com/"
        Write-Warn "  2. Extract to $WacsDir"
        Write-Warn "  3. Run: wacs.exe --source manual --host $($Config.Domain) --validation filesystem --webroot `"$AcmeRoot`" --store pemfiles --pemfilespath `"$SslDir`" --emailaddress `"$($Config.Email)`" --accepttos"
        Write-Warn "  4. Re-run with -SkipBuild -SkipSsl to regenerate nginx.conf with SSL"
    } else {
        if (Test-Path $WacsDir) { Remove-Item $WacsDir -Recurse -Force }
        New-Item -ItemType Directory -Force -Path $WacsDir | Out-Null
        Expand-Archive -Path $wacsZip -DestinationPath $WacsDir -Force
        $wacsExe = Get-ChildItem $WacsDir -Filter "wacs.exe" -Recurse | Select-Object -First 1 -ExpandProperty FullName
        if (-not $wacsExe) { Write-Warn "wacs.exe not found inside zip -- SSL skipped" }
        else {
            Write-OK "win-acme ready"
            Write-Info "Requesting Let's Encrypt certificate for $($Config.Domain)..."
            Write-Info "(Port 80 must be publicly reachable for this to succeed)"

            $nginxExeLocal = Join-Path $NginxDir "nginx.exe"
            $nginxConfPath = Join-Path $NginxDir "conf\nginx.conf"

            & $wacsExe @(
                "--source", "manual",
                "--host", $Config.Domain,
                "--validation", "filesystem",
                "--webroot", $AcmeRoot,
                "--store", "pemfiles",
                "--pemfilespath", $SslDir,
                "--emailaddress", $Config.Email,
                "--accepttos",
                "--nocache"
            )
            $wacsExit = $LASTEXITCODE
            $certChain = Join-Path $SslDir "$($Config.Domain)-chain.pem"
            $certKey   = Join-Path $SslDir "$($Config.Domain)-key.pem"

            if ($wacsExit -eq 0 -and (Test-Path $certChain) -and (Test-Path $certKey)) {
                Write-OK "SSL certificate obtained!"
                Write-OK "  Chain : $certChain"
                Write-OK "  Key   : $certKey"
                Write-Info "Updating nginx.conf with SSL and reloading..."
                Write-NginxConf -includeSsl $true
                $testResult2 = & $nginxExeLocal -t -c $nginxConfPath -p $NginxDir 2>&1
                if ($LASTEXITCODE -ne 0) { Fail "nginx SSL config test failed:`n$testResult2" }
                Write-OK "nginx SSL config valid"
                & $nginxExeLocal -s reload -c $nginxConfPath -p $NginxDir 2>&1 | Out-Null
                Start-Sleep -Seconds 2
                Write-OK "nginx reloaded with SSL -- auto-renewal scheduled by win-acme"
                # Update .env + service registry to use https:// URL now that cert is live
                $publicBase = "https://$($Config.Domain)"
            } else {
                Write-Warn "SSL certificate request failed (exit code: $wacsExit)"
                Write-Warn "Common reasons:"
                Write-Warn "  - DNS for '$($Config.Domain)' does not point to this server yet"
                Write-Warn "  - Port 80 is blocked by your firewall or ISP"
                Write-Warn "  - Let's Encrypt rate limit reached (5 certs per domain per week)"
                Write-Warn "  Site is running on HTTP for now. To retry SSL:"
                Write-Warn "    powershell -ExecutionPolicy Bypass -File final.ps1 -SkipBuild"
            }
        }
    }
} elseif (-not $SkipNginx -and $SkipSsl) {
    Write-Warn "-SkipSsl set -- site is running on HTTP only via nginx"
    Write-Warn "To add SSL later: powershell -ExecutionPolicy Bypass -File final.ps1 -SkipBuild"
}

# -- Health checks -------------------------------------------------------
Write-Info "Running health checks..."
Start-Sleep -Seconds 5

# CHECK 1: API
$apiReady  = $false
$healthUrl = "http://localhost:$($Config.ApiPort)/api/healthz"
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
        Get-Content $errLog -ErrorAction SilentlyContinue | Select-Object -Last 30 |
            ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
    }
}

# CHECK 2: Registry env vars
Write-Info "[CHECK 2] Verifying GrandPalaceAPI environment variables in registry..."
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\GrandPalaceAPI\Parameters"
if (Test-Path $regPath) {
    $regVal = (Get-ItemProperty -Path $regPath -Name "AppEnvironmentExtra" -ErrorAction SilentlyContinue).AppEnvironmentExtra
    if ($regVal) {
        $hasClerk = ($regVal | Where-Object { $_ -match "^CLERK_SECRET_KEY=.+" }) -ne $null
        $hasDb    = ($regVal | Where-Object { $_ -match "^(NEON_DATABASE_URL|DATABASE_URL)=.+" }) -ne $null
        $hasPort  = ($regVal | Where-Object { $_ -match "^PORT=" }) -ne $null
        if ($hasClerk -and $hasDb -and $hasPort) {
            Write-OK "[CHECK 2] CLERK_SECRET_KEY, DATABASE_URL, PORT all present in service registry"
        } else {
            if (-not $hasClerk) { Write-Err "[CHECK 2] CLERK_SECRET_KEY MISSING from registry!" }
            if (-not $hasDb)    { Write-Err "[CHECK 2] DATABASE_URL MISSING from registry!" }
            if (-not $hasPort)  { Write-Err "[CHECK 2] PORT MISSING from registry!" }
        }
    } else { Write-Err "[CHECK 2] AppEnvironmentExtra is EMPTY -- no env vars injected!" }
} else { Write-Warn "[CHECK 2] Registry path not found: $regPath" }

# CHECK 3: DB data
if ($apiReady) {
    Write-Info "[CHECK 3] Verifying database has data..."
    try {
        $hotelsResp = Invoke-WebRequest -Uri "http://localhost:$($Config.ApiPort)/api/hotels" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $hotelsJson = $hotelsResp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        $hotelCount = if ($hotelsJson -is [Array]) { $hotelsJson.Count } elseif ($hotelsJson) { 1 } else { 0 }
        if ($hotelCount -gt 0) { Write-OK "[CHECK 3] Hotels endpoint OK -- $hotelCount hotel(s) in database" }
        else { Write-Err "[CHECK 3] Hotels endpoint returned 0 records -- seed may have failed" }
    } catch { Write-Err "[CHECK 3] Hotels endpoint failed: $_" }
} else { Write-Warn "[CHECK 3] Skipped -- API not responding" }

# CHECK 4: Frontend / nginx reachable
if (-not $SkipNginx) {
    Write-Info "[CHECK 4] Verifying nginx is responding on port 80..."
    $frontendReady = $false
    for ($i = 1; $i -le 6; $i++) {
        try {
            $fr = Invoke-WebRequest -Uri "http://localhost:80/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($fr.StatusCode -lt 400) { $frontendReady = $true; break }
        } catch {}
        Start-Sleep -Seconds 3
    }
    if ($frontendReady) { Write-OK "[CHECK 4] nginx responding on port 80" }
    else {
        Write-Err "[CHECK 4] nginx not responding on port 80"
        $nginxErrLog = Join-Path $NginxDir "logs\error.log"
        if (Test-Path $nginxErrLog) {
            Get-Content $nginxErrLog -ErrorAction SilentlyContinue | Select-Object -Last 20 |
                ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }
    }
    # CHECK 5: HTTPS
    $certChainFinal = Join-Path $SslDir "$($Config.Domain)-chain.pem"
    if ((Test-Path $certChainFinal) -and -not $SkipSsl) {
        try {
            $sslResp = Invoke-WebRequest -Uri "https://$($Config.Domain)/" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
            Write-OK "[CHECK 5] HTTPS responding at https://$($Config.Domain)"
        } catch { Write-Warn "[CHECK 5] HTTPS check failed -- cert present but HTTPS not responding yet" }
    }
} else {
    Write-Info "[CHECK 4] Verifying Node proxy is responding on port $($Config.FrontendPort)..."
    $frontendReady = $false
    for ($i = 1; $i -le 6; $i++) {
        try {
            $fr = Invoke-WebRequest -Uri "http://localhost:$($Config.FrontendPort)/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($fr.StatusCode -lt 400) { $frontendReady = $true; break }
        } catch {}
        Start-Sleep -Seconds 3
    }
    if ($frontendReady) { Write-OK "[CHECK 4] Frontend proxy serving on port $($Config.FrontendPort)" }
    else {
        Write-Err "[CHECK 4] Frontend not responding on port $($Config.FrontendPort)"
        $feLog = Join-Path $LogDir "GrandPalaceFrontend-err.log"
        if (Test-Path $feLog) {
            Get-Content $feLog -ErrorAction SilentlyContinue | Select-Object -Last 20 |
                ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }
    }
}

# ===========================================================
# SUMMARY
# ===========================================================
Stop-Transcript -ErrorAction SilentlyContinue | Out-Null

$serverIp = try {
    (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
     Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } |
     Select-Object -First 1 -ExpandProperty IPAddress)
} catch { try { (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1).IPV4Address.IPAddressToString } catch { "YOUR_SERVER_IP" } }
if (-not $serverIp) { $serverIp = "YOUR_SERVER_IP" }

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  MAISON DELUXE Hotels and Resorts -- INSTALLED"      -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

if (-not $SkipNginx) {
    $certExists = Test-Path (Join-Path $SslDir "$($Config.Domain)-chain.pem")
    $siteProto  = if ($certExists -and -not $SkipSsl) { "https" } else { "http" }
    Write-Host "  Site     : $siteProto`://$($Config.Domain)/"        -ForegroundColor White
    Write-Host "  Admin    : $siteProto`://$($Config.Domain)/admin"   -ForegroundColor White
    Write-Host "  API      : http://localhost:$($Config.ApiPort)/api/ (internal only)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Services (auto-start on reboot):"
    Write-Host "    GrandPalaceAPI    -- API server (port $($Config.ApiPort), internal)"
    Write-Host "    GrandPalaceNginx  -- nginx reverse proxy (ports 80/443)"
    Write-Host ""
    Write-Host "  Useful commands:" -ForegroundColor DarkGray
    Write-Host "    Restart API   : Restart-Service GrandPalaceAPI"             -ForegroundColor DarkGray
    Write-Host "    Restart nginx : Restart-Service GrandPalaceNginx"           -ForegroundColor DarkGray
    Write-Host "    nginx error log : Get-Content '$NginxDir\logs\error.log' -Tail 30" -ForegroundColor DarkGray
    Write-Host "    API error log   : Get-Content '$LogDir\GrandPalaceAPI-err.log' -Tail 30" -ForegroundColor DarkGray
    Write-Host "    Retry SSL       : powershell -ExecutionPolicy Bypass -File final.ps1 -SkipBuild" -ForegroundColor DarkGray
} else {
    Write-Host "  Site     : http://$serverIp`:$($Config.FrontendPort)/"      -ForegroundColor White
    Write-Host "  Admin    : http://$serverIp`:$($Config.FrontendPort)/admin" -ForegroundColor White
    Write-Host "  API      : http://$serverIp`:$($Config.ApiPort)/api/"       -ForegroundColor White
    Write-Host ""
    Write-Host "  Services (auto-start on reboot):"
    Write-Host "    GrandPalaceAPI      -- API server (port $($Config.ApiPort))"
    Write-Host "    GrandPalaceFrontend -- Node.js proxy (port $($Config.FrontendPort))"
    Write-Host ""
    Write-Host "  Useful commands:" -ForegroundColor DarkGray
    Write-Host "    Restart API      : Restart-Service GrandPalaceAPI"              -ForegroundColor DarkGray
    Write-Host "    Restart Frontend : Restart-Service GrandPalaceFrontend"         -ForegroundColor DarkGray
    Write-Host "    API error log    : Get-Content '$LogDir\GrandPalaceAPI-err.log' -Tail 30" -ForegroundColor DarkGray
    Write-Host "    Frontend err log : Get-Content '$LogDir\GrandPalaceFrontend-err.log' -Tail 30" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  TIP: Add nginx + SSL by re-running without -SkipNginx (requires a domain with DNS pointing here)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Logs : $LogDir"
Write-Host "  Log file : $LogFile"
Write-Host ""

if ($startFailed.Count -gt 0) {
    Write-Host "  WARNING -- These services failed to start:" -ForegroundColor Red
    $startFailed | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host "  Check error logs in: $LogDir" -ForegroundColor Red
    Write-Host ""
}

if ($Config.ClerkPublishableKey -like "*REPLACE*" -or $Config.ClerkSecretKey -like "*REPLACE*") {
    Write-Host "  ACTION REQUIRED: Clerk keys are still placeholders." -ForegroundColor Red
    Write-Host "    Edit the Config block and run the script again." -ForegroundColor Red
    Write-Host "    Get your keys at: https://dashboard.clerk.com" -ForegroundColor Red
    Write-Host ""
}

Read-Host "Press Enter to close"
