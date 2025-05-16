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

# Crear un usuario no-root para ejecutar Chromium
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

WORKDIR /app

COPY package*.json ./

# Instalar NestJS CLI globalmente
RUN npm install -g @nestjs/cli

# Instalar dependencias del proyecto
RUN npm install --no-audit --loglevel=error

COPY . .

RUN npx prisma generate
RUN npm run build

# Cambiar los permisos de los archivos para que pptruser pueda acceder a ellos
RUN chown -R pptruser:pptruser /app

# Cambia al usuario no-root
USER pptruser

EXPOSE 3005

# Usar dumb-init como entrypoint para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]