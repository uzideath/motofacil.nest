FROM node:20-alpine

# Instala Chromium + dependencias necesarias para jsreport-chrome-pdf
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

# Define ruta al binario de Chromium
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Usa root para evitar problemas de namespace al lanzar Chromium
USER root

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --loglevel=error

COPY . .

# Genera Prisma si lo usas
RUN npx prisma generate

# Compila el proyecto
RUN npm run build

EXPOSE 3005

# Ejecuta como root, pero sin sandbox para evitar problemas de namespaces
CMD ["npm", "run", "start"]
