#!/bin/bash

# NAS-Cloud Development Start Script
# This script starts all development services

echo "Starting NAS-Cloud Development Environment"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Start database and cache services
echo "Starting database and cache services..."
docker compose up -d db cache

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Check if services are healthy
echo "Checking service health..."
docker compose ps

echo ""
echo "Services started successfully!"
echo ""
echo "Next steps:"
echo "1. Backend API: cd backend && uvicorn nas_cloud.app.main:app --reload"
echo "2. Background worker: cd backend && dramatiq nas_cloud.worker.tasks"
echo "3. Frontend: cd frontend && npm run dev"
echo ""
echo "URLs:"
echo "- Frontend: http://localhost:5173"
echo "- API: http://localhost:8000"
echo "- API docs: http://localhost:8000/docs"
