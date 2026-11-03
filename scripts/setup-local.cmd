@echo off
cd /d "%~dp0.."
py -3.12 -m venv apps\backend\.venv
if errorlevel 1 goto failed
apps\backend\.venv\Scripts\python.exe -m pip install -r apps\backend\requirements-lock.txt
if errorlevel 1 goto failed
cd apps\frontend
call npm ci
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo Setup complete. Run START_SMARTOPS.cmd.
exit /b 0
:failed
echo Setup failed. Check Python 3.12 and Node.js 22.18 or newer.
pause
exit /b 1
