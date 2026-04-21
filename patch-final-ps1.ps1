#Requires -RunAsAdministrator
# ============================================================
# Patch script: sửa lỗi NativeCommandError khi nginx -t trong final.ps1
# Cách dùng:
#   powershell -ExecutionPolicy Bypass -File .\patch-final-ps1.ps1
# Mặc định patch C:\PRD\lamaison\final.ps1 -- đổi -TargetFile nếu khác.
# ============================================================
param(
    [string]$TargetFile = "C:\PRD\lamaison\final.ps1"
)

if (-not (Test-Path $TargetFile)) {
    Write-Host "[ERROR] Khong tim thay $TargetFile" -ForegroundColor Red
    exit 1
}

$backup = "$TargetFile.bak_" + (Get-Date -Format "yyyyMMdd_HHmmss")
Copy-Item -Path $TargetFile -Destination $backup -Force
Write-Host "[OK] Da backup -> $backup" -ForegroundColor Green

$content = Get-Content -Raw -Path $TargetFile

# Mau dong CAN sua (nginx -t goi truc tiep, stderr lam PowerShell throw)
$pattern = '(?m)^[ \t]*\$testResult\s*=\s*&\s*\$nginxExe\s+-t\s+-c\s+\$nginxConfPath\s+-p\s+\$NginxDir\s+2>&1\s*$'

if ($content -notmatch $pattern) {
    Write-Host "[!] Khong tim thay dong nginx -t mau, co the file da duoc patch roi." -ForegroundColor Yellow
    Write-Host "    Kiem tra thu cong dong 811 cua $TargetFile" -ForegroundColor Yellow
    exit 0
}

$replacement = @'
    # --- nginx -t : stderr KHONG duoc coi la loi (auto-patched) ---
    $prevEAP_ng = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $LASTEXITCODE = 0
    try {
        $testResult = & $nginxExe -t -c $nginxConfPath -p $NginxDir 2>&1 |
                      ForEach-Object { "$_" }
    } catch {
        $testResult = $_.Exception.Message
    }
    $nginxExit_t = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP_ng
    if ($nginxExit_t -ne 0) {
        Write-Host "  [ERROR] nginx -t failed (exit $nginxExit_t):`n$($testResult -join "`n")" -ForegroundColor Red
    } else {
        Write-Host "  [OK] nginx config syntax OK" -ForegroundColor Green
        $testResult | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    }
    # --- end patch ---
'@

# -replace can escape '$' trong chuoi thay the (vi $1, $2... la backreference)
$safeReplacement = $replacement -replace '\$','$$$$'
$newContent = $content -replace $pattern, $safeReplacement

# Ghi UTF-8 khong BOM
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($TargetFile, $newContent, $utf8NoBom)

Write-Host "[OK] Da patch xong $TargetFile" -ForegroundColor Green
Write-Host "     Backup nam o: $backup" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Bay gio chay lai: powershell -ExecutionPolicy Bypass -File .\final.ps1" -ForegroundColor Cyan
