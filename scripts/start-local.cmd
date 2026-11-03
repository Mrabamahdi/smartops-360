@echo off
setlocal
cd /d "%~dp0..\apps\backend"
if not exist .venv\Scripts\python.exe (
  echo Python environment is missing. Run scripts\setup-local.cmd first.
  goto failed
)
if not exist "..\frontend\dist\index.html" (
  echo Frontend build is missing. Run scripts\setup-local.cmd first.
  goto failed
)
.venv\Scripts\python.exe manage.py migrate
if errorlevel 1 goto failed
.venv\Scripts\python.exe manage.py setup_workspace
if errorlevel 1 goto failed
echo.
echo SmartOps 360: http://127.0.0.1:8000/
echo Keep this window open while using the application.
echo Press Ctrl+C in this window to stop the server.
echo.
start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command "$deadline=(Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:8000/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { Start-Process 'http://127.0.0.1:8000/'; exit } } catch {}; Start-Sleep -Milliseconds 500 }"
.venv\Scripts\python.exe -m waitress --listen=127.0.0.1:8000 config.wsgi:application
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo SmartOps 360 could not start. Read the error above.
echo If port 8000 is already in use, check the other SmartOps window.
pause
exit /b 1