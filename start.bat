@echo off
echo ========================================
echo Starting SillyInnkeeper Project
echo ========================================

echo.
echo [0/7] Checking package manager...
where yarn >nul 2>&1
if %errorlevel% equ 0 (
    set PACKAGE_MANAGER=yarn
    echo Using yarn as package manager
) else (
    set PACKAGE_MANAGER=npm
    echo Using npm as package manager (yarn not found)
)

echo.
echo [1/7] Checking backend dependencies (server)...
pushd server
if not exist "node_modules" (
    echo Installing backend dependencies with %PACKAGE_MANAGER%...
    if "%PACKAGE_MANAGER%"=="yarn" (
        call yarn install --prefer-offline --silent
    ) else (
        call npm install --prefer-offline --no-audit --no-fund
    )
    if %errorlevel% neq 0 (
        popd
        echo Error installing backend dependencies!
        pause
        exit /b 1
    )
) else (
    echo Backend dependencies already installed, skipping...
)
popd

echo.
echo [2/7] Checking frontend dependencies (client)...
pushd client
if not exist "node_modules" (
    echo Installing frontend dependencies with %PACKAGE_MANAGER%...
    if "%PACKAGE_MANAGER%"=="yarn" (
        call yarn install --prefer-offline --silent
    ) else (
        call npm install --prefer-offline --no-audit --no-fund
    )
    if %errorlevel% neq 0 (
        popd
        echo Error installing frontend dependencies!
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed, skipping...
)
popd

echo.
echo [3/7] Checking frontend build...
if not exist "client\dist\index.html" (
    echo Building frontend with %PACKAGE_MANAGER%...
    pushd client
    if "%PACKAGE_MANAGER%"=="yarn" (
        call yarn build
    ) else (
        call npm run build
    )
    if %errorlevel% neq 0 (
        popd
        echo Error building frontend!
        pause
        exit /b 1
    )
    popd
) else (
    echo Frontend build already exists, skipping...
)

echo.
echo [4/7] Checking backend build...
if not exist "server\dist\server.js" (
    echo Building backend with %PACKAGE_MANAGER%...
    pushd server
    if "%PACKAGE_MANAGER%"=="yarn" (
        call yarn build
    ) else (
        call npm run build
    )
    if %errorlevel% neq 0 (
        popd
        echo Error building backend!
        pause
        exit /b 1
    )
    popd
) else (
    echo Backend build already exists, skipping...
)

echo.
echo [5/7] Starting production server...
set "INNKEEPER_PORT_EFFECTIVE=%INNKEEPER_PORT%"
if "%INNKEEPER_PORT_EFFECTIVE%"=="" set "INNKEEPER_PORT_EFFECTIVE=%PORT%"
if "%INNKEEPER_PORT_EFFECTIVE%"=="" set "INNKEEPER_PORT_EFFECTIVE=48912"
set "OPEN_URL=http://127.0.0.1:%INNKEEPER_PORT_EFFECTIVE%"
echo Project will be available at: %OPEN_URL%
echo Press Ctrl+C to stop the server
echo.

echo [6/7] Opening browser...
timeout /t 3 /nobreak >nul
start %OPEN_URL%

echo [7/7] Starting server with %PACKAGE_MANAGER%...
pushd server
if "%PACKAGE_MANAGER%"=="yarn" (
    call yarn start
) else (
    call npm run start
)
popd

pause