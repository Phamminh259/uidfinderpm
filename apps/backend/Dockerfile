# Build context: thư mục gốc của monorepo
#   docker build -f apps/backend/Dockerfile -t uidfinder-backend .
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared/package.json packages/shared/
# Nếu đã có package-lock.json, đổi `npm install` thành `npm ci`.
RUN npm install --workspace apps/backend --include-workspace-root

COPY apps/backend apps/backend
RUN npx prisma generate --schema apps/backend/prisma/schema.prisma \
 && npm run build -w apps/backend

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/prisma ./prisma
COPY --from=build /app/apps/backend/package.json ./package.json

USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.BACKEND_PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
