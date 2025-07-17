# NAS-Cloud Development Makefile

.PHONY: help setup install-deps start-db start-api start-worker start-frontend test clean

help: ## Show this help message
	@echo "NAS-Cloud Development Commands:"
	@echo "================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Initial project setup
	@echo "Setting up NAS-Cloud development environment..."
	@python scripts/setup.py

install-deps: ## Install all dependencies
	@echo "Installing backend dependencies..."
	@cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

start-db: ## Start database and cache services
	@echo "Starting database and cache services..."
	@docker compose up -d db cache

start-api: ## Start the FastAPI backend server
	@echo "Starting backend API server..."
	@cd backend && uvicorn nas_cloud.app.main:app --reload --host 0.0.0.0 --port 8000

start-worker: ## Start the background worker
	@echo "Starting background worker..."
	@cd backend && dramatiq nas_cloud.worker.tasks --processes 2 --threads 4

start-frontend: ## Start the frontend development server
	@echo "Starting frontend development server..."
	@cd frontend && npm run dev

test: ## Run tests
	@echo "Running backend tests..."
	@cd backend && pytest tests/
	@echo "Running frontend tests..."
	@cd frontend && npm run test

lint: ## Run linting
	@echo "Linting backend code..."
	@cd backend && black nas_cloud/ && isort nas_cloud/ && flake8 nas_cloud/
	@echo "Linting frontend code..."
	@cd frontend && npm run lint

clean: ## Clean up generated files
	@echo "Cleaning up..."
	@docker compose down
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@cd backend && rm -rf .pytest_cache || true
	@cd frontend && rm -rf node_modules/.cache || true

dev: start-db ## Start all development services
	@echo "Starting all development services..."
	@echo "Database and cache are starting..."
	@sleep 3
	@echo "Starting backend API in the background..."
	@cd backend && uvicorn nas_cloud.app.main:app --reload --host 0.0.0.0 --port 8000 &
	@echo "Starting worker in the background..."
	@cd backend && dramatiq nas_cloud.worker.tasks --processes 2 --threads 4 &
	@echo "Starting frontend development server..."
	@cd frontend && npm run dev

build: ## Build the application for production
	@echo "Building frontend..."
	@cd frontend && npm run build
	@echo "Building backend..."
	@cd backend && python -m pip install --upgrade pip setuptools wheel
	@echo "Build complete!"

docker-build: ## Build Docker images
	@echo "Building Docker images..."
	@docker compose build

docker-up: ## Start all services with Docker
	@echo "Starting all services with Docker..."
	@docker compose up -d

docker-down: ## Stop all Docker services
	@echo "Stopping all Docker services..."
	@docker compose down

docker-logs: ## View Docker logs
	@docker compose logs -f

reset-db: ## Reset the database
	@echo "Resetting database..."
	@docker compose down db
	@docker volume rm nascloud_db_data || true
	@docker compose up -d db

# Default target
all: setup start-db dev
