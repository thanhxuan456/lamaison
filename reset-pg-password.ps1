#Requires -RunAsAdministrator
# Grand Palace - PostgreSQL Password Reset Tool
# Resets the 'postgres' superuser password back to the default.
#
# HOW TO RUN (as Administrator):
#   powershell -ExecutionPolicy Bypass -File reset-pg-password.ps1

$DefaultPassword = "ZeroCode123@#!~"

function Write-OK([string]$msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info([string]$msg) { Write-Host "  --> $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Grand Palace - PostgreSQL Password Reset" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PostgreSQL has TWO built-in accounts:" -ForegroundColor White
Write-Host ""
Write-Host "    Account 1 : postgres       (superuser, built into PostgreSQL)" -ForegroundColor White
Write-Host "    Account 2 : grandpalace    (app database user)" -ForegroundColor White
Write-Host ""
Write-Host "  These are NOT Windows accounts. They only exist inside PostgreSQL." -ForegroundColor Gray
Write-Host "  This tool resets BOTH accounts to the default password:" -ForegroundColor Gray
Write-Host ""
Write-Host "    New password: $DefaultPassword" -ForegroundColor Green
Write-Host ""
$confirm = Read-Host "  Type YES to reset passwords, anything else to cancel"
if ($confirm -ne "YES") {
    Write-Host "  Cancelled." -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 0
}

# ===========================================================
# Find PostgreSQL bin directory
# ===========================================================
$pgBinSearch = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "bin" -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName "psql.exe") } |
    Sort-Object FullName -Descending |
    Select-Object -First 1

if (-not $pgBinSearch) {
    Write-Host ""
    Write-Host "  [ERROR] PostgreSQL does not appear to be installed." -ForegroundColor Red
    Write-Host "  Run windows-server-install.ps1 first." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}
$pgBin = $pgBinSearch.FullName
$env:Path = $env:Path + ";" + $pgBin

# ===========================================================
# Find pg_hba.conf
# ===========================================================
$hbaFile = $null
$hbaSearch = Get-ChildItem "C:\Program Files\PostgreSQL" -Filter "pg_hba.conf" -Recurse -ErrorAction SilentlyContinue
if ($hbaSearch) {
    $hbaFile = ($hbaSearch | Select-Object -First 1).FullName
}

if (-not $hbaFile) {
    Write-Host "  [ERROR] Cannot find pg_hba.conf. Cannot reset password automatically." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Info "Found config: $hbaFile"

# ===========================================================
# Step 1 - Switch to trust mode so no password is needed
# ===========================================================
Write-Info "Temporarily switching PostgreSQL to no-password mode..."

$hbaBackup = $hbaFile + ".reset-bak"
Copy-Item $hbaFile $hbaBackup -Force

$trustRule = "host    all             all             127.0.0.1/32            trust"
$original  = Get-Content $hbaFile -Raw
Set-Content $hbaFile ($trustRule + "`n" + $original) -Encoding UTF8

$pgSvcName = (Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1).Name
if (-not $pgSvcName) {
    Write-Host "  [ERROR] PostgreSQL service not found. Is it installed?" -ForegroundColor Red
    Copy-Item $hbaBackup $hbaFile -Force
    Read-Host "Press Enter to close"
    exit 1
}

Restart-Service -Name $pgSvcName -Force
Start-Sleep -Seconds 5
Write-OK "PostgreSQL restarted in no-password mode"

# ===========================================================
# Step 2 - Reset both passwords
# ===========================================================
Write-Info "Resetting passwords..."

$env:PGPASSWORD = ""
$ErrorActionPreference = "Continue"

& "$pgBin\psql.exe" -U postgres -h 127.0.0.1 -c "ALTER USER postgres WITH PASSWORD '$DefaultPassword';" 2>&1 | Out-Null
& "$pgBin\psql.exe" -U postgres -h 127.0.0.1 -c "ALTER USER grandpalace WITH PASSWORD '$DefaultPassword';" 2>&1 | Out-Null

$ErrorActionPreference = "Stop"

# ===========================================================
# Step 3 - Restore original auth config
# ===========================================================
Write-Info "Restoring normal authentication..."

Copy-Item $hbaBackup $hbaFile -Force
Remove-Item $hbaBackup -Force

Restart-Service -Name $pgSvcName -Force
Start-Sleep -Seconds 5
Write-OK "PostgreSQL restarted with normal authentication"

# ===========================================================
# Step 4 - Verify
# ===========================================================
Write-Info "Verifying new password works..."

$env:PGPASSWORD = $DefaultPassword
$ErrorActionPreference = "Continue"
$test = & "$pgBin\psql.exe" -U postgres -h 127.0.0.1 -tAc "SELECT 1" 2>&1
$failed = ($LASTEXITCODE -ne 0)
$ErrorActionPreference = "Stop"

Write-Host ""
if (-not $failed) {
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host "  Password Reset Successful!" -ForegroundColor Green
    Write-Host "=====================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Both PostgreSQL accounts now use:" -ForegroundColor White
    Write-Host ""
    Write-Host "    postgres    password: $DefaultPassword" -ForegroundColor Green
    Write-Host "    grandpalace password: $DefaultPassword" -ForegroundColor Green
    Write-Host ""
    Write-Host "  You can now run windows-server-install.ps1 again." -ForegroundColor White
} else {
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host "  Password Reset Failed" -ForegroundColor Red
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please try:" -ForegroundColor White
    Write-Host "    1. Run remove.ps1 and choose YES to uninstall PostgreSQL" -ForegroundColor White
    Write-Host "    2. Then run windows-server-install.ps1 for a clean install" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to close"
