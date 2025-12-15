#!/bin/sh

echo "========================================"
echo "SillyInnkeeper Project - UPDATE + HARD START"
echo "========================================"

echo ""
echo "[0/3] Checking git..."
if ! command -v git >/dev/null 2>&1; then
    echo "ERROR: git is not found in PATH!"
    echo "Please install Git and restart terminal."
    exit 1
fi

echo ""
echo "[1/3] Switching to main branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ -z "$CURRENT_BRANCH" ]; then
    echo "ERROR: Not a git repository or cannot read current branch."
    exit 1
fi

if [ "$CURRENT_BRANCH" != "main" ]; then
    git switch main >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        git checkout main
        if [ $? -ne 0 ]; then
            echo "ERROR: Cannot switch to branch 'main'."
            echo "Make sure it exists and there are no blocking local changes."
            exit 1
        fi
    fi
else
    echo "Already on main."
fi

echo ""
echo "[2/3] Pulling latest changes from origin/main..."
git pull --ff-only origin main
if [ $? -ne 0 ]; then
    echo "ERROR: git pull failed."
    echo "If you have local changes or diverged history, resolve it manually, then re-run."
    exit 1
fi

echo ""
echo "[3/3] Running hard start..."
# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$0")
"$SCRIPT_DIR/start-hard.sh"
