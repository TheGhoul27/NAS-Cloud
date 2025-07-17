# NAS-Cloud

A Python-first personal cloud solution providing Google Drive and Google Photos-like functionality for your NAS.

## Features

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