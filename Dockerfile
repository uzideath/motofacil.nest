FROM node:20-alpine

# Instala Chromium y dependencias necesarias
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  fontconfig \
  dumb-init

# Variables de entorno para jsreport / puppeteer
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

# Instalar NestJS CLI globalmente
RUN npm install -g @nestjs/cli

# Instalar dependencias del proyecto
RUN npm install --no-audit --loglevel=error

COPY . .

RUN npx prisma generate
RUN npm run build

# Mantener como usuario root (no se recomienda por seguridad, pero puede ser necesario)
# USER root (esto es implícito)

EXPOSE 3005

# Usar dumb-init como entrypoint para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]