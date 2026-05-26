$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Building Electron app..." -ForegroundColor Cyan
npm run build:electron

$distDir = Join-Path $repoRoot "dist"
$releaseDir = Join-Path $repoRoot "release-dist"
$searchDirs = @($releaseDir, $distDir) | Where-Object { Test-Path $_ }

$portable = Get-ChildItem $searchDirs -Filter "Management-System-*.exe" -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $portable) {
  throw "Portable exe not found. Expected Management-System-*.exe in release-dist/ or dist/"
}

$desktopDir = [Environment]::GetFolderPath("Desktop")
$targetDir = Join-Path $desktopDir "Management System"
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$targetExe = Join-Path $targetDir "Management-System.exe"
$procs = @()
try {
  $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and ($_.Path -ieq $targetExe) }
} catch {}

if ($procs) {
  # Stage update without closing the running app.
  $updatesDir = Join-Path $targetDir "updates"
  New-Item -ItemType Directory -Force -Path $updatesDir | Out-Null
  $stagedExe = Join-Path $updatesDir "Management-System.new.exe"
  Copy-Item -Force $portable.FullName $stagedExe

  $versionSrc = Join-Path $distDir "version.json"
  if (Test-Path $versionSrc) {
    Copy-Item -Force $versionSrc (Join-Path $updatesDir "version.json")
  }

  Write-Host "App is running; staged update:" -ForegroundColor Yellow
  Write-Host " - $stagedExe"
  Write-Host "Open the app and click 'Update Available' to apply and restart." -ForegroundColor Yellow
} else {
  # Replace in-place.
  Copy-Item -Force $portable.FullName $targetExe
  Write-Host "Copied: $($portable.Name) -> $targetExe" -ForegroundColor Green
}

$shortcutPath = Join-Path $desktopDir "Management System.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = $targetExe
$sc.WorkingDirectory = $targetDir
$sc.WindowStyle = 1
$sc.Description = "Management System"
$sc.Save()

Write-Host "Desktop shortcut updated: $shortcutPath" -ForegroundColor Green
