@echo off
REM JuneERP Complete Database Restoration - Windows

set DATABASE_URL=%1
if "%DATABASE_URL%"=="" (
    echo Usage: restore.bat "postgresql://user:pass@host:port/database"
    exit /b 1
)

echo ==============================================
echo JUNEERP COMPLETE DATABASE RESTORATION
echo ==============================================
echo Target: %DATABASE_URL%
echo Tables: 248
echo Records: 8,894+
echo ==============================================

echo Step 1: Creating schema...
psql "%DATABASE_URL%" -f 01-complete-schema.sql
if errorlevel 1 exit /b 1

echo Step 2: Importing data...
psql "%DATABASE_URL%" -f 02-complete-data.sql
if errorlevel 1 exit /b 1

echo Step 3: Setting sequences...
psql "%DATABASE_URL%" -f 03-sequences.sql
if errorlevel 1 exit /b 1

echo Step 4: Creating indexes...
psql "%DATABASE_URL%" -f 04-indexes.sql
if errorlevel 1 exit /b 1

echo.
echo RESTORATION COMPLETED SUCCESSFULLY!
echo JuneERP database ready for production use
