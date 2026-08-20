# syntax=docker/dockerfile:1

# Debian rather than Alpine: sharp (Strapi's image pipeline) ships glibc
# prebuilds, so the runtime image needs no native toolchain at all.
FROM node:22-bookworm-slim AS build

ENV NODE_ENV=production
WORKDIR /opt/app

# python3/make/g++ only exist in this stage, for any dependency without a
# prebuilt binary for this platform. They are never copied forward.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# The admin panel is a Vite build and is the memory high-water mark of the image.
RUN NODE_OPTIONS=--max-old-space-size=3072 npm run build \
 && npm cache clean --force


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=1337 \
    TINI_KILL_PROCESS_GROUP=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends tini ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app
COPY --from=build --chown=node:node /opt/app /opt/app
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 1337

# tini reaps the children sharp spawns and forwards SIGTERM so a redeploy drains.
ENTRYPOINT ["/usr/bin/tini", "-s", "--", "/usr/local/bin/docker-entrypoint.sh"]
