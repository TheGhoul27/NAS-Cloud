#!/bin/bash

# Quick development setup for NAS Cloud

echo "========================================"
echo "NAS Cloud Development Setup"
echo "========================================"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python3 is not installed or not in PATH"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    exit 1
fi

echo "Installing backend dependencies..."
cd backend
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Failed to install backend dependencies"
    exit 1
fi
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install frontend dependencies"
    exit 1
fi

echo "Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build frontend"
    exit 1
fi
cd ..

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "To start NAS Cloud:"
echo "  Backend:  cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Or build frontend and serve from backend:"
echo "  cd frontend && npm run build"
echo "  cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo ""
