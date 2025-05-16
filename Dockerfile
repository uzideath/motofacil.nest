FROM node:20-alpine

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

ENV CHROME_BIN=/usr/bin/chromium-browser

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

USER appuser

WORKDIR /app

COPY --chown=appuser:appgroup package*.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --no-audit --loglevel=error

COPY --chown=appuser:appgroup . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3005

CMD ["npm", "run", "start"]
