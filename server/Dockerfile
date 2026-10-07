# syntax=docker/dockerfile:1
#
# Base image. TODO(pin): pin it by digest so rebuilds are reproducible and a re-tagged image cannot slip in.
#   docker pull node:22-slim && docker inspect --format '{{index .RepoDigests 0}}' node:22-slim
#   -> node@sha256:<digest>; then build with:
#   docker compose build --build-arg NODE_IMAGE=node:22-slim@sha256:<digest>
# (or set the default below). Re-check the digest when updating Node.
ARG NODE_IMAGE=node:22-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /app
# Toolchain only as a fallback when a native module has no prebuilt binary for the platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3100 DATABASE_PATH=/data/mates.db
WORKDIR /app
# Runtime needs only `node`: drop npm, npx, corepack and yarn (less attack surface).
# Dedicated unprivileged user (uid/gid 10001, no shell, no home) that owns only /data (mode 700).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-* \
  && groupadd --system --gid 10001 mates \
  && useradd --system --uid 10001 --gid 10001 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin mates \
  && mkdir -p /data && chown 10001:10001 /data && chmod 700 /data
COPY --from=build --chown=root:root /app/node_modules ./node_modules
COPY --from=build --chown=root:root /app/dist ./dist
COPY --chown=root:root package.json ./
# /data is the only writable place (the root filesystem is mounted read-only by compose).
VOLUME ["/data"]
USER 10001:10001
EXPOSE 3100
# The server closes Fastify and SQLite cleanly on SIGTERM.
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3100)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
