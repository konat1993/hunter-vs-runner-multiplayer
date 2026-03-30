FROM node:20-alpine AS builder

# Build context is repo root (see docker-compose). Frontend lives in /app;
# Vite alias @map-config resolves to ../backend/src/map-config.ts → /backend/src/map-config.ts.
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
COPY backend/src/map-config.ts /backend/src/map-config.ts
COPY backend/src/maze-generator.ts /backend/src/maze-generator.ts

RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
# Build context is repo root (docker-compose); config lives under frontend/
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
