@echo off
setlocal
cd /d "%~dp0"
set RS_FORCE_DIST=1
"%~dp0node_modules\electron\dist\electron.exe" .
endlocal
