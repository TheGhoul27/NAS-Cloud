@echo off
echo Starting database and Redis...
docker-compose up -d

echo Waiting for database to be ready...
timeout /t 5 /nobreak

echo Installing backend dependencies...
cd backend
pip install -r requirements.txt

echo Starting backend server...
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
