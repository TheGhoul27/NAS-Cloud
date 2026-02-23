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

**Manual setup:**
```bash
cd frontend
npm install
```

### 4. Start Applications (Recommended)

**Windows (all-in-one):**
```powershell
.\start-all.ps1
```

This starts:
- Backend API on port `8000`
- Drive app on port `3000` (Express + HTTPS)
- Photos app on port `3001` (Express + HTTPS)

## Docker (Persistent Data)

You can run backend + both frontend apps with Docker while keeping storage and database data outside the images.

### What is persisted

- SQLite database file: `docker-data/sqlite/nas_cloud.db`
- NAS file storage: `docker-data/nas_storage`

These folders remain on your host machine, so stopping/rebuilding containers does not delete your data.

### Run with Docker Compose

From project root:

```bash
docker compose up -d --build
```

Backend will be available at:

- API: <http://localhost:8000>
- Docs: <http://localhost:8000/docs>
- Drive app: <http://localhost:3000/login>
- Photos app: <http://localhost:3001/login>

Stop without deleting data:

```bash
docker compose down
```

If you want to delete all persisted data too (destructive):

```bash
docker compose down -v
```

### Notes

- Current compose setup includes backend + Drive frontend + Photos frontend.
- SQLite and NAS storage are persisted on host under `docker-data/`.
- Docker frontend services use HTTP by default (`3000` and `3001`).
- Change `SECRET_KEY` in `docker-compose.yml` before production use.

## Access the Applications

**With Express Frontend + Backend (Current):**
- **Drive App**: <https://localhost:3000/login>
- **Photos App**: <https://localhost:3001/login>
- **Admin (Drive)**: <https://localhost:3000/admin/login>
- **Admin (Photos)**: <https://localhost:3001/admin/login>
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
DATABASE_URL=sqlite:///./nas_cloud.db
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
- Database is SQLite by default (`nas_cloud.db`)
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