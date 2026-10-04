@echo off
cd /d "%~dp0"
title IOpener - first-time setup
echo.
echo  IOpener web app: first-time setup
echo  Needs: Node.js 22 or later, and Docker Desktop running (for PostgreSQL).
echo.
if not exist .env.local copy .env.example .env.local >nul
call npm install || goto :fail
docker compose up -d || goto :fail
echo  Waiting for the database...
timeout /t 6 /nobreak >nul
call npm run db:migrate || goto :fail
call npm run db:seed || goto :fail
echo.
echo  Done. Run start.bat to open the app.
pause
exit /b 0
:fail
echo.
echo  [!] Setup stopped. Read the message above, fix it, and run setup.bat again.
pause
exit /b 1
