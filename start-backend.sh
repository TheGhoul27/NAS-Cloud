#!/bin/bash

# Start the backend services
echo "Starting database and Redis..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Start the backend server
echo "Starting backend server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
