FROM node:20-alpine

# Instala Chromium y dependencias
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

# Define la ruta del binario de Chrome para Puppeteer y jsreport
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Crea un usuario sin privilegios
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /app

# Copia dependencias y ajusta permisos
COPY --chown=appuser:appgroup package*.json ./

# Instala dependencias sin descargar Chromium
RUN npm install --no-audit --loglevel=error

# Copia el resto del código fuente
COPY --chown=appuser:appgroup . .

# Genera Prisma si lo usas
RUN npx prisma generate

# Compila el proyecto
RUN npm run build

EXPOSE 3005

CMD ["npm", "run", "start"]
