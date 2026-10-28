# GLGBot - Bot + Web-Dashboard in einem Container (beide sprechen intern über 127.0.0.1:3101)
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Name/Branding für das Dashboard wird beim Bauen eingesetzt (siehe docker-compose.yml)
ARG COMMUNITY_NAME=""
ARG BOT_NAME=""
ARG DASHBOARD_URL=""
ENV COMMUNITY_NAME=${COMMUNITY_NAME} \
    BOT_NAME=${BOT_NAME} \
    DASHBOARD_URL=${DASHBOARD_URL}

# 1) Abhängigkeiten (eigene Schicht -> schnellere Updates)
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY web/package.json web/package-lock.json ./web/
RUN cd web && npm ci --include=dev

# 2) Quellcode & Build
COPY . .
RUN npm run build && cd web && npm run build

# 3) Prozess-Manager
RUN npm install -g pm2@6 && mkdir -p /app/data /app/config

EXPOSE 3000
VOLUME ["/app/data", "/app/config"]
CMD ["pm2-runtime", "ecosystem.config.js"]
