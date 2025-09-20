FROM node:20-alpine

# 1) Dependencias del sistema para Chromium + Prisma en Alpine
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefonts \
  udev \
  libstdc++ \
  openssl \
  libc6-compat

# 2) Variables de entorno (en su propia instrucción, fuera del RUN anterior)
#    Importante: defínelas antes de instalar dependencias de Node
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_BIN=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true \
    NODE_ENV=production

WORKDIR /app

# 3) Habilitar pnpm (con corepack) y usar el lockfile
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 4) Copiar código y construir
COPY . .
# Usa pnpm exec en lugar de pnpx para coherencia
RUN pnpm exec prisma generate
RUN pnpm run build

EXPOSE 3001
CMD ["pnpm", "run", "start"]
