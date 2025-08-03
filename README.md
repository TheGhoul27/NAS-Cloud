# NAS Cloud - Personal File Storage System

A modern, self-hosted file storage and photo management system built with Python (FastAPI) and React.

## Features

- **Dual Interface**: Separate login/register pages for Drive and Photos apps
- **Unified Authentication**: Single API handles auth for both applications
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Secure**: JWT-based authentication with password hashing
- **Development Ready**: Hot reloading and easy setup
- **Flexible Deployment**: Serve frontend separately or from backend

## Project Structure

```
NAS-Cloud/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── auth/           # Authentication utilities
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   └── App.jsx        # Main app component
│   └── package.json       # Node dependencies
├── setup-dev.bat           # Windows setup script
└── setup-dev.sh            # Linux/macOS setup script
```

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+

### 1. Clone the Repository

```bash
git clone <repository-url>
cd NAS-Cloud
```

### 2. Setup Backend

**Windows:**
```cmd
start-backend.bat
```

**Linux/macOS:**
```bash
chmod +x start-backend.sh
./start-backend.sh
```

**Manual setup:**
```bash
cd backend
pip install -r requirements.txt
```

### 3. Setup Frontend

**Windows:**
```cmd
start-frontend.bat
```

**Linux/macOS:**
```bash
chmod +x start-frontend.sh
./start-frontend.sh
```

**Manual setup:**
```bash
cd frontend
npm install
```

### 4. Start Development Servers

**Option 1: Separate Frontend and Backend (Recommended for development)**

Terminal 1 (Backend):
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Option 2: Backend serves frontend (Production-like)**

Build frontend first:
```bash
cd frontend
npm run build
```

Then start backend:
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Access the Applications

**With Separate Servers (Development):**
- **Drive App**: <http://localhost:3000/drive>
- **Photos App**: <http://localhost:3000/photos>
- **API Documentation**: <http://localhost:8000/docs>

**With Backend Serving Frontend:**
- **Main Interface**: <http://localhost:8000>
- **API Documentation**: <http://localhost:8000/docs>
- **Health Check**: <http://localhost:8000/health>

## Authentication Flow

1. Users can register/login through either the Drive or Photos interface
2. Both interfaces use the same authentication API
3. JWT tokens are stored in localStorage
4. Protected routes redirect to appropriate login pages
5. Users stay logged in across both applications

## API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /health` - Health check

## Storage Structure

When a user registers, the system automatically creates a dedicated folder structure:

```
nas_storage/
└── users/
    └── [12-digit-user-id]/
        ├── drive/
        │   ├── documents/
        │   └── uploads/
        └── photos/
            ├── uploads/
            └── thumbnails/
```

- Each user gets a unique 12-digit alphanumeric ID
- The `drive` folder stores all file uploads from the Drive interface
- The `photos` folder stores all photo/video uploads from the Photos interface
- Thumbnails are automatically generated and cached in the `thumbnails` subfolder

## Environment Variables

Backend `.env` file:
```
DATABASE_URL=postgresql://nascloud:nascloud@localhost:5432/nascloud
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
NAS_STORAGE_PATH=./nas_storage
```

**Important**: Set `NAS_STORAGE_PATH` to your actual NAS mount point in production.

## Development Notes

- The backend runs on port 8000
- The frontend runs on port 3000 with API proxy configuration
- Database runs on port 5432
- Redis runs on port 6379 (for future job queue implementation)

## Next Steps

The current implementation provides:
- ✅ User registration and authentication
- ✅ Dual login interfaces (Drive/Photos)
- ✅ Protected routes
- ✅ JWT token management
- ✅ Responsive UI design

Coming next:
- File upload and management
- Photo timeline and gallery
- Folder organization
- Search functionality
- Sharing capabilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

- **Drive**: File management with upload, download, folder organization, and search
- **Photos**: Timeline view with EXIF data, thumbnails, and lightbox gallery
- **Multi-user**: Authentication and user isolation
- **Cross-platform**: Native installers for Windows, macOS, and Linux

## Architecture

- **Backend**: FastAPI + SQLModel + PostgreSQL
- **Worker**: Dramatiq for background tasks (thumbnails, video processing)
- **Frontend**: React + TypeScript with Vite
- **Packaging**: PyInstaller for standalone binaries

## Quick Start

### Development Setup

1. **Prerequisites**:
   - Python 3.11+
   - Node.js 18+
   - Docker & Docker Compose
   - PostgreSQL 16

2. **Clone and setup**:
   ```bash
   git clone https://github.com/TheGhoul27/NAS-Cloud.git
   cd NAS-Cloud
   ```

3. **Backend setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Database setup**:
   ```bash
   docker compose up -d db cache
   ```

5. **Start development servers**:
   ```bash
   # Terminal 1: Backend API
   uvicorn nas_cloud.app.main:app --reload

   # Terminal 2: Background worker
   dramatiq nas_cloud.worker.tasks --processes 1 --threads 4

   # Terminal 3: Frontend
   cd frontend
   npm install
   npm run dev
   ```

## Project Structure

```
nas_cloud/
├── backend/           # Python FastAPI backend
│   ├── nas_cloud/
│   │   ├── app/       # FastAPI application
│   │   └── worker/    # Background tasks
│   └── tests/
├── frontend/          # React frontend
│   ├── src/
│   └── public/
├── infra/             # Docker and deployment
└── docs/              # Documentation
```

## Development Timeline

- **Sprint 1** (Jul 14-20): Auth & DB foundation
- **Sprint 2** (Jul 21-27): File API + Drive MVP
- **Sprint 3** (Jul 28-Aug 3): Worker & media assets
- **Sprint 4** (Aug 4-10): Photos timeline
- **Sprint 5** (Aug 11-17): Search & trash recovery
- **Sprint 6** (Aug 18-24): Packaging & auto-start
- **Sprint 7** (Aug 25-31): Cross-platform installers
- **Sprint 8** (Sep 1-7): Polish & hardening

## License

MIT License - see LICENSE file for details.