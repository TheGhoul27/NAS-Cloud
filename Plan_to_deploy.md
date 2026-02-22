# NAS-Cloud Deployment Plan (Single Docker Image for Pi + Standalone Executable Option)

## 1. Goal

Deploy NAS-Cloud as one artifact across multiple devices, with persistent data and reliable updates.

This repository now includes:

- `Dockerfile` (single image: backend + built Drive + built Photos)
- `docker-compose.pi.yml` (Pi runtime + optional Watchtower autoupdate)
- `deploy/pi/deploy.sh` (first deploy)
- `deploy/pi/update.sh` (manual update)

---

## 2. Docker Path (Primary)

### 2.1 What the image contains

- Python FastAPI backend
- Drive frontend build (`dist-drive`)
- Photos frontend build (`dist-photos`)

Runtime entry points:

- Drive: `http://<host>:8000/drive`
- Photos: `http://<host>:8000/photos`
- API docs: `http://<host>:8000/docs`
- Health: `http://<host>:8000/health`

### 2.2 Persistent data (critical)

All persistent files live under `/data` (mounted from host):

- `/data/nas_cloud.db`
- `/data/nas_storage/`

In `docker-compose.pi.yml`, this is mapped as:

```yaml
volumes:
  - ./data:/data
```

This means container/image replacement does not delete user data.

### 2.3 Local build and run

From repo root:

```bash
docker compose -f docker-compose.pi.yml up -d --build nas-cloud
```

Or using helper script on Pi:

```bash
chmod +x deploy/pi/deploy.sh
./deploy/pi/deploy.sh
```

### 2.4 Enable auto-update

Two supported modes:

1) Watchtower (fully unattended):

```bash
docker compose -f docker-compose.pi.yml --profile autoupdate up -d watchtower
```

2) Controlled manual update (recommended for safer rollouts):

```bash
chmod +x deploy/pi/update.sh
./deploy/pi/update.sh
```

### 2.5 Publish and pull multi-arch image

Build and push one tag for multiple device architectures:

```bash
docker buildx create --name nasbuilder --use
docker buildx inspect --bootstrap

docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  -t ghcr.io/<your-org>/nas-cloud:latest \
  -t ghcr.io/<your-org>/nas-cloud:1.0.0 \
  --push .
```

Then on each device, set the image and deploy:

```bash
export NAS_CLOUD_IMAGE=ghcr.io/<your-org>/nas-cloud:latest
docker compose -f docker-compose.pi.yml up -d
```

### 2.6 Rollback strategy

If a new version fails:

```bash
export NAS_CLOUD_IMAGE=ghcr.io/<your-org>/nas-cloud:<previous-tag>
docker compose -f docker-compose.pi.yml up -d
```

Because `/data` is external, rollback keeps DB/files intact.

---

## 3. Access from Anywhere (after Docker deployment)

Recommended order:

1) VPN overlay (Tailscale/WireGuard) — safest
2) Cloudflare Tunnel — easy public access without open inbound ports
3) Router port forwarding + reverse proxy TLS — most control, more ops overhead

Do not expose plain HTTP directly to internet.

---

## 4. Standalone Executable Path (Alternative)

Use this if Docker is unavailable.

### 4.1 Packaging model

- Build frontend assets first (`dist-drive`, `dist-photos`)
- Package Python backend using PyInstaller
- Include frontend dist folders with executable
- Start local web server from executable

### 4.2 Build steps per OS

Build on each target OS for best compatibility:

- Windows: `.exe` + installer (Inno Setup/MSIX)
- Linux: AppImage or `.deb`
- macOS: `.app` + notarized `.dmg`

### 4.3 Persistent data locations

Never write DB/files to installation directory.

- Windows: `%ProgramData%/NASCloud` (service) or `%AppData%/NASCloud` (user)
- Linux: `/var/lib/nascloud` (service) or `~/.local/share/nascloud`
- macOS: `~/Library/Application Support/NASCloud`

Store:

- `nas_cloud.db`
- `nas_storage/`

### 4.4 Auto-update for executable apps

Use one of:

- Built-in updater framework (Tauri/Electron style)
- External signed-update manifest service

Minimum update requirements:

- signed binaries
- HTTPS update endpoint
- semantic versioning
- one-version rollback cache

---

## 5. Operational Checklist

- [ ] `docker compose -f docker-compose.pi.yml up -d --build` succeeds
- [ ] `http://<host>:8000/health` returns healthy
- [ ] `http://<host>:8000/drive` loads
- [ ] restart keeps data (`docker restart nas-cloud`)
- [ ] update succeeds (`deploy/pi/update.sh`)
- [ ] rollback tested with previous tag
- [ ] backups scheduled for `./data`