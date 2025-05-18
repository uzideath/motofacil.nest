FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias necesarias para Chromium y Puppeteer
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxshmfence1 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  dumb-init \
  curl \
  bash \
  ca-certificates \
  procps \
  --no-install-recommends && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# Configuración de Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

# Variables de entorno para WhatsApp Web.js
ENV PUPPETEER_ARGS="--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage,--disable-accelerated-2d-canvas,--no-first-run,--no-zygote,--single-process,--disable-gpu"

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install -g @nestjs/cli
RUN npm install --no-audit --loglevel=error

# Copiar el resto de los archivos
COPY . .

# Crear y configurar el directorio de autenticación de WhatsApp
RUN mkdir -p /app/.wwebjs_auth && \
    chmod -R 777 /app/.wwebjs_auth

# Generar Prisma y construir la aplicación
RUN npx prisma generate
RUN npm run build

# Exponer el puerto
EXPOSE 3005

# Usar dumb-init como punto de entrada para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]