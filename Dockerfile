FROM node:20-alpine

# Instalar Chromium y sus dependencias
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  fontconfig \
  dumb-init \
  udev \
  bash \
  curl \
  libxcomposite \
  libxdamage \
  libxrandr \
  libxshmfence \
  libxi \
  libxcursor \
  libxinerama \
  libxss \
  alsa-lib \
  gtk+3.0 \
  at-spi2-atk \
  at-spi2-core \
  cairo \
  pango

# Variables de entorno requeridas por Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV NODE_ENV=production

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias e instalar
COPY package*.json ./
RUN npm install -g @nestjs/cli
RUN npm install --no-audit --loglevel=error

# Copiar el resto del proyecto
COPY . .

# Generar Prisma e iniciar build
RUN npx prisma generate
RUN npm run build

# Exponer el puerto de la app NestJS
EXPOSE 3005

# Usar dumb-init como entrypoint
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
