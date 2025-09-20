FROM node:20-alpine

RUN set -ex; \
    apk update; \
    apk add --no-cache openssl; \
    corepack enable

WORKDIR /app

# Instala dependencias con pnpm usando el lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copia el código y compila
COPY . .
RUN pnpm run build
RUN pnpx prisma generate

EXPOSE 3005
CMD ["sh", "-c", "pnpm run start"]