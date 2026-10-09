# Stage 1: install dependencies and build the client
FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconf \
    cairo-dev \
    pango-dev \
    pixman-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace client


# Stage 2: minimal runtime dependencies
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV LOG_DIR=/app/server/logs

WORKDIR /app

RUN npm init -y \
    && npm pkg set type=module \
    && npm install --omit=dev \
       ws@^8.18.3 \
       pino@^10.4.0 \
       prom-client@^15.1.3 \
       zod@^4.6.5 \
       tsx@^4.23.15

COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/public ./public

RUN mkdir -p /app/server/logs \
    && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "--import", "tsx", "server/src/index.ts"]
