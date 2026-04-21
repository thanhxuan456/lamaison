#Requires -RunAsAdministrator
# MAISON DELUXE Hotels & Resorts - nginx + SSL Installer
# Compatible with Windows Server 2019 / 2022 / 2025
#
# HOW TO USE:
#   1. Download the project ZIP from Replit and extract it on your server
#   2. Fill in the Config block below (Domain, Email, database, Clerk keys)
#   3. Make sure your domain's DNS A-record already points to this server's IP
#   4. Open port 80 and 443 on your firewall/router
#   5. Run as Administrator:
#        powershell -ExecutionPolicy Bypass -File nginx-ssl-install.ps1
#
# OPTIONAL FLAGS:
#   -Reinstall     Force clean reinstall even if already installed
#   -SkipBuild     Skip the npm build step (config-only updates)
#   -SkipSsl       Skip SSL certificate request (useful when testing locally)
#   -Uninstall     Stop & remove all services, optionally delete install directory
#
# ARCHITECTURE:
#   Internet  -->  nginx :80/:443  -->  /api/*  -->  Node.js API :8080
#                                  -->  /*      -->  Static files (built frontend)
#
#   - nginx handles HTTPS termination + HTTP->HTTPS redirect
#   - API runs internally on port 8080 (never exposed directly)
#   - Let's Encrypt SSL via win-acme (auto-renews via Windows Scheduled Task)
#   - WebSocket connections (/api/chat/ws/*) are transparently proxied

