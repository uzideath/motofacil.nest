FROM node:20-alpine

# Instala Chromium y dependencias necesarias
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  udev \
  dumb-init \
  bash

# Variables de entorno para jsreport / puppeteer
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Ejecuta como root para evitar problemas de permisos
USER root

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --loglevel=error

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3005

# Importante: tu app DEBE pasar los flags --no-sandbox, etc. ¡NO lo hace solo!
CMD ["npm", "run", "start"]
