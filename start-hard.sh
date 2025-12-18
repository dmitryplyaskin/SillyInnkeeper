#!/bin/sh

echo "========================================"
echo "SillyInnkeeper Project - HARD START"
echo "========================================"

echo ""
echo "[0/7] Checking package manager..."
if command -v yarn >/dev/null 2>&1; then
    PACKAGE_MANAGER="yarn"
    echo "Using yarn as package manager"
else
    echo "ERROR: yarn is required for hard start!"
    echo "Please install yarn first: npm install -g yarn"
    exit 1
fi

echo ""
echo "[1/7] Cleaning backend (server) and installing dependencies (FORCE)..."
if [ -d "server/node_modules" ]; then
    echo "Removing server/node_modules..."
    rm -rf "server/node_modules"
fi
if [ -d "server/dist" ]; then
    echo "Removing server/dist..."
    rm -rf "server/dist"
fi

cd server
echo "Installing backend dependencies with yarn..."
yarn install
if [ $? -ne 0 ]; then
    cd ..
    echo "Error installing backend dependencies!"
    exit 1
fi
cd ..

echo ""
echo "[2/7] Cleaning frontend (client) and installing dependencies (FORCE)..."
if [ -d "client/node_modules" ]; then
    echo "Removing client/node_modules..."
    rm -rf "client/node_modules"
fi
if [ -d "client/dist" ]; then
    echo "Removing client/dist..."
    rm -rf "client/dist"
fi
if [ -d "client/.yarn/cache" ]; then
    echo "Removing client/.yarn/cache..."
    rm -rf "client/.yarn/cache"
fi

cd client
echo "Installing frontend dependencies with yarn..."
yarn install
if [ $? -ne 0 ]; then
    cd ..
    echo "Error installing frontend dependencies!"
    exit 1
fi
cd ..

echo ""
echo "[3/7] Building frontend (FORCE)..."
echo "Building frontend with yarn..."
cd client
yarn build
if [ $? -ne 0 ]; then
    cd ..
    echo "Error building frontend!"
    exit 1
fi
cd ..

echo ""
echo "[4/7] Building backend (FORCE)..."
echo "Building backend with yarn..."
cd server
yarn build
if [ $? -ne 0 ]; then
    cd ..
    echo "Error building backend!"
    exit 1
fi
cd ..

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

echo "[7/7] Starting server with yarn..."
cd server
yarn start
