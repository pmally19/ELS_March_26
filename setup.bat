@echo off
REM JuneERP Complete Project Setup - Windows

echo ==============================================
echo JUNEERP COMPLETE PROJECT SETUP
echo ==============================================

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is required but not installed
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

echo Checking PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo Error: PostgreSQL is required but not installed
    echo Please install PostgreSQL from https://postgresql.org
    pause
    exit /b 1
)

if "%DATABASE_URL%"=="" (
    echo Error: DATABASE_URL environment variable not set
    echo Please set DATABASE_URL to your PostgreSQL connection string
    pause
    exit /b 1
)

echo.
echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 exit /b 1

echo.
echo Step 2: Setting up database...
cd database
call restore.bat "%DATABASE_URL%"
if errorlevel 1 exit /b 1
cd ..

echo.
echo Step 3: Configuring environment...
if not exist .env (
    copy .env.example .env
    echo Environment file created - please edit .env
)

echo.
echo ==============================================
echo SETUP COMPLETED SUCCESSFULLY!
echo ==============================================
echo.
echo To start the application:
echo   npm run dev
echo.
echo Then open: http://localhost:5173
echo ==============================================
pause
