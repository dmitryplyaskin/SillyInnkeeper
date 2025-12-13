@echo off

setlocal



echo ========================================

echo SillyInnkeeper Project - UPDATE + HARD START

echo ========================================



echo.

echo [0/3] Checking git...

where git >nul 2>&1

if %errorlevel% neq 0 (

    echo ERROR: git is not found in PATH!

    echo Please install Git for Windows and restart terminal.

    pause

    exit /b 1

)



echo.

echo [1/3] Switching to main branch...

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set CURRENT_BRANCH=%%b

if "%CURRENT_BRANCH%"=="" (

    echo ERROR: Not a git repository or cannot read current branch.

    pause

    exit /b 1

)



if /i not "%CURRENT_BRANCH%"=="main" (

    git switch main >nul 2>&1

    if %errorlevel% neq 0 (

        git checkout main

        if %errorlevel% neq 0 (

            echo ERROR: Cannot switch to branch 'main'.

            echo Make sure it exists and there are no blocking local changes.

            pause

            exit /b 1

        )

    )

) else (

    echo Already on main.

)



echo.

echo [2/3] Pulling latest changes from origin/main...

git pull --ff-only origin main

if %errorlevel% neq 0 (

    echo ERROR: git pull failed.

    echo If you have local changes or diverged history, resolve it manually, then re-run.

    pause

    exit /b 1

)



echo.

echo [3/3] Running hard start...

call "%~dp0start-hard.bat"



endlocal

