# Getting Started with NAS-Cloud Development

This guide will help you set up the NAS-Cloud development environment on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Python 3.11+**
   - Download from [python.org](https://www.python.org/downloads/)
   - Verify installation: `python --version`

2. **Node.js 18+**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

3. **Docker Desktop**
   - Download from [docker.com](https://www.docker.com/products/docker-desktop)
   - Start Docker Desktop after installation

4. **Git**
   - Download from [git-scm.com](https://git-scm.com/downloads)

### Optional but Recommended

- **VS Code** with Python and TypeScript extensions
- **Make** (for using Makefile commands)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/TheGhoul27/NAS-Cloud.git
cd NAS-Cloud
```

### 2. Environment Setup

Copy the environment file:
```bash
cp .env.example .env
```

Edit the `.env` file with your preferred settings.

### 3. Start Database Services

```bash
docker compose up -d db cache
```

### 4. Setup Backend

```bash
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Setup Frontend

```bash
cd frontend
npm install
```

### 6. Start Development Servers

Open 3 terminal windows:

**Terminal 1 - Backend API:**
```bash
cd backend
uvicorn nas_cloud.app.main:app --reload
```

**Terminal 2 - Background Worker:**
```bash
cd backend
dramatiq nas_cloud.worker.tasks --processes 2 --threads 4
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Development Workflow

### Making Changes

1. **Backend changes**: The API server will automatically reload when you save Python files
2. **Frontend changes**: The dev server will automatically reload when you save React files
3. **Database changes**: Restart the backend server to apply schema changes

### Testing

Run backend tests:
```bash
cd backend
pytest tests/
```

Run frontend tests:
```bash
cd frontend
npm test
```

### Linting and Formatting

Backend:
```bash
cd backend
black nas_cloud/
isort nas_cloud/
flake8 nas_cloud/
```

Frontend:
```bash
cd frontend
npm run lint
```

## Project Structure

```
NAS-Cloud/
├── backend/                # Python FastAPI backend
│   ├── nas_cloud/
│   │   ├── app/           # Main application
│   │   │   ├── api/       # API routes
│   │   │   ├── models/    # Database models
│   │   │   ├── services/  # Business logic
│   │   │   └── auth/      # Authentication
│   │   └── worker/        # Background tasks
│   ├── tests/             # Backend tests
│   └── requirements.txt   # Python dependencies
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # State management
│   │   └── lib/           # Utilities
│   └── package.json       # Node dependencies
├── infra/                 # Docker and deployment
├── scripts/               # Development scripts
└── docs/                  # Documentation
```

## Current Sprint Goals

According to the roadmap, you're currently in the **Prep phase** (July 10-13, 2025):

### Prep Phase Checklist
- [x] Create project scaffold
- [x] Set up Docker compose for database and cache
- [x] Configure GitHub Actions CI/CD
- [x] Set up development environment
- [ ] Write initial unit tests
- [ ] Complete database schema
- [ ] Test end-to-end setup

### Sprint 1 (July 14-20, 2025)
- [ ] Implement user authentication (register, login, JWT)
- [ ] Complete database models and migrations
- [ ] Create React authentication pages
- [ ] Set up proper error handling

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Make sure Docker is running
   - Check if database service is up: `docker compose ps`
   - Restart database: `docker compose restart db`

2. **Port conflicts**
   - Check if ports 8000, 5173, 5432, 6379 are available
   - Stop conflicting services or change ports in configuration

3. **Python import errors**
   - Make sure you're in the virtual environment
   - Check if all dependencies are installed: `pip install -r requirements.txt`

4. **Frontend build errors**
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

### Getting Help

- Check the GitHub Issues for known problems
- Create a new issue if you encounter bugs
- Review the API documentation at http://localhost:8000/docs

## Next Steps

1. Complete the prep phase tasks
2. Start Sprint 1 implementation
3. Add your first user registration and login
4. Test the file upload functionality

Happy coding! 🚀