param(
    [switch]$Reinstall,
    [switch]$SkipBuild,
    [switch]$SkipSsl,
    [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ===========================================================
# CONFIGURATION -- Edit these values before running
# ===========================================================
$Config = @{
    InstallDir      = "C:\GrandPalace"
    ApiPort         = 8080          # internal only -- not exposed to the internet

    # -- DOMAIN & SSL ------------------------------------------------------
    # Your fully-qualified domain name (e.g. "myhotel.com" or "www.myhotel.com")
    # DNS must already point to this server before running the script.
    Domain          = "vnthemes.store"
    # E-mail used for Let's Encrypt registration / expiry notices
    Email           = "tthanhxuan456@gmail.com"

    # -- DATABASE ----------------------------------------------------------
    UseLocalPg          = $false
    NeonDatabaseUrl     = "postgresql://neondb_owner:npg_YCEZLyV6gwi7@ep-fragrant-sunset-a18l1eva-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

    PgSuperPassword     = "ZeroCode123#!!"
    PgDbName            = "grandpalace"
    PgDbUser            = "grandpalace"
    PgDbPassword        = "ZeroCode123#!!"

    # -- CLERK AUTHENTICATION ----------------------------------------------
    ClerkPublishableKey = "pk_test_cGlja2VkLWNyYWItNTguY2xlcmsuYWNjb3VudHMuZGV2JA"
    ClerkSecretKey      = "sk_test_cPh6CPPBJ9oRO9qmRahsEHOLH9IOYUUwdUyJw11se6"

    # -- MOMO PAYMENT ------------------------------------------------------
    MomoPartnerCode     = "MOMO"
    MomoAccessKey       = "F8BBA842ECF85"
    MomoSecretKey       = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
    MomoEndpoint        = "https://test-payment.momo.vn/v2/gateway/api/create"

    # -- VERSIONS ----------------------------------------------------------
    NodeVersion         = "22.14.0"
    NodeMinMajor        = 20
    PgVersion           = "16"
    NginxVersion        = "1.26.3"   # stable branch

    # -- SYSTEM REQUIREMENTS -----------------------------------------------
    MinRamGB            = 2
    MinDiskGB           = 10
}
# ===========================================================

$LogFile       = Join-Path $env:TEMP ("MaisonDeluxeNginx_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")
$TempDir       = Join-Path $env:TEMP "MaisonDeluxeSetup"
$NginxDir      = Join-Path $Config.InstallDir "nginx"
$SslDir        = Join-Path $Config.InstallDir "ssl"
$AcmeRoot      = Join-Path $Config.InstallDir "acme-challenge"
$LogDir        = Join-Path $Config.InstallDir "logs"
$WacsDir       = Join-Path $TempDir "wacs"
$utf8NoBom     = [System.Text.UTF8Encoding]::new($false)

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Start-Transcript -Path $LogFile -Append -ErrorAction SilentlyContinue | Out-Null
Write-Host "  Install log: $LogFile" -ForegroundColor DarkGray

# ---- Helpers -------------------------------------------------------
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

# nginx path helper -- converts Windows backslashes to forward slashes for nginx.conf
function To-NginxPath([string]$p) { return $p.Replace("\", "/") }

# ===========================================================
# UNINSTALL MODE
# ===========================================================
if ($Uninstall) {
    Write-Host ""
    Write-Host "=== UNINSTALL MODE ===" -ForegroundColor Red
    $nssmU = Join-Path $TempDir "nssm.exe"
    foreach ($svc in @("GrandPalaceAPI", "GrandPalaceNginx")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s) {
            Write-Info "Stopping and removing: $svc"
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            Start-Sleep -Seconds 2
            if (Test-Path $nssmU) { & $nssmU remove $svc confirm 2>&1 | Out-Null }
            else { sc.exe delete $svc | Out-Null }
            Write-OK "Removed: $svc"
        } else {
            Write-Info "Service not found: $svc"
        }
    }
    foreach ($rule in @("MAISON DELUXE HTTP", "MAISON DELUXE HTTPS", "MAISON DELUXE API")) {
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
Write-Step "1/14" "System requirements check"

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

if ([string]::IsNullOrWhiteSpace($Config.Domain) -or $Config.Domain -match "yourdomain|example\.com") {
    Fail "Domain is not configured. Edit the Config block at the top of this script."
}
Write-Info "Domain: $($Config.Domain)"

# ===========================================================
# STEP 2 -- NODE.JS
# ===========================================================
Write-Step "2/14" "Node.js (minimum v$($Config.NodeMinMajor))"

$nodeOk = $false
if (Test-CommandExists "node") {
    $rawVer = (node --version 2>&1).ToString().TrimStart("v")
    $major  = [int]($rawVer.Split(".")[0])
    if ($major -ge $Config.NodeMinMajor -and -not $Reinstall) {
        Write-OK "Node.js already installed: v$rawVer"; $nodeOk = $true
    } else {
        Write-Warn "Node v$rawVer found but minimum v$($Config.NodeMinMajor) required -- upgrading"
    }
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
Write-Step "3/14" "pnpm package manager"

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
# STEP 4 -- DATABASE SETUP
# ===========================================================
Write-Step "4/14" "Database setup"

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
        Fail "NeonDatabaseUrl is not configured."
    }
    $DatabaseUrl = $Config.NeonDatabaseUrl; $NeonDatabaseUrl = $Config.NeonDatabaseUrl
    Write-OK "Neon database URL configured"
}

# ===========================================================
# STEP 5 -- COPY SOURCE FILES
# ===========================================================
Write-Step "5/14" "Copying source files"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Info "Source : $scriptDir"
Write-Info "Target : $($Config.InstallDir)"

$schemaCheck = Join-Path $scriptDir "lib\db\src\schema\index.ts"
if (-not (Test-Path $schemaCheck)) {
    Fail "Source validation failed: lib\db\src\schema\index.ts not found in $scriptDir`nRun this script from inside the extracted Replit project folder."
}
Write-OK "Source folder verified"

if ($scriptDir -ne $Config.InstallDir) {
    robocopy "$scriptDir" "$($Config.InstallDir)" /E `
        /XD ".git" "node_modules" "dist" ".replit-artifact" "attached_assets" ".local" "nginx" "ssl" "acme-challenge" `
        /XF ".env" "*.log" "*.map" `
        /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { Fail "File copy failed (robocopy exit code $LASTEXITCODE)." }
    Write-OK "Files copied"
}

# ===========================================================
# STEP 6 -- WRITE .ENV FILE
# ===========================================================
Write-Step "6/14" "Writing environment configuration"

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

$publicHttps    = "https://$($Config.Domain)"
$clerkProxyUrl  = "$publicHttps/api/__clerk"
# Clerk proxy ONLY works with live production keys (pk_live_).
# Using a proxy URL with test/dev keys (pk_test_) causes Clerk to silently
# fail and the sign-in / register UI will never render.
if ($Config.ClerkPublishableKey.StartsWith("pk_test_")) {
    $clerkProxyUrl = ""
    Write-Warn "Clerk test key detected -- disabling VITE_CLERK_PROXY_URL (proxy requires pk_live_)"
}

# VITE_API_URL is always empty -- browser uses relative /api/ paths (no CORS).
# nginx proxies /api/* to the API server internally.
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
    "API_PUBLIC_URL=$publicHttps",
    "FRONTEND_URL=$publicHttps"
)
[System.IO.File]::WriteAllText($envFile, ($envLines -join "`n") + "`n", $utf8NoBom)
foreach ($line in $envLines) {
    if ($line -match "^([^#][^=]*)=(.*)") {
        [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2], "Process")
    }
}
[System.Environment]::SetEnvironmentVariable("DATABASE_URL",      $DatabaseUrl,     "Process")
[System.Environment]::SetEnvironmentVariable("NEON_DATABASE_URL", $NeonDatabaseUrl, "Process")
Write-OK ".env written"

# ===========================================================
# STEP 7 -- PATCH package.json + pnpm-workspace.yaml FOR WINDOWS
# ===========================================================
Write-Step "7/14" "Patching project files for Windows"

$rootPkg = Join-Path $Config.InstallDir "package.json"
if (Test-Path $rootPkg) {
    $pkgJson = Get-Content $rootPkg -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pkgJson.scripts.PSObject.Properties.Name -contains "preinstall") {
        $pkgJson.scripts.PSObject.Properties.Remove("preinstall")
        [System.IO.File]::WriteAllText($rootPkg, ($pkgJson | ConvertTo-Json -Depth 20), $utf8NoBom)
        Write-OK "Removed Linux-only preinstall hook"
    } else { Write-OK "No preinstall hook -- nothing to remove" }
}

$wsYaml = Join-Path $Config.InstallDir "pnpm-workspace.yaml"
if (Test-Path $wsYaml) {
    $wsLines    = Get-Content $wsYaml -Encoding UTF8
    $wsFiltered = $wsLines | Where-Object { $_ -notmatch '": "-"' }
    [System.IO.File]::WriteAllText($wsYaml, ($wsFiltered -join "`n") + "`n", $utf8NoBom)
    Write-OK "Removed $($wsLines.Count - $wsFiltered.Count) platform-binary exclusion(s)"
}

# ===========================================================
# STEP 8 -- INSTALL DEPENDENCIES, PUSH DB SCHEMA, SEED, BUILD
# ===========================================================
Write-Step "8/14" "Install dependencies, push DB schema, seed data, and build"

Push-Location $Config.InstallDir
try {
    foreach ($svc in @("GrandPalaceAPI", "GrandPalaceNginx")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s -and $s.Status -ne "Stopped") {
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            Start-Sleep -Seconds 3
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
        if (Test-Path $nmDir) { Fail "Could not remove node_modules. Reboot the server and run again." }
    }
    foreach ($pkgBase in @("artifacts", "lib")) {
        $base = Join-Path $Config.InstallDir $pkgBase
        if (Test-Path $base) {
            Get-ChildItem $base -Recurse -Filter "node_modules" -Directory -ErrorAction SilentlyContinue |
                ForEach-Object { & cmd /c "rmdir /s /q `"$($_.FullName)`"" 2>&1 | Out-Null }
        }
    }
    $lockFile = Join-Path $Config.InstallDir "pnpm-lock.yaml"
    if (Test-Path $lockFile) { Remove-Item $lockFile -Force }

    Write-Info "Running pnpm install (may take several minutes)..."
    & pnpm install --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed." }
    Write-OK "Dependencies installed"

    Load-DotEnv (Join-Path $Config.InstallDir ".env")
    [System.Environment]::SetEnvironmentVariable("DATABASE_URL",      $DatabaseUrl,     "Process")
    [System.Environment]::SetEnvironmentVariable("NEON_DATABASE_URL", $NeonDatabaseUrl, "Process")

    Write-Info "Pushing database schema..."
    & pnpm --filter "@workspace/db" run push
    if ($LASTEXITCODE -ne 0) { Fail "Database schema push failed." }
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
        [System.Environment]::SetEnvironmentVariable("PORT",                       "80",                         "Process")
        [System.Environment]::SetEnvironmentVariable("BASE_PATH",                  "/",                          "Process")
        [System.Environment]::SetEnvironmentVariable("NODE_ENV",                   "production",                 "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_CLERK_PUBLISHABLE_KEY", $Config.ClerkPublishableKey,  "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_CLERK_PROXY_URL",       $clerkProxyUrl,               "Process")
        [System.Environment]::SetEnvironmentVariable("VITE_API_URL",               "",                           "Process")
        & pnpm --filter "@workspace/hotel-system" run build
        if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed." }
        Write-OK "Frontend built"
    } else {
        Write-Warn "-SkipBuild set -- skipping build steps"
    }
} finally {
    Pop-Location
}

# ===========================================================
# STEP 9 -- NSSM (service manager)
# ===========================================================
Write-Step "9/14" "Downloading NSSM (service manager)"

$nssmPath = Join-Path $TempDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    $nssmZip = Join-Path $TempDir "nssm.zip"
    $nssmOk  = $false
    foreach ($url in @(
        "https://nssm.cc/release/nssm-2.24.zip",
        "https://github.com/nicholasgasior/nssm/releases/download/v2.24/nssm-2.24.zip"
    )) {
        try { Invoke-Download $url $nssmZip; $nssmOk = $true; break } catch { continue }
    }
    if (-not $nssmOk) { Fail "Could not download NSSM." }
    Expand-Archive -Path $nssmZip -DestinationPath $TempDir -Force
    $nssmExe = Get-ChildItem $TempDir -Filter "nssm.exe" -Recurse | Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
    if (-not $nssmExe) { Fail "nssm.exe (win64) not found in zip." }
    Copy-Item $nssmExe.FullName $nssmPath -Force
    Write-OK "NSSM ready"
}

# ===========================================================
# STEP 10 -- INSTALL nginx
# ===========================================================
Write-Step "10/14" "Installing nginx $($Config.NginxVersion)"

$nginxZip = Join-Path $TempDir "nginx.zip"
$nginxUrl = "https://nginx.org/download/nginx-$($Config.NginxVersion).zip"

if (-not (Test-Path (Join-Path $NginxDir "nginx.exe")) -or $Reinstall) {
    Invoke-Download $nginxUrl $nginxZip
    Write-Info "Extracting nginx..."
    $nginxExtract = Join-Path $TempDir "nginx-extract"
    if (Test-Path $nginxExtract) { Remove-Item $nginxExtract -Recurse -Force }
    Expand-Archive -Path $nginxZip -DestinationPath $nginxExtract -Force

    # The zip contains a single top-level folder like "nginx-1.26.3\"
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

# Create directories nginx needs
New-Item -ItemType Directory -Force -Path (Join-Path $NginxDir "logs")      | Out-Null
New-Item -ItemType Directory -Force -Path $SslDir                            | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $AcmeRoot ".well-known\acme-challenge") | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir                            | Out-Null
Write-OK "nginx directories ready"

# ===========================================================
# STEP 11 -- WRITE nginx.conf (HTTP only for now)
# ===========================================================
Write-Step "11/14" "Configuring nginx"

$nginxFrontendRoot = To-NginxPath (Join-Path $Config.InstallDir "artifacts\hotel-system\dist\public")
$nginxAcmeRoot     = To-NginxPath $AcmeRoot
$nginxLogDir       = To-NginxPath (Join-Path $NginxDir "logs")
$nginxConfPath     = Join-Path $NginxDir "conf\nginx.conf"

# We write the config with both HTTP and HTTPS blocks.
# Before the cert exists, the HTTPS block is commented out so nginx starts cleanly.
# After SSL is obtained, the HTTPS block is un-commented and the config reloaded.

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

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API reverse proxy (includes WebSocket for live chat)
        location /api/ {
            proxy_pass         http://127.0.0.1:$($Config.ApiPort)/api/;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade          `$http_upgrade;
            proxy_set_header   Connection       "upgrade";
            proxy_set_header   Host             `$host;
            proxy_set_header   X-Real-IP        `$remote_addr;
            proxy_set_header   X-Forwarded-For  `$proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto https;
            proxy_read_timeout 86400;
            proxy_buffering    off;
        }

        # Static frontend files
        location / {
            root       $nginxFrontendRoot;
            try_files  `$uri `$uri/ /index.html;
            expires    1h;
            add_header Cache-Control "public, no-transform";
        }

        # Disable caching for index.html (SPA entry point)
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

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    client_max_body_size 50m;
    gzip            on;
    gzip_types      text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # ---- HTTP ------------------------------------------------------------
    server {
        listen      80;
        server_name $($Config.Domain);

        # Let's Encrypt ACME challenge (HTTP-01)
        location /.well-known/acme-challenge/ {
            root    $nginxAcmeRoot;
            default_type text/plain;
        }

        # Redirect everything else to HTTPS
        location / {
$(if ($includeSsl) { "            return 301 https://`$host`$request_uri;" } else { "            # HTTPS not yet configured -- serving over HTTP temporarily`n            return 200 'Waiting for SSL certificate...';" })
        }
    }
