FROM node:20-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefonts \

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser

WORKDIR /app

# Instala dependencias con pnpm usando el lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copia el código y compila
COPY . .
RUN pnpx prisma generate
RUN pnpm run build

EXPOSE 3001
CMD ["sh", "-c", "pnpm run start"]