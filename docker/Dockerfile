FROM node:20-alpine as build-frontend

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend .
RUN npm run build

FROM node:20-alpine as build-backend

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/dist ./dist

FROM nginx:alpine

RUN mkdir -p /app/data /app/media /app/thumbnails /app/import /app/export

COPY --from=build-backend /app/node_modules /app/node_modules
COPY --from=build-backend /app/dist /app/dist
COPY --from=build-backend /app/prisma /app/prisma

COPY --from=build-frontend /app/dist /usr/share/nginx/html

COPY docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 3000

CMD ["sh", "-c", "node /app/dist/server.js & nginx -g 'daemon off;'"]