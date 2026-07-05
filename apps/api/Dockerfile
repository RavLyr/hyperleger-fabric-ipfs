# ──────────── Stage 1: Base ────────────
FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN corepack enable

# ──────────── Stage 2: Build (Dependencies + Compilation + Prisma Generate) ────────────
FROM base AS build

# Native deps (pkcs11js, bcrypt) need node-gyp build tools
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/.npmrc ./apps/api/
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN pnpm install --filter ipfs-hyperledger-backend... --frozen-lockfile

COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src

WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm build

# ──────────── Stage 3: Runtime ────────────
FROM base AS runtime

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

# Security: run as non-root user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/main.js"]
