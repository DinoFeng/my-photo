FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/dist ./dist
COPY backend/prisma ./prisma

RUN mkdir -p data media thumbnails import export

EXPOSE 3000

CMD ["npm", "start"]