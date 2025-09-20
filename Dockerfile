FROM node:20-alpine

RUN set -ex; \
    apk update; \
    apk add --no-cache openssl; \
    corepack enable

WORKDIR /app

# Instala dependencias con pnpm usando el lockfile
COPY package.json  ./
RUN npm install

# Copia el código y compila
COPY . .
RUN npx prisma generate
RUN npm run build


EXPOSE 3005
CMD ["sh", "-c", "npm run start"]