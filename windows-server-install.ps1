#Requires -RunAsAdministrator
# Grand Palace Hotels & Resorts - Windows Server Installer
# Compatible with Windows Server 2019 / 2022
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File windows-server-install.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ===========================================================
# CONFIGURATION - Edit these values before running
# ===========================================================
$Config = @{
    # Where the app will be installed
    InstallDir          = "C:\GrandPalace"

    # API back-end port
    ApiPort             = 8080

    # Front-end port (open this in your firewall)
    FrontendPort        = 3000

    # PostgreSQL settings
    PgSuperPassword     = "ChangeMe123!"
    PgDbName            = "grandpalace"
    PgDbUser            = "grandpalace"
    PgDbPassword        = "ChangeMe456!"

    # Clerk authentication keys (https://dashboard.clerk.com)
    ClerkPublishableKey = "pk_live_REPLACE_WITH_YOUR_KEY"
    ClerkSecretKey      = "sk_live_REPLACE_WITH_YOUR_SECRET"

    # Versions
    NodeVersion         = "22.14.0"
    PgVersion           = "16"
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

function Invoke-Download([string]$url, [string]$dest) {
    Write-Info "Downloading: $url"
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $dest)
}

function Test-CommandExists([string]$cmd) {
    return ($null -ne (Get-Command $cmd -ErrorAction SilentlyContinue))
}

function Update-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path    = $machinePath + ";" + $userPath
}

$TempDir = Join-Path $env:TEMP "GrandPalaceSetup"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# ===========================================================
# 1. NODE.JS
# ===========================================================
Write-Step "Step 1: Node.js $($Config.NodeVersion)"

if (Test-CommandExists "node") {
    $v = (node --version 2>&1).ToString().TrimStart("v")
    Write-OK "Node.js already installed: v$v"
} else {
    $nodeInstaller = Join-Path $TempDir "node-installer.msi"
    $nodeUrl = "https://nodejs.org/dist/v" + $Config.NodeVersion + "/node-v" + $Config.NodeVersion + "-x64.msi"
    Invoke-Download $nodeUrl $nodeInstaller
    Write-Info "Installing Node.js silently..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeInstaller`" /qn /norestart ADDLOCAL=ALL" -Wait -NoNewWindow
    Update-EnvPath
    Write-OK "Node.js $($Config.NodeVersion) installed"
}

# ===========================================================
# 2. PNPM
# ===========================================================
Write-Step "Step 2: pnpm"

if (Test-CommandExists "pnpm") {
    Write-OK "pnpm already installed: $(pnpm --version)"
} else {
    Write-Info "Installing pnpm via npm..."
    & npm install -g pnpm | Out-Null
    Update-EnvPath
    Write-OK "pnpm installed: $(pnpm --version)"
}

# ===========================================================
# 3. POSTGRESQL
# ===========================================================
Write-Step "Step 3: PostgreSQL $($Config.PgVersion)"

$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-OK "PostgreSQL already installed: $($pgService.Name)"
    $pgBinSearch = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory -ErrorAction SilentlyContinue
    if ($pgBinSearch) {
        $pgBin = ($pgBinSearch | Select-Object -First 1).FullName
    }
} else {
    $pgInstaller = Join-Path $TempDir "pg-installer.exe"
    $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-" + $Config.PgVersion + ".4-1-windows-x64.exe"
    Invoke-Download $pgUrl $pgInstaller
    Write-Info "Installing PostgreSQL silently (this takes a few minutes)..."
    $pgArgs = "--mode unattended --unattendedmodeui none --superpassword " + $Config.PgSuperPassword + " --serverport 5432"
    Start-Process $pgInstaller -ArgumentList $pgArgs -Wait -NoNewWindow
    Update-EnvPath
    $pgBin = "C:\Program Files\PostgreSQL\" + $Config.PgVersion + "\bin"
    Write-OK "PostgreSQL $($Config.PgVersion) installed"
}

if ($pgBin -and (Test-Path $pgBin)) {
    $env:Path = $env:Path + ";" + $pgBin
}

# ===========================================================
# 4. CREATE DATABASE
# ===========================================================
Write-Step "Step 4: Database setup"

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

$DatabaseUrl = "postgresql://" + $Config.PgDbUser + ":" + $Config.PgDbPassword + "@localhost:5432/" + $Config.PgDbName

# ===========================================================
# 5. COPY APP FILES
# ===========================================================
Write-Step "Step 5: Copying application files"

if (-not (Test-Path $Config.InstallDir)) {
    New-Item -ItemType Directory -Force -Path $Config.InstallDir | Out-Null
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Info "Copying from '$scriptDir' to '$($Config.InstallDir)'..."

robocopy $scriptDir $Config.InstallDir /E /XD ".git" "node_modules" "dist" ".replit-artifact" /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "File copy failed (robocopy exit code $LASTEXITCODE)." }
Write-OK "Files copied"

# ===========================================================
# 6. WRITE .ENV FILE
# ===========================================================
Write-Step "Step 6: Writing environment config"

$envFile = Join-Path $Config.InstallDir ".env"
$envContent = @(
    "DATABASE_URL=" + $DatabaseUrl,
    "CLERK_PUBLISHABLE_KEY=" + $Config.ClerkPublishableKey,
    "CLERK_SECRET_KEY=" + $Config.ClerkSecretKey,
    "VITE_CLERK_PUBLISHABLE_KEY=" + $Config.ClerkPublishableKey,
    "PORT=" + $Config.ApiPort,
    "FRONTEND_PORT=" + $Config.FrontendPort,
    "BASE_PATH=/",
    "NODE_ENV=production"
)
$envContent | Set-Content -Path $envFile -Encoding UTF8
Write-OK ".env written to $envFile"

# Load env vars into this session
foreach ($line in $envContent) {
    if ($line -match "^([^=]+)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}

# ===========================================================
# 7. PATCH package.json FOR WINDOWS COMPATIBILITY
# ===========================================================
Write-Step "Step 7: Patching package.json for Windows"

$rootPkg = Join-Path $Config.InstallDir "package.json"
$pkgJson = Get-Content $rootPkg -Raw | ConvertFrom-Json

if ($pkgJson.scripts.PSObject.Properties.Name -contains "preinstall") {
    $pkgJson.scripts.PSObject.Properties.Remove("preinstall")
    $pkgJson | ConvertTo-Json -Depth 10 | Set-Content $rootPkg -Encoding UTF8
    Write-OK "Removed Linux-only preinstall script from package.json"
} else {
    Write-OK "No preinstall script found, nothing to patch"
}

# ===========================================================
# 8. PATCH pnpm-workspace.yaml FOR WINDOWS
# ===========================================================
Write-Step "Step 8: Patching pnpm-workspace.yaml for Windows"

$wsYaml = Join-Path $Config.InstallDir "pnpm-workspace.yaml"
$lines = Get-Content $wsYaml
$filtered = $lines | Where-Object { $_ -notmatch '^\s+"[^"]+>.*":\s+[''"]-[''"]' }
$filtered | Set-Content $wsYaml -Encoding UTF8
Write-OK "Removed Linux-only platform exclusions from pnpm-workspace.yaml"

# ===========================================================
# 9. INSTALL & BUILD
# ===========================================================
Write-Step "Step 9: Installing dependencies (may take several minutes)"

Push-Location $Config.InstallDir

$lockFile = Join-Path $Config.InstallDir "pnpm-lock.yaml"
if (Test-Path $lockFile) {
    Write-Info "Removing Linux lockfile so pnpm resolves Windows-native binaries..."
    Remove-Item $lockFile -Force
}

Write-Info "Running pnpm install..."
& pnpm install
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed." }
Write-OK "Dependencies installed"

Write-Info "Applying database schema..."
& pnpm --filter "@workspace/db" run push
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN] DB push had warnings - may be OK if schema already exists" -ForegroundColor Yellow
} else {
    Write-OK "Database schema applied"
}

$apiDist = Join-Path $Config.InstallDir "artifacts\api-server\dist\index.mjs"
if (Test-Path $apiDist) {
    Write-OK "API server already built, skipping"
} else {
    Write-Info "Building API server..."
    & pnpm --filter "@workspace/api-server" run build
    if ($LASTEXITCODE -ne 0) { throw "API server build failed." }
    Write-OK "API server built"
}

$frontendDist = Join-Path $Config.InstallDir "artifacts\hotel-system\dist\index.html"
if (Test-Path $frontendDist) {
    Write-OK "Frontend already built, skipping"
} else {
    Write-Info "Building frontend..."
    & pnpm --filter "@workspace/hotel-system" run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }
    Write-OK "Frontend built"
}

Pop-Location

# ===========================================================
# 9. WINDOWS SERVICES (NSSM)
# ===========================================================
Write-Step "Step 9: Installing Windows Services"

$nssmPath = Join-Path $TempDir "nssm.exe"
if (-not (Test-Path $nssmPath)) {
    $nssmZipUrl = "https://nssm.cc/release/nssm-2.24.zip"
    $nssmZip    = Join-Path $TempDir "nssm.zip"
    Invoke-Download $nssmZipUrl $nssmZip
    Expand-Archive -Path $nssmZip -DestinationPath $TempDir -Force
    $nssmExe = Get-ChildItem -Path $TempDir -Filter "nssm.exe" -Recurse | Where-Object { $_.FullName -like "*win64*" } | Select-Object -First 1
    Copy-Item $nssmExe.FullName $nssmPath
}

New-Item -ItemType Directory -Force -Path (Join-Path $Config.InstallDir "logs") | Out-Null
$nodePath = (Get-Command node).Source

function Install-NssmService {
    param(
        [string]$svcName,
        [string]$displayName,
        [string]$exe,
        [string]$exeArgs,
        [string[]]$envLines
    )

    $existing = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Info "Removing old service: $svcName"
        & $nssmPath stop $svcName 2>&1 | Out-Null
        & $nssmPath remove $svcName confirm 2>&1 | Out-Null
        Start-Sleep -Seconds 2
    }

    & $nssmPath install $svcName $exe $exeArgs
    & $nssmPath set $svcName DisplayName $displayName
    & $nssmPath set $svcName Description "Grand Palace Hotels & Resorts - $displayName"
    & $nssmPath set $svcName AppDirectory $Config.InstallDir
    & $nssmPath set $svcName Start SERVICE_AUTO_START
    & $nssmPath set $svcName AppStdout (Join-Path $Config.InstallDir "logs\$svcName-out.log")
    & $nssmPath set $svcName AppStderr (Join-Path $Config.InstallDir "logs\$svcName-err.log")
    & $nssmPath set $svcName AppRotateFiles 1
    & $nssmPath set $svcName AppRotateBytes 10485760

    foreach ($envLine in $envLines) {
        & $nssmPath set $svcName AppEnvironmentExtra $envLine
    }

    Write-OK "Service registered: $svcName"
}

$apiDistPath = Join-Path $Config.InstallDir "artifacts\api-server\dist\index.mjs"
Install-NssmService `
    -svcName     "GrandPalaceAPI" `
    -displayName "Grand Palace - API Server" `
    -exe         $nodePath `
    -exeArgs     "--enable-source-maps `"$apiDistPath`"" `
    -envLines    @(
        "PORT=" + $Config.ApiPort,
        "DATABASE_URL=" + $DatabaseUrl,
        "CLERK_SECRET_KEY=" + $Config.ClerkSecretKey,
        "NODE_ENV=production"
    )

$vitePath = Join-Path $Config.InstallDir "node_modules\.bin\vite.cmd"
$viteConfig = Join-Path $Config.InstallDir "artifacts\hotel-system\vite.config.ts"
Install-NssmService `
    -svcName     "GrandPalaceFrontend" `
    -displayName "Grand Palace - Frontend" `
    -exe         "cmd.exe" `
    -exeArgs     "/c `"$vitePath`" preview --config `"$viteConfig`" --host 0.0.0.0 --port $($Config.FrontendPort)" `
    -envLines    @(
        "PORT=" + $Config.FrontendPort,
        "BASE_PATH=/",
        "VITE_CLERK_PUBLISHABLE_KEY=" + $Config.ClerkPublishableKey,
        "NODE_ENV=production"
    )

# ===========================================================
# 10. START SERVICES
# ===========================================================
Write-Step "Step 10: Starting services"

Start-Service -Name "GrandPalaceAPI"
Start-Sleep -Seconds 3
Start-Service -Name "GrandPalaceFrontend"
Start-Sleep -Seconds 3

$apiStatus      = (Get-Service -Name "GrandPalaceAPI").Status
$frontendStatus = (Get-Service -Name "GrandPalaceFrontend").Status

Write-OK "GrandPalaceAPI:      $apiStatus"
Write-OK "GrandPalaceFrontend: $frontendStatus"

# ===========================================================
# 11. FIREWALL
# ===========================================================
Write-Step "Step 11: Firewall rules"

netsh advfirewall firewall add rule name="Grand Palace API" dir=in action=allow protocol=TCP localport=$($Config.ApiPort) | Out-Null
netsh advfirewall firewall add rule name="Grand Palace Frontend" dir=in action=allow protocol=TCP localport=$($Config.FrontendPort) | Out-Null
Write-OK "Firewall rules added for ports $($Config.ApiPort) and $($Config.FrontendPort)"

# ===========================================================
# DONE
# ===========================================================
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://localhost:$($Config.FrontendPort)/"
Write-Host "  API      : http://localhost:$($Config.ApiPort)/api/"
Write-Host ""
Write-Host "  Services (auto-start on reboot):"
Write-Host "    GrandPalaceAPI      - API back-end"
Write-Host "    GrandPalaceFrontend - Frontend"
Write-Host ""
Write-Host "  Logs : $($Config.InstallDir)\logs\"
Write-Host ""
Write-Host "  IMPORTANT: Edit Clerk keys in $envFile if not already set." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to close"
