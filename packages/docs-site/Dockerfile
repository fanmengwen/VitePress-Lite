FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable pnpm

# Copy lockfiles first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/docs-site/package.json packages/docs-site/package.json

# Install dependencies required for the docs site build
RUN pnpm install --filter docs-site... --frozen-lockfile

# Copy the rest of the repository (markdown content + source)
COPY . .

# Build the static site with the desired API base URL baked in
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN pnpm --filter docs-site build

FROM node:22-alpine AS production
WORKDIR /app

RUN corepack enable pnpm

# Install only the runtime dependencies needed for the docker server
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/docs-site/package.json packages/docs-site/package.json
RUN pnpm install --filter docs-site... --prod --frozen-lockfile

# Copy built assets and the lightweight proxy server
COPY --from=build /app/packages/docs-site/dist packages/docs-site/dist
COPY packages/docs-site/docker-server.mjs packages/docs-site/docker-server.mjs

ENV PORT=4173
ENV AI_SERVICE_URL=http://ai-service:8000

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4173/health || exit 1

CMD ["pnpm", "--dir", "packages/docs-site", "run", "serve:docker"]
