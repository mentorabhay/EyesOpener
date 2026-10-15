@echo off
cd /d "%~dp0"
title Eyes Opener - dev server (close this window or press Ctrl+C to stop)
if not exist node_modules (
  echo  [!] Run setup.bat first.
  pause
  exit /b 1
)
docker compose up -d
echo  Starting Eyes Opener at http://localhost:3000  (the first page takes about 15 seconds)
echo  Pick a person to sign in as at http://localhost:3000/login
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000/login"
call npm run dev
