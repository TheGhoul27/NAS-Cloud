#!/usr/bin/env python3
"""
Development setup script for NAS-Cloud
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return the result"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running command: {cmd}")
        print(f"Error output: {result.stderr}")
        return False
    return True

def setup_backend():
    """Setup backend environment"""
    print("Setting up backend environment...")
    
    backend_path = Path("backend")
    if not backend_path.exists():
        print("Backend directory not found!")
        return False
    
    # Check if Python is available
    if not shutil.which("python") and not shutil.which("python3"):
        print("Python is not installed or not in PATH")
        return False
    
    python_cmd = "python" if shutil.which("python") else "python3"
    
    # Create virtual environment
    venv_path = backend_path / "venv"
    if not venv_path.exists():
        print("Creating virtual environment...")
        if not run_command(f"{python_cmd} -m venv venv", cwd=backend_path):
            return False
    
    # Activate virtual environment and install dependencies
    if os.name == "nt":  # Windows
        activate_cmd = "venv\\Scripts\\activate"
        python_venv = "venv\\Scripts\\python"
    else:  # Unix/Linux/MacOS
        activate_cmd = "source venv/bin/activate"
        python_venv = "venv/bin/python"
    
    print("Installing Python dependencies...")
    if not run_command(f"{python_venv} -m pip install -r requirements.txt", cwd=backend_path):
        return False
    
    return True

def setup_frontend():
    """Setup frontend environment"""
    print("Setting up frontend environment...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("Frontend directory not found!")
        return False
    
    # Check if Node.js is available
    if not shutil.which("node") or not shutil.which("npm"):
        print("Node.js and npm are required but not installed")
        return False
    
    # Install dependencies
    print("Installing Node.js dependencies...")
    if not run_command("npm install", cwd=frontend_path):
        return False
    
    return True

def setup_database():
    """Setup database using Docker"""
    print("Setting up database...")
    
    # Check if Docker is available
    if not shutil.which("docker"):
        print("Docker is required but not installed")
        return False
    
    # Start database and cache services
    print("Starting database and cache services...")
    if not run_command("docker compose up -d db cache"):
        return False
    
    return True

def create_env_file():
    """Create .env file from example"""
    env_example = Path(".env.example")
    env_file = Path(".env")
    
    if env_example.exists() and not env_file.exists():
        print("Creating .env file...")
        shutil.copy(env_example, env_file)
        print("Please review and update the .env file with your settings")
    
    return True

def main():
    """Main setup function"""
    print("NAS-Cloud Development Setup")
    print("=" * 30)
    
    # Check if we're in the project root
    if not Path("backend").exists() or not Path("frontend").exists():
        print("Please run this script from the project root directory")
        sys.exit(1)
    
    # Create .env file
    if not create_env_file():
        print("Failed to create .env file")
        sys.exit(1)
    
    # Setup backend
    if not setup_backend():
        print("Failed to setup backend")
        sys.exit(1)
    
    # Setup frontend
    if not setup_frontend():
        print("Failed to setup frontend")
        sys.exit(1)
    
    # Setup database
    if not setup_database():
        print("Failed to setup database")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("Setup completed successfully!")
    print("\nTo start development:")
    print("1. Backend API: cd backend && python -m uvicorn nas_cloud.app.main:app --reload")
    print("2. Background worker: cd backend && python -m dramatiq nas_cloud.worker.tasks")
    print("3. Frontend: cd frontend && npm run dev")
    print("\nThe application will be available at:")
    print("- Frontend: http://localhost:5173")
    print("- API: http://localhost:8000")
    print("- API docs: http://localhost:8000/docs")

if __name__ == "__main__":
    main()
