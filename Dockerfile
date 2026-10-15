FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
COPY frontend/scripts ./scripts
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# Prevent local Expo env files and local API URLs from affecting the public build.
ENV EXPO_NO_DOTENV=1
ENV EXPO_PUBLIC_BACKEND_URL=""
ENV EXPO_PUBLIC_HIDE_DEMO_ACCOUNTS=true
RUN npx expo export --platform web --clear && node scripts/prepare-pwa.js

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements-hosted.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/server.py backend/hosted.py ./backend/
COPY --from=web /web/dist ./frontend/dist
ENV PYTHONUNBUFFERED=1
ENV DB_NAME=ace_fisio_partner_demo
ENV SEED_DEMO=false
EXPOSE 10000
CMD ["python", "backend/hosted.py"]
