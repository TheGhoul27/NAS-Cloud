#!/bin/bash
# Development run script for NAS Cloud Service on Linux

echo "========================================"
echo "Starting NAS Cloud Service in Development Mode"
echo "========================================"

# Check if React build exists
if [ ! -d "frontend/dist" ]; then
    echo "Building React app first..."
    cd frontend
    npm run build
    cd ..
fi

# Start the service application
python3 launcher_service.py
