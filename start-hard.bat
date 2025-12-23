@echo off
echo ========================================
echo SillyInnkeeper Project - HARD START
echo ========================================

echo.
echo [0/7] Checking package manager...
where yarn >nul 2>&1
if %errorlevel% equ 0 (
    set PACKAGE_MANAGER=yarn
    echo Using yarn as package manager
) else (
    echo ERROR: yarn is required for hard start!
    echo Please install yarn first: npm install -g yarn
    pause
    exit /b 1
)

echo.
echo [1/7] Cleaning backend (server) and installing dependencies (FORCE)...
if exist "server\node_modules" (
    echo Removing server\node_modules...
    rmdir /s /q "server\node_modules"
)
if exist "server\dist" (
    echo Removing server\dist...
    rmdir /s /q "server\dist"
)
pushd server
echo Installing backend dependencies with yarn...
call yarn install
if %errorlevel% neq 0 (
    popd
    echo Error installing backend dependencies!
    pause
    exit /b 1
)
popd

echo.
echo [2/7] Cleaning frontend (client) and installing dependencies (FORCE)...
if exist "client\node_modules" (
    echo Removing client\node_modules...
    rmdir /s /q "client\node_modules"
)
if exist "client\dist" (
    echo Removing client\dist...
    rmdir /s /q "client\dist"
)
if exist "client\.yarn\cache" (
    echo Removing client\.yarn\cache...
    rmdir /s /q "client\.yarn\cache"
)
pushd client
echo Installing frontend dependencies with yarn...
call yarn install
if %errorlevel% neq 0 (
    popd
    echo Error installing frontend dependencies!
    pause
    exit /b 1
)
popd

echo.
echo [3/7] Building frontend (FORCE)...
echo Building frontend with yarn...
pushd client
call yarn build
if %errorlevel% neq 0 (
    popd
    echo Error building frontend!
    pause
    exit /b 1
)
popd

echo.
echo [4/7] Building backend (FORCE)...
echo Building backend with yarn...
pushd server
call yarn build
if %errorlevel% neq 0 (
    popd
    echo Error building backend!
    pause
    exit /b 1
)
popd

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

echo [7/7] Starting server with yarn...
pushd server
call yarn start
popd

pause
