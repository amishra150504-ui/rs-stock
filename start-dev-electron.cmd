@echo off
setlocal
cd /d "%~dp0"

if exist node_modules (
  echo Starting Vite dev server...
  start "Vite Dev" cmd /k npm run dev
  echo Starting Electron (dev)...
  set NODE_ENV=development
  "%~dp0node_modules\electron\dist\electron.exe" .
) else (
  echo node_modules not found. Run: npm install
  pause
)
