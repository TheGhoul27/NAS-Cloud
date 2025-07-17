#!/bin/bash

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install

# Start the frontend development server
echo "Starting frontend development server..."
npm run dev
