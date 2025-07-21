#!/bin/bash

# Start the backend services
echo Checking virtual environment...
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

source venv/bin/activate
# Start the backend server
echo "Starting backend server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
