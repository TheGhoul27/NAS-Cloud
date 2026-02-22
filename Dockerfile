FROM node:20-alpine AS frontend-build

WORKDIR /src/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build:all

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DATABASE_URL=sqlite:////data/nas_cloud.db \
    NAS_STORAGE_PATH=/data/nas_storage \
    CORS_ALLOW_ALL=true

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

COPY backend/ /app/
COPY --from=frontend-build /src/frontend/dist-drive /app/frontend/dist-drive
COPY --from=frontend-build /src/frontend/dist-photos /app/frontend/dist-photos

RUN adduser --disabled-password --gecos "" appuser \
    && mkdir -p /data/nas_storage /data/logs \
    && chown -R appuser:appuser /app /data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]