#Requires -RunAsAdministrator
# ============================================================
# MAISON DELUXE Hotels & Resorts -- Windows Server Installer
# Domain : maisondeluxehotel.com
# SSL    : Let's Encrypt (win-acme), tu dong gia han
# Ports  : 80 (HTTP -> redirect HTTPS), 443 (HTTPS)
# Architecture:
#   Internet --> nginx :80/:443 --> /api/* --> Node API :8080 (internal)
#                                --> /*     --> Static files (built frontend)
#
# HOW TO RUN (PowerShell as Administrator):
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#
# OPTIONAL FLAGS:
#   -Reinstall   Force clean reinstall
#   -SkipBuild   Bo qua npm build (chi update config)
#   -SkipSsl     Cai nginx HTTP-only (port 80, khong cai HTTPS)
#   -Uninstall   Stop + xoa toan bo services
# ============================================================
# SSL: Script CHI dung cert da cai san tai $SslDir (Positive SSL tu VPS).
# Khong tich hop Let's Encrypt - moi cap nhat cert do nha cung cap VPS xu ly.

param(
    [switch]$Reinstall,
    [switch]$SkipBuild,
    [switch]$SkipSsl,
    [switch]$NoWww,
    [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================
# CONFIGURATION - load tu install.config.ps1 (gitignored)
# ============================================================
$ConfigFile = Join-Path $PSScriptRoot "install.config.ps1"
if (-not (Test-Path $ConfigFile)) {
    Write-Host ""
    Write-Host "  LOI: Khong tim thay $ConfigFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Cach khac phuc:" -ForegroundColor Yellow
    Write-Host "    1. Copy-Item install.config.example.ps1 install.config.ps1"
    Write-Host "    2. notepad install.config.ps1   # dien thong tin that"
    Write-Host "    3. Chay lai: powershell -ExecutionPolicy Bypass -File .\install.ps1"
    Write-Host ""
    exit 1
}
. $ConfigFile
if (-not $Config) { Write-Host "  LOI: install.config.ps1 khong dinh nghia $Config" -ForegroundColor Red; exit 1 }

$LogFile  = Join-Path $env:TEMP ("MaisonDeluxe_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".log")
$TempDir  = Join-Path $env:TEMP "MaisonDeluxeSetup"
$LogDir   = Join-Path $Config.InstallDir "logs"
$NginxDir = Join-Path $Config.InstallDir "nginx"
$SslDir   = Join-Path $Config.InstallDir "ssl"
$AcmeRoot = Join-Path $Config.InstallDir "acme-challenge"
$WacsDir  = Join-Path $TempDir "wacs"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
Start-Transcript -Path $LogFile -Append -ErrorAction SilentlyContinue | Out-Null
Write-Host "  Install log: $LogFile" -ForegroundColor DarkGray

# ============================================================
# HELPERS
# ============================================================
function Write-Step([string]$n, [string]$msg) {
    Write-Host ""; Write-Host "[$n] $msg" -ForegroundColor Cyan
    Write-Host "    ---------------------------------------------------" -ForegroundColor DarkGray
}
function Write-OK([string]$m)   { Write-Host "  [OK] $m"    -ForegroundColor Green }
function Write-Info([string]$m) { Write-Host "  --> $m"     -ForegroundColor Yellow }
function Write-Warn([string]$m) { Write-Host "  [!] $m"     -ForegroundColor DarkYellow }
function Write-Err([string]$m)  { Write-Host "  [ERROR] $m" -ForegroundColor Red }

function Fail([string]$msg) {
    Write-Err $msg
    Write-Err "Full log: $LogFile"
    Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
    throw $msg
}

function Invoke-Download([string]$url, [string]$dest) {
    Write-Info "Downloading: $url"
    try { (New-Object System.Net.WebClient).DownloadFile($url, $dest) }
    catch { Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop }
}

function Test-CommandExists([string]$cmd) {
    return ($null -ne (Get-Command $cmd -ErrorAction SilentlyContinue))
}

function Update-EnvPath {
    $m = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $u = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$m;$u"
}

function To-NginxPath([string]$p) { return $p.Replace("\", "/") }

# Run native command an toan: stderr KHONG bi coi la loi
function Invoke-NativeSafe([string]$exe, [string[]]$args) {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $LASTEXITCODE = 0
    $out = $null
    try {
        $out = & $exe @args 2>&1 | ForEach-Object { "$_" }
    } catch {
        $out = $_.Exception.Message
    }
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    return [pscustomobject]@{ Output = $out; ExitCode = $code }
}

# ============================================================
# UNINSTALL MODE
# ============================================================
if ($Uninstall) {
    Write-Host ""; Write-Host "=== UNINSTALL MODE ===" -ForegroundColor Red
    $nssmU = Join-Path $TempDir "nssm.exe"
    foreach ($svc in @("MaisonDeluxeAPI", "MaisonDeluxeNginx")) {
        $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($s) {
            Write-Info "Stopping/removing: $svc"
            try { Stop-Service -Name $svc -Force -ErrorAction SilentlyContinue } catch {}
            Start-Sleep -Seconds 2
            if (Test-Path $nssmU) { & $nssmU remove $svc confirm 2>&1 | Out-Null }
            else { sc.exe delete $svc | Out-Null }
            Write-OK "Removed: $svc"
        }
    }
    foreach ($rule in @("MAISON DELUXE HTTP", "MAISON DELUXE HTTPS")) {
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

New-Item -ItemType Directory -Force -Path $Config.InstallDir, $LogDir, $NginxDir, $SslDir, $AcmeRoot | Out-Null

# ============================================================
# STEP 1 -- SYSTEM CHECK
# ============================================================
Write-Step "1/12" "System requirements"
$os = Get-CimInstance Win32_OperatingSystem
Write-Info "OS: $($os.Caption) (Build $($os.BuildNumber))"
if ([int]$os.BuildNumber -lt 17763) { Fail "Windows Server 2019+ (build 17763+) required." }
Write-OK "OS OK"

$ramGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($ramGB -lt $Config.MinRamGB) { Fail "Need >= $($Config.MinRamGB) GB RAM. Have: $ramGB GB" }
Write-OK "RAM: $ramGB GB"

$drive = (Split-Path $Config.InstallDir -Qualifier).TrimEnd(":")
$d = Get-PSDrive -Name $drive -ErrorAction SilentlyContinue
if ($d) {
    $freeGB = [math]::Round($d.Free / 1GB, 1)
    if ($freeGB -lt $Config.MinDiskGB) { Fail "Need >= $($Config.MinDiskGB) GB free. Have: $freeGB GB" }
    Write-OK "Disk free: $freeGB GB"
}
Write-OK "Domain: $($Config.Domain)"

# ============================================================
# STEP 2 -- NODE.JS
# ============================================================
Write-Step "2/12" "Node.js (>= v$($Config.NodeMinMajor))"
$nodeOk = $false
if (Test-CommandExists "node") {
    $rawVer = (node --version 2>&1).ToString().TrimStart("v")
    $major  = [int]($rawVer.Split(".")[0])
    if ($major -ge $Config.NodeMinMajor -and -not $Reinstall) {
        Write-OK "Node already installed: v$rawVer"; $nodeOk = $true
    } else { Write-Warn "Upgrading Node v$rawVer -> v$($Config.NodeVersion)" }
}
if (-not $nodeOk) {
    $msi = Join-Path $TempDir "node.msi"
    Invoke-Download "https://nodejs.org/dist/v$($Config.NodeVersion)/node-v$($Config.NodeVersion)-x64.msi" $msi
    Write-Info "Installing Node.js $($Config.NodeVersion)..."
    Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart ADDLOCAL=ALL" -Wait -NoNewWindow
    Update-EnvPath
    if (-not (Test-CommandExists "node")) { Fail "Node not found after install." }
    Write-OK "Node.js $($Config.NodeVersion) installed"
}

# ============================================================
# STEP 3 -- PNPM
# ============================================================
Write-Step "3/12" "pnpm"
if ((Test-CommandExists "pnpm") -and (-not $Reinstall)) {
    Write-OK "pnpm already installed: $(pnpm --version)"
} else {
    Write-Info "Installing pnpm..."
    & npm install -g pnpm
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed." }
    Update-EnvPath
    Write-OK "pnpm installed: $(pnpm --version)"
}

# ============================================================
# STEP 4 -- DATABASE URL
# ============================================================
Write-Step "4/12" "Database"
$DatabaseUrl = ""
$NeonDatabaseUrl = ""
if ($Config.UseLocalPg) {
    Fail "Local Postgres mode khong duoc cau hinh trong script nay. Dat UseLocalPg=`$false va dien NeonDatabaseUrl."
} else {
    if ([string]::IsNullOrWhiteSpace($Config.NeonDatabaseUrl)) { Fail "NeonDatabaseUrl trong Config bi trong." }
    $DatabaseUrl     = $Config.NeonDatabaseUrl
    $NeonDatabaseUrl = $Config.NeonDatabaseUrl
    Write-OK "Using remote Postgres (Neon)"
}

# ============================================================
# STEP 5 -- COPY PROJECT SOURCE
# ============================================================
Write-Step "5/12" "Copy project source"
$srcRoot = $PSScriptRoot
$dstRoot = Join-Path $Config.InstallDir "app"
if (-not (Test-Path (Join-Path $srcRoot "package.json"))) {
    Fail "Khong tim thay package.json o $srcRoot. Hay dat install.ps1 cung thu muc voi project."
}
if (Test-Path $dstRoot) {
    if ($Reinstall) {
        Write-Info "Reinstall: xoa $dstRoot"
        Remove-Item $dstRoot -Recurse -Force
    }
}
New-Item -ItemType Directory -Force -Path $dstRoot | Out-Null
Write-Info "Copying source -> $dstRoot (bo qua node_modules, .git, dist)"
$exclude = @("node_modules", ".git", "dist", ".turbo", ".next", "logs")
robocopy $srcRoot $dstRoot /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 /XD $exclude | Out-Null
if ($LASTEXITCODE -ge 8) { Fail "robocopy failed (code $LASTEXITCODE)" }
Write-OK "Source copied"

# ============================================================
# STEP 6 -- INSTALL DEPS + BUILD
# ============================================================
Write-Step "6/12" "pnpm install + build"
Push-Location $dstRoot
try {
    Write-Info "pnpm install (frozen lockfile)..."
    & pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "frozen-lockfile failed, retry without..."
        & pnpm install
        if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed" }
    }
    Write-OK "Dependencies installed"

    if (-not $SkipBuild) {
        Write-Info "Building API..."
        & pnpm --filter "@workspace/api-server" run build
        if ($LASTEXITCODE -ne 0) { Fail "API build failed" }
        Write-OK "API built"

        Write-Info "Building hotel-system frontend..."
        $env:BASE_PATH = "/"
        # CRITICAL: Vite inline VITE_* vars vao bundle TAI BUILD TIME.
        # Neu khong set, ClerkProvider se nhan key rong va react crash -> trang trang.
        $env:VITE_CLERK_PUBLISHABLE_KEY = $Config.ClerkPublishableKey
        & pnpm --filter "@workspace/hotel-system" run build
        if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed" }
        Write-OK "Frontend built"
    } else {
        Write-Info "Skipping build (-SkipBuild)"
    }

    # ----------------------------------------------------------
    # Sync schema voi Neon (idempotent - chi them cot/bang moi)
    # Bao gom: chat_sessions cot moi (ticket_number, priority, assignee_*),
    # bang chat_reply_templates (mau tra loi nhanh).
    # ----------------------------------------------------------
    Write-Info "Pushing schema to Neon (drizzle push --force)..."
    $env:NEON_DATABASE_URL = $NeonDatabaseUrl
    $env:DATABASE_URL      = $DatabaseUrl
    & pnpm --filter "@workspace/db" run push-force
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "DB push failed - kiem tra ket noi Neon (script van tiep tuc)."
    } else {
        Write-OK "DB schema synced to Neon"
    }

    # ----------------------------------------------------------
    # Seed superadmin role vao bang user_roles tren Neon.
    # Nho buoc nay tai khoan Clerk SuperAdminClerkId moi vao duoc admin
    # (middleware requireAdmin tra cuu role tu DB).
    # ----------------------------------------------------------
    if (-not [string]::IsNullOrWhiteSpace($Config.SuperAdminClerkId)) {
        Write-Info "Seeding superadmin role: $($Config.SuperAdminEmail)"
        $env:SEED_CLERK_ID = $Config.SuperAdminClerkId
        # Seed script song trong repo: scripts/install/seed-admin.mjs (tranh escaping rac roi).
        $seedFile = Join-Path $dstRoot "scripts\install\seed-admin.mjs"
        if (-not (Test-Path $seedFile)) {
            Write-Warn "Khong tim thay $seedFile - bo qua seed admin"
            $seedFile = $null
        }
        $env:SEED_EMAIL    = $Config.SuperAdminEmail
        $env:SEED_NAME     = $Config.SuperAdminName
        if ($seedFile) {
            # Chay node tu thu muc lib/db de tim duoc package "pg" da cai trong workspace.
            Push-Location (Join-Path $dstRoot "lib\db")
            try {
                & node $seedFile
                if ($LASTEXITCODE -ne 0) {
                    Write-Warn "Seed admin failed - neu can chay tay:"
                    Write-Warn "  cd $dstRoot\lib\db; node $seedFile"
                } else {
                    Write-OK "Superadmin role da duoc seed/cap nhat"
                }
            } finally {
                Pop-Location
            }
        }
    } else {
        Write-Info "Bo qua seed admin (SuperAdminClerkId trong Config bi trong)"
    }
} finally { Pop-Location }

# Resolve built paths
$apiDistPath = Join-Path $dstRoot "artifacts\api-server\dist\index.mjs"
$frontendDistPath = Join-Path $dstRoot "artifacts\hotel-system\dist\public"
if (-not (Test-Path $apiDistPath)) { Fail "API dist not found: $apiDistPath" }
if (-not (Test-Path $frontendDistPath)) { Fail "Frontend dist not found: $frontendDistPath" }

# ============================================================
# STEP 7 -- NSSM
# ============================================================
Write-Step "7/12" "NSSM (service manager)"
$nssmExe = Join-Path $TempDir "nssm.exe"
if (-not (Test-Path $nssmExe)) {
    $nssmZip = Join-Path $TempDir "nssm.zip"
    Invoke-Download "https://nssm.cc/release/nssm-2.24.zip" $nssmZip
    Expand-Archive -Path $nssmZip -DestinationPath $TempDir -Force
    $found = Get-ChildItem $TempDir -Recurse -Filter "nssm.exe" |
             Where-Object { $_.FullName -match "win64" } | Select-Object -First 1
    if (-not $found) { Fail "nssm.exe (win64) khong tim thay" }
    Copy-Item $found.FullName $nssmExe -Force
}
Write-OK "NSSM ready: $nssmExe"

# ============================================================
# STEP 8 -- NGINX
# ============================================================
Write-Step "8/12" "nginx $($Config.NginxVersion)"
$nginxExe = Join-Path $NginxDir "nginx.exe"
if ((-not (Test-Path $nginxExe)) -or $Reinstall) {
    $nginxZip = Join-Path $TempDir "nginx.zip"
    Invoke-Download "https://nginx.org/download/nginx-$($Config.NginxVersion).zip" $nginxZip
    if (Test-Path $NginxDir) { Remove-Item $NginxDir -Recurse -Force }
    $extractDir = Join-Path $TempDir "nginx_extract"
    if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
    Expand-Archive -Path $nginxZip -DestinationPath $extractDir -Force
    $sub = Get-ChildItem $extractDir -Directory | Select-Object -First 1
    Move-Item $sub.FullName $NginxDir
    Write-OK "nginx extracted -> $NginxDir"
} else {
    Write-OK "nginx already installed"
}

$nginxLogDir = Join-Path $LogDir "nginx"
New-Item -ItemType Directory -Force -Path $nginxLogDir | Out-Null
$nginxConfPath = Join-Path $NginxDir "conf\nginx.conf"
$nginxFrontendRoot = To-NginxPath $frontendDistPath
$nginxLogDirPosix  = To-NginxPath $nginxLogDir
$nginxAcmeRoot     = To-NginxPath $AcmeRoot
$sslChain = Join-Path $SslDir "$($Config.Domain)-chain.pem"
$sslKey   = Join-Path $SslDir "$($Config.Domain)-key.pem"
$sslChainPosix = To-NginxPath $sslChain
$sslKeyPosix   = To-NginxPath $sslKey

function Write-NginxConf([bool]$includeSsl) {
    $serverName = "$($Config.Domain) www.$($Config.Domain)"
    $apiPort    = "$($Config.ApiPort)"

    $sslTpl = @'
    # HTTP -> HTTPS redirect (van phuc vu ACME challenge truoc)
    server {
        listen      80;
        server_name __SERVER_NAME__;

        location /.well-known/acme-challenge/ {
            root __ACME_ROOT__;
            default_type "text/plain";
        }

        location / { return 301 https://$host$request_uri; }
    }

    # HTTPS
    server {
        listen              443 ssl;
        http2               on;
        server_name         __SERVER_NAME__;

        ssl_certificate     __SSL_CHAIN__;
        ssl_certificate_key __SSL_KEY__;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 1d;

        location /api/chat/ws/ {
            proxy_pass             http://127.0.0.1:__API_PORT__/api/chat/ws/;
            proxy_http_version     1.1;
            proxy_set_header       Upgrade    $http_upgrade;
            proxy_set_header       Connection "upgrade";
            proxy_set_header       Host       $host;
            proxy_read_timeout     86400s;
            proxy_socket_keepalive on;
            proxy_buffering        off;
        }

        location /api/ {
            proxy_pass             http://127.0.0.1:__API_PORT__/api/;
            proxy_http_version     1.1;
            proxy_set_header       Host              $host;
            proxy_set_header       X-Real-IP         $remote_addr;
            proxy_set_header       X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header       X-Forwarded-Proto https;
            proxy_read_timeout     60s;
            proxy_buffering        off;
        }

        location / {
            root       __FRONTEND_ROOT__;
            try_files  $uri $uri/ /index.html;
            expires    1h;
            add_header Cache-Control "public, no-transform";
        }

        location = /index.html {
            root       __FRONTEND_ROOT__;
            expires    -1;
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
'@

    $httpTpl = @'
    # HTTP-only (phuc vu ACME challenge va cac request thuong)
    server {
        listen      80;
        server_name __SERVER_NAME__;

        location /.well-known/acme-challenge/ {
            root __ACME_ROOT__;
            default_type "text/plain";
        }

        location /api/chat/ws/ {
            proxy_pass             http://127.0.0.1:__API_PORT__/api/chat/ws/;
            proxy_http_version     1.1;
            proxy_set_header       Upgrade    $http_upgrade;
            proxy_set_header       Connection "upgrade";
            proxy_set_header       Host       $host;
            proxy_read_timeout     86400s;
        }

        location /api/ {
            proxy_pass             http://127.0.0.1:__API_PORT__/api/;
            proxy_http_version     1.1;
            proxy_set_header       Host              $host;
            proxy_set_header       X-Real-IP         $remote_addr;
            proxy_set_header       X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header       X-Forwarded-Proto http;
        }

        location / {
            root       __FRONTEND_ROOT__;
            try_files  $uri $uri/ /index.html;
        }
    }
'@

    $baseTpl = @'
# Bat buoc voi NSSM: chay foreground
daemon off;

worker_processes  auto;
error_log  __LOG_DIR__/error.log warn;
pid        __LOG_DIR__/nginx.pid;

events {
    worker_connections 1024;
    use                select;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
    access_log  __LOG_DIR__/access.log  main;

    sendfile             on;
    tcp_nopush           on;
    tcp_nodelay          on;
    keepalive_timeout    65;
    client_max_body_size 50m;
    server_tokens        off;

__SERVER_BLOCKS__
}
'@

    if ($includeSsl) { $serverBlocks = $sslTpl } else { $serverBlocks = $httpTpl }

    $serverBlocks = $serverBlocks.Replace('__SERVER_NAME__', $serverName)
    $serverBlocks = $serverBlocks.Replace('__ACME_ROOT__', $nginxAcmeRoot)
    $serverBlocks = $serverBlocks.Replace('__SSL_CHAIN__', $sslChainPosix)
    $serverBlocks = $serverBlocks.Replace('__SSL_KEY__', $sslKeyPosix)
    $serverBlocks = $serverBlocks.Replace('__API_PORT__', $apiPort)
    $serverBlocks = $serverBlocks.Replace('__FRONTEND_ROOT__', $nginxFrontendRoot)

    $conf = $baseTpl
    $conf = $conf.Replace('__LOG_DIR__', $nginxLogDirPosix)
    $conf = $conf.Replace('__SERVER_BLOCKS__', $serverBlocks)

    [System.IO.File]::WriteAllText($nginxConfPath, $conf, $utf8NoBom)
}

# Ghi config HTTP-only truoc (de nginx start phuc vu ACME challenge)
Write-NginxConf -includeSsl $false
Write-Info "Testing nginx configuration..."
$ng = Invoke-NativeSafe $nginxExe @("-t", "-c", $nginxConfPath, "-p", $NginxDir)
if ($ng.ExitCode -ne 0) { Fail "nginx config test failed (exit $($ng.ExitCode)):`n$($ng.Output -join "`n")" }
Write-OK "nginx config OK"
$ng.Output | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

# ============================================================
# STEP 9 -- WINDOWS SERVICES
# ============================================================
Write-Step "9/12" "Windows services"

function Install-NssmService {
    param(
        [string]$SvcName, [string]$DisplayName,
        [string]$Application, [string]$AppParameters,
        [string]$WorkDir, [hashtable]$EnvVars
    )
    $existing = Get-Service -Name $SvcName -ErrorAction SilentlyContinue
    if ($existing) {
        try { Stop-Service -Name $SvcName -Force -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Seconds 2
        & $nssmExe remove $SvcName confirm 2>&1 | Out-Null
    }
    & $nssmExe install $SvcName $Application 2>&1 | Out-Null
    & $nssmExe set $SvcName AppParameters $AppParameters 2>&1 | Out-Null
    & $nssmExe set $SvcName AppDirectory  $WorkDir 2>&1 | Out-Null
    & $nssmExe set $SvcName DisplayName   $DisplayName 2>&1 | Out-Null
    & $nssmExe set $SvcName Start         SERVICE_AUTO_START 2>&1 | Out-Null
    & $nssmExe set $SvcName AppStdout     (Join-Path $LogDir "$SvcName-out.log") 2>&1 | Out-Null
    & $nssmExe set $SvcName AppStderr     (Join-Path $LogDir "$SvcName-err.log") 2>&1 | Out-Null
    & $nssmExe set $SvcName AppRotateFiles 1 2>&1 | Out-Null

    if ($EnvVars -and $EnvVars.Count -gt 0) {
        $envLines = @()
        foreach ($k in $EnvVars.Keys) { $envLines += "$k=$($EnvVars[$k])" }
        & $nssmExe set $SvcName AppEnvironmentExtra $envLines 2>&1 | Out-Null
    }
    Write-OK "Service installed: $SvcName"
}

$publicBase = if ($SkipSsl) { "http://$($Config.Domain)" } else { "https://$($Config.Domain)" }
$nodePath = (Get-Command node).Source

$apiEnv = @{
    NODE_ENV              = "production"
    PORT                  = "$($Config.ApiPort)"
    HOST                  = "127.0.0.1"
    DATABASE_URL          = $DatabaseUrl
    NEON_DATABASE_URL     = $NeonDatabaseUrl
    PUBLIC_BASE_URL       = $publicBase
    CORS_ORIGIN           = $publicBase
    CLERK_PUBLISHABLE_KEY = $Config.ClerkPublishableKey
    CLERK_SECRET_KEY      = $Config.ClerkSecretKey
    MOMO_PARTNER_CODE     = $Config.MomoPartnerCode
    MOMO_ACCESS_KEY       = $Config.MomoAccessKey
    MOMO_SECRET_KEY       = $Config.MomoSecretKey
    MOMO_ENDPOINT         = $Config.MomoEndpoint
}

Install-NssmService `
    -SvcName       "MaisonDeluxeAPI" `
    -DisplayName   "MAISON DELUXE - API Server" `
    -Application   $nodePath `
    -AppParameters "--enable-source-maps `"$apiDistPath`"" `
    -WorkDir       $dstRoot `
    -EnvVars       $apiEnv

Install-NssmService `
    -SvcName       "MaisonDeluxeNginx" `
    -DisplayName   "MAISON DELUXE - nginx" `
    -Application   $nginxExe `
    -AppParameters "-c `"$nginxConfPath`" -p `"$NginxDir`"" `
    -WorkDir       $NginxDir `
    -EnvVars       @{}

# ============================================================
# STEP 10 -- FIREWALL
# ============================================================
Write-Step "10/12" "Firewall"
netsh advfirewall firewall delete rule name="MAISON DELUXE HTTP"  2>&1 | Out-Null
netsh advfirewall firewall delete rule name="MAISON DELUXE HTTPS" 2>&1 | Out-Null
netsh advfirewall firewall add rule name="MAISON DELUXE HTTP"  dir=in action=allow protocol=TCP localport=80  | Out-Null
netsh advfirewall firewall add rule name="MAISON DELUXE HTTPS" dir=in action=allow protocol=TCP localport=443 | Out-Null
Write-OK "Ports 80 & 443 opened"

# ============================================================
# STEP 11 -- START SERVICES + HEALTH CHECK
# ============================================================
Write-Step "11/12" "Start services"
foreach ($svc in @("MaisonDeluxeAPI", "MaisonDeluxeNginx")) {
    Write-Info "Starting $svc..."
    Start-Service -Name $svc -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    $s = Get-Service -Name $svc
    if ($s.Status -ne "Running") {
        Write-Err "$svc failed to start (status: $($s.Status))"
        $errLog = Join-Path $LogDir "$svc-err.log"
        if (Test-Path $errLog) {
            Write-Host "  --- Last 20 lines of $svc-err.log ---" -ForegroundColor DarkRed
            Get-Content $errLog -Tail 20 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
        }
    } else { Write-OK "$svc Running" }
}

Write-Info "API health check: http://127.0.0.1:$($Config.ApiPort)/api/healthz"
$apiReady = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$($Config.ApiPort)/api/healthz" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -lt 400) { $apiReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 5
}
if ($apiReady) { Write-OK "API responding" } else { Write-Warn "API did not respond within 75s -- check $LogDir\MaisonDeluxeAPI-err.log" }

# ============================================================
# STEP 12 -- SSL (su dung cert co san, KHONG xin Let's Encrypt nua)
# ============================================================
# Neu 2 file PEM da ton tai trong $SslDir thi reload nginx voi cau hinh HTTPS.
# Neu khong, chay HTTP-only va in huong dan dat cert thu cong.
if ($SkipSsl) {
    Write-Step "12/12" "SSL skipped (-SkipSsl)"
    Write-Warn "Site dang chay HTTP-only tren cong 80."
} else {
    Write-Step "12/12" "SSL (cert co san)"
    if ((Test-Path $sslChain) -and (Test-Path $sslKey)) {
        Write-OK "Tim thay cert da co tren server:"
        Write-OK "  Chain: $sslChain"
        Write-OK "  Key  : $sslKey"

        Write-Info "Cap nhat nginx.conf voi SSL va reload..."
        Write-NginxConf -includeSsl $true

        $ng2 = Invoke-NativeSafe $nginxExe @("-t", "-c", $nginxConfPath, "-p", $NginxDir)
        if ($ng2.ExitCode -ne 0) { Fail "nginx SSL config test failed:`n$($ng2.Output -join "`n")" }
        Write-OK "nginx SSL config OK"

        Restart-Service MaisonDeluxeNginx -Force
        Start-Sleep -Seconds 3
        $s = Get-Service MaisonDeluxeNginx
        if ($s.Status -eq "Running") {
            Write-OK "nginx reloaded voi SSL -- truy cap https://$($Config.Domain)"
        } else {
            Write-Warn "nginx restart failed -- check log"
        }
    } else {
        Write-Warn "Khong tim thay cert tai $SslDir. Site se chay HTTP-only."
        Write-Warn "De bat HTTPS, dat 2 file vao $SslDir voi ten:"
        Write-Warn "  $($Config.Domain)-chain.pem  (full chain certificate)"
        Write-Warn "  $($Config.Domain)-key.pem    (private key)"
        Write-Warn "Sau do chay lai: install.ps1 -SkipBuild"
        Write-Warn ""
        Write-Warn "Hoac dung -SkipSsl de chay HTTP-only:"
        Write-Warn "  powershell -ExecutionPolicy Bypass -File .\install.ps1 -SkipBuild -SkipSsl"
    }
}

# ============================================================
# DONE
# ============================================================
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  CAI DAT HOAN TAT" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  Frontend : $publicBase" -ForegroundColor White
Write-Host "  API      : $publicBase/api/healthz" -ForegroundColor White
Write-Host "  Services : MaisonDeluxeAPI, MaisonDeluxeNginx" -ForegroundColor White
Write-Host "  Logs     : $LogDir" -ForegroundColor White
Write-Host "  Install  : $LogFile" -ForegroundColor White
Write-Host ""
Write-Host "Lenh thuong dung:" -ForegroundColor Cyan
Write-Host "  Restart API   : Restart-Service MaisonDeluxeAPI"   -ForegroundColor DarkGray
Write-Host "  Restart nginx : Restart-Service MaisonDeluxeNginx" -ForegroundColor DarkGray
Write-Host "  Xem log API   : Get-Content $LogDir\MaisonDeluxeAPI-out.log -Wait -Tail 50" -ForegroundColor DarkGray
Write-Host "  Uninstall     : powershell -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall" -ForegroundColor DarkGray
Write-Host ""

Stop-Transcript -ErrorAction SilentlyContinue | Out-Null
