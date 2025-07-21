#!/bin/bash
# Build script for NAS Cloud on Linux

set -e  # Exit on any error

echo "========================================"
echo "Building NAS Cloud Service for Linux"
echo "========================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed or not in PATH"
    echo "Please install Python 3"
    exit 1
fi

echo "Step 1: Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "Step 2: Building React application..."
npm run build
cd ..

echo "Step 3: Setting up Python environment..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi
cd ..

echo "Step 4: Building executable with PyInstaller..."
source backend/venv/bin/activate
pyinstaller nas-cloud.spec --clean --noconfirm

echo "========================================"
echo "Build completed successfully!"
echo "========================================"
echo "Executable location: dist/NAS-Cloud"
echo "The service will run in the background with system tray icon"
echo "You can now distribute the 'dist' folder"
echo "========================================"