$httpsBlock
}
"@
    [System.IO.File]::WriteAllText($nginxConfPath, $conf, $utf8NoBom)
}

# Write initial config without SSL (so nginx can start for the ACME challenge)
Write-NginxConf -includeSsl $false

# Validate the config
# NOTE: nginx ghi cả thông báo "syntax is ok" ra stderr.
# Với $ErrorActionPreference='Stop', PowerShell sẽ ném NativeCommandError
# ngay cả khi nginx thành công. Bọc Continue + dựa vào $LASTEXITCODE.
Write-Info "Testing nginx configuration..."
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$LASTEXITCODE = 0
try {
    $testResult = & $nginxExe -t -c $nginxConfPath -p $NginxDir 2>&1 |
                  ForEach-Object { "$_" }
} catch {
    $testResult = $_.Exception.Message
}
$nginxExit = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

if ($nginxExit -ne 0) {
    Fail "nginx config test failed (exit $nginxExit):`n$($testResult -join "`n")"
}
Write-OK "nginx configuration OK"
$testResult | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

# ===========================================================
# STEP 12 -- INSTALL API WINDOWS SERVICE
# ===========================================================
Write-Step "12/14" "Installing Windows services"

$nodePath    = (Get-Command node).Source
$apiDistPath = Join-Path $Config.InstallDir "artifacts\api-server\dist\index.mjs"
if (-not (Test-Path $apiDistPath)) { Fail "API dist not found: $apiDistPath -- the build may have failed." }

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
    & $nssmPath install     $SvcName $Application $AppParameters
    & $nssmPath set         $SvcName DisplayName  $DisplayName
    & $nssmPath set         $SvcName Description  "MAISON DELUXE Hotels & Resorts - $DisplayName"
    & $nssmPath set         $SvcName AppDirectory $WorkDir
    & $nssmPath set         $SvcName Start        SERVICE_AUTO_START
    & $nssmPath set         $SvcName AppStdout    (Join-Path $LogDir "$SvcName-out.log")
    & $nssmPath set         $SvcName AppStderr    (Join-Path $LogDir "$SvcName-err.log")
    & $nssmPath set         $SvcName AppRotateFiles 1
    & $nssmPath set         $SvcName AppRotateBytes 10485760
    & $nssmPath set         $SvcName AppRestartDelay 3000

    if ($EnvVars.Count -gt 0) {
        New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\$SvcName\Parameters" `
                         -Name AppEnvironmentExtra -PropertyType MultiString -Value $EnvVars -Force | Out-Null
    }
    Write-OK "Service registered: $SvcName"
}

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
    "API_PUBLIC_URL=$publicHttps",
    "FRONTEND_URL=$publicHttps"
)
Install-NssmService `
    -SvcName       "GrandPalaceAPI" `
    -DisplayName   "MAISON DELUXE API Server" `
    -Application   $nodePath `
    -AppParameters "--enable-source-maps `"$apiDistPath`"" `
    -WorkDir       $Config.InstallDir `
    -EnvVars       $apiEnv

# nginx service -- runs nginx.exe directly inside the nginx directory
Install-NssmService `
    -SvcName       "GrandPalaceNginx" `
    -DisplayName   "MAISON DELUXE nginx" `
    -Application   $nginxExe `
    -AppParameters "-g `"daemon off;`" -c `"$nginxConfPath`" -p `"$NginxDir`"" `
    -WorkDir       $NginxDir `
    -EnvVars       @()

# ===========================================================
# STEP 13 -- FIREWALL
# ===========================================================
Write-Step "13/14" "Opening firewall ports"

foreach ($rule in @(
    @{ Name="MAISON DELUXE HTTP";  Port=80  },
    @{ Name="MAISON DELUXE HTTPS"; Port=443 }
)) {
    netsh advfirewall firewall delete rule name=$($rule.Name) 2>&1 | Out-Null
    netsh advfirewall firewall add rule name=$($rule.Name) dir=in action=allow protocol=TCP localport=$($rule.Port) 2>&1 | Out-Null
    Write-OK "Firewall opened: TCP $($rule.Port)"
}

# ===========================================================
# STEP 14 -- START SERVICES + SSL CERTIFICATE
# ===========================================================
Write-Step "14/14" "Starting services and obtaining SSL certificate"

Write-Info "Starting GrandPalaceAPI..."
try { Start-Service -Name "GrandPalaceAPI" -ErrorAction Stop; Write-OK "GrandPalaceAPI started" }
catch { Write-Warn "Could not auto-start GrandPalaceAPI: $_" }

Write-Info "Starting GrandPalaceNginx (HTTP only for now)..."
try { Start-Service -Name "GrandPalaceNginx" -ErrorAction Stop; Write-OK "GrandPalaceNginx started" }
catch { Write-Warn "Could not auto-start GrandPalaceNginx: $_" }

Start-Sleep -Seconds 3

# Check nginx is responding on port 80
Write-Info "Verifying nginx is serving on port 80..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:80/.well-known/acme-challenge/test" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-OK "nginx responding on port 80"
} catch {
    Write-Warn "nginx port 80 check failed (may be normal if no challenge file present)"
}

# ---- Let's Encrypt via win-acme ----------------------------------------
if (-not $SkipSsl) {
    Write-Info "Downloading win-acme (Let's Encrypt client for Windows)..."

    $wacsZip = Join-Path $TempDir "wacs.zip"
    $wacsOk  = $false
    # Try multiple known stable versions
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
        Write-Warn "  4. Then re-run this script with -SkipBuild -SkipSsl to regenerate the nginx config"
    } else {
        if (Test-Path $WacsDir) { Remove-Item $WacsDir -Recurse -Force }
        New-Item -ItemType Directory -Force -Path $WacsDir | Out-Null
        Expand-Archive -Path $wacsZip -DestinationPath $WacsDir -Force
        $wacsExe = Get-ChildItem $WacsDir -Filter "wacs.exe" -Recurse | Select-Object -First 1 -ExpandProperty FullName
        if (-not $wacsExe) { Fail "wacs.exe not found inside downloaded zip." }
        Write-OK "win-acme ready: $wacsExe"

        Write-Info "Requesting Let's Encrypt certificate for $($Config.Domain)..."
        Write-Info "(Port 80 must be reachable from the internet for this to succeed)"

        # Use the filesystem/webroot validation method.
        # nginx serves /.well-known/acme-challenge/ from $AcmeRoot.
        # win-acme writes the challenge file there.
        $wacsArgs = @(
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

        & $wacsExe @wacsArgs
        $wacsExit = $LASTEXITCODE

        $certChain = Join-Path $SslDir "$($Config.Domain)-chain.pem"
        $certKey   = Join-Path $SslDir "$($Config.Domain)-key.pem"

        if ($wacsExit -eq 0 -and (Test-Path $certChain) -and (Test-Path $certKey)) {
            Write-OK "SSL certificate obtained!"
            Write-OK "  Chain : $certChain"
            Write-OK "  Key   : $certKey"

            # Update nginx.conf with full SSL config and reload
            Write-Info "Updating nginx.conf with SSL and reloading..."
            Write-NginxConf -includeSsl $true

            $prevEAP2 = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            $LASTEXITCODE = 0
            try {
                $testResult2 = & $nginxExe -t -c $nginxConfPath -p $NginxDir 2>&1 |
                               ForEach-Object { "$_" }
            } catch {
                $testResult2 = $_.Exception.Message
            }
            $nginxExit2 = $LASTEXITCODE
            $ErrorActionPreference = $prevEAP2

            if ($nginxExit2 -ne 0) {
                Fail "nginx SSL config test failed (exit $nginxExit2):`n$($testResult2 -join "`n")"
            }
            Write-OK "nginx SSL config valid"
            $testResult2 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

            # Send nginx a reload signal (graceful config reload, no downtime)
            & $nginxExe -s reload -c $nginxConfPath -p $NginxDir 2>&1 | Out-Null
            Start-Sleep -Seconds 2
            Write-OK "nginx reloaded with SSL"

            # win-acme creates a Windows Scheduled Task for auto-renewal automatically.
            Write-OK "Auto-renewal scheduled task created by win-acme (runs daily)"
        } else {
            Write-Warn "SSL certificate request failed (exit code: $wacsExit)"
            Write-Warn "Common reasons:"
            Write-Warn "  - DNS for '$($Config.Domain)' does not yet point to this server"
            Write-Warn "  - Port 80 is blocked by your firewall or ISP"
            Write-Warn "  - Let's Encrypt rate limit reached"
            Write-Warn ""
            Write-Warn "The site is running on HTTP for now. To retry SSL later:"
            Write-Warn "  powershell -ExecutionPolicy Bypass -File nginx-ssl-install.ps1 -SkipBuild -SkipSsl:$false"
        }
    }
} else {
    Write-Warn "-SkipSsl set -- skipping Let's Encrypt certificate request"
    Write-Warn "Site is serving over HTTP only. Re-run without -SkipSsl to add SSL."
}

# ===========================================================
# HEALTH CHECK
# ===========================================================
Write-Host ""
Write-Info "Running health check..."
Start-Sleep -Seconds 3

$apiOk  = $false
$httpOk = $false
$sslOk  = $false

try {
    $r = Invoke-WebRequest -Uri "http://localhost:$($Config.ApiPort)/api/hotels" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($r.StatusCode -in 200, 304) { $apiOk = $true }
} catch { }

try {
    $r = Invoke-WebRequest -Uri "http://localhost:80/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $httpOk = $true
} catch { }

$certChainFinal = Join-Path $SslDir "$($Config.Domain)-chain.pem"
if ((Test-Path $certChainFinal) -and -not $SkipSsl) {
    try {
        $r = Invoke-WebRequest -Uri "https://$($Config.Domain)/" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $sslOk = $true
    } catch { }
}

# ===========================================================
# SUMMARY
# ===========================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor $(if ($apiOk) { "Green" } else { "Yellow" })
Write-Host "  MAISON DELUXE installation complete!"     -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor DarkGray
Write-Host ""
if ($apiOk)  { Write-OK  "API server   : http://localhost:$($Config.ApiPort) -- HEALTHY" }
else         { Write-Warn "API server   : http://localhost:$($Config.ApiPort) -- not responding yet" }
if ($httpOk) { Write-OK  "HTTP         : http://$($Config.Domain) -- UP" }
else         { Write-Warn "HTTP (nginx) : not responding on port 80" }
if ($sslOk)  { Write-OK  "HTTPS        : https://$($Config.Domain) -- UP" }
elseif (Test-Path $certChainFinal) { Write-Warn "HTTPS        : cert present but HTTPS check failed -- check nginx logs" }
else         { Write-Warn "HTTPS        : SSL certificate not yet obtained" }
Write-OK  "Install log  : $LogFile"
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor DarkGray
Write-Host "    View nginx error log : Get-Content '$NginxDir\logs\error.log' -Tail 30" -ForegroundColor DarkGray
Write-Host "    View API log         : Get-Content '$LogDir\GrandPalaceAPI-out.log' -Tail 30" -ForegroundColor DarkGray
Write-Host "    Reload nginx config  : & '$nginxExe' -s reload -c '$nginxConfPath' -p '$NginxDir'" -ForegroundColor DarkGray
Write-Host "    Restart API service  : Restart-Service GrandPalaceAPI" -ForegroundColor DarkGray
Write-Host "    Restart nginx        : Restart-Service GrandPalaceNginx" -ForegroundColor DarkGray
Write-Host "    Re-run SSL only      : powershell -ExecutionPolicy Bypass -File nginx-ssl-install.ps1 -SkipBuild" -ForegroundColor DarkGray
Write-Host ""

Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
