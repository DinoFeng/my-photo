FROM node:20-alpine AS build-shared

WORKDIR /app/packages/shared
COPY packages/shared/package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS build-frontend

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build

FROM node:20-alpine AS build-backend

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src
COPY backend/tsconfig.json ./
COPY backend/logging.json ./
COPY --from=build-shared /app/packages/shared /app/packages/shared
RUN npx tsup src/server.ts --format esm --dts --clean --out-dir dist

FROM node:20-alpine AS build-worker

WORKDIR /app/worker
COPY worker/package*.json ./
RUN npm ci --only=production
COPY worker/src ./src
COPY worker/tsconfig.json ./
COPY worker/logging.json ./
COPY --from=build-shared /app/packages/shared /app/packages/shared
RUN npx tsup src/worker.ts --format esm --dts --clean --out-dir dist

FROM node:20-alpine AS runtime

RUN apk add --no-cache nginx
RUN npm install -g pm2

RUN mkdir -p /app/data /app/media /app/thumbnails /app/import /app/export /app/logs

COPY --from=build-backend /app/backend/dist /app/backend/dist
COPY --from=build-backend /app/backend/node_modules /app/backend/node_modules
COPY --from=build-backend /app/backend/logging.json /app/backend/logging.json

COPY --from=build-worker /app/worker/dist /app/worker/dist
COPY --from=build-worker /app/worker/node_modules /app/worker/node_modules
COPY --from=build-worker /app/worker/logging.json /app/worker/logging.json

COPY --from=build-shared /app/packages/shared /app/packages/shared

COPY --from=build-frontend /app/frontend/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY ecosystem.config.js /app/ecosystem.config.js

EXPOSE 80 3000

CMD ["pm2-runtime", "start", "/app/ecosystem.config.js"]