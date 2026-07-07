# Built from the monorepo root (see .dockerignore) so npm workspaces can
# correctly link @ga-app/shared-types into apps/api - see the Render Build
# Command notes in DEPLOY.md for why this matters.
FROM node:20-slim AS base
WORKDIR /app

# Prisma's query engine needs OpenSSL, which node:20-slim doesn't include by
# default - without this it silently guesses a version and can fail at
# runtime even though `prisma generate` succeeds at build time.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy everything before `npm ci` (rather than manifests-first for better
# layer caching) because shared-types' `postinstall` build step needs its
# actual source present the moment install runs.
COPY package.json package-lock.json ./
COPY apps/api apps/api
COPY packages/shared-types packages/shared-types
RUN npm ci

RUN npm run prisma:generate --workspace apps/api
RUN npm run build --workspace apps/api

ENV NODE_ENV=production
# Cloud Run injects PORT and expects the container to listen on it - the
# server already reads process.env.PORT, so nothing else to configure here.
EXPOSE 8080

CMD ["sh", "-c", "npm run prisma:deploy --workspace apps/api && npm run start --workspace apps/api"]
