#!/bin/sh

echo "========================================"
echo "Starting SillyInnkeeper Project"
echo "========================================"

echo ""
echo "[0/7] Checking package manager..."
if command -v yarn >/dev/null 2>&1; then
    PACKAGE_MANAGER="yarn"
    echo "Using yarn as package manager"
else
    PACKAGE_MANAGER="npm"
    echo "Using npm as package manager (yarn not found)"
fi

echo ""
echo "[1/7] Checking backend dependencies (server)..."
cd server
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies with $PACKAGE_MANAGER..."
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install --prefer-offline --silent
    else
        npm install --prefer-offline --no-audit --no-fund
    fi
    if [ $? -ne 0 ]; then
        cd ..
        echo "Error installing backend dependencies!"
        exit 1
    fi
else
    echo "Backend dependencies already installed, skipping..."
fi
cd ..

echo ""
echo "[2/7] Checking frontend dependencies (client)..."
cd client
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies with $PACKAGE_MANAGER..."
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install --prefer-offline --silent
    else
        npm install --prefer-offline --no-audit --no-fund
    fi
    if [ $? -ne 0 ]; then
        cd ..
        echo "Error installing frontend dependencies!"
        exit 1
    fi
else
    echo "Frontend dependencies already installed, skipping..."
fi
cd ..

echo ""
echo "[3/7] Checking frontend build..."
if [ ! -f "client/dist/index.html" ]; then
    echo "Building frontend with $PACKAGE_MANAGER..."
    cd client
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn build
    else
        npm run build
    fi
    if [ $? -ne 0 ]; then
        cd ..
        echo "Error building frontend!"
        exit 1
    fi
    cd ..
else
    echo "Frontend build already exists, skipping..."
fi

echo ""
echo "[4/7] Checking backend build..."
if [ ! -f "server/dist/server.js" ]; then
    echo "Building backend with $PACKAGE_MANAGER..."
    cd server
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn build
    else
        npm run build
    fi
    if [ $? -ne 0 ]; then
        cd ..
        echo "Error building backend!"
        exit 1
    fi
    cd ..
else
    echo "Backend build already exists, skipping..."
fi

echo ""
echo "[5/7] Starting production server..."
INNKEEPER_PORT_EFFECTIVE="${INNKEEPER_PORT:-${PORT:-48912}}"
OPEN_URL="http://127.0.0.1:${INNKEEPER_PORT_EFFECTIVE}"
echo "Project will be available at: ${OPEN_URL}"
echo "Press Ctrl+C to stop the server"
echo ""

echo "[6/7] Opening browser..."
sleep 3
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${OPEN_URL}"
elif command -v open >/dev/null 2>&1; then
    open "${OPEN_URL}"
else
    echo "Could not detect web browser to open URL automatically."
fi &

echo "[7/7] Starting server with $PACKAGE_MANAGER..."
cd server
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
    yarn start
else
    npm run start
fi
