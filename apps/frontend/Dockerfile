# Build context: thư mục gốc của monorepo
#   docker build -f apps/frontend/Dockerfile -t uidfinder-frontend .
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
# Nếu đã có package-lock.json, đổi `npm install` thành `npm ci`.
RUN npm install --workspace apps/frontend --include-workspace-root

COPY apps/frontend apps/frontend

# Biến NEXT_PUBLIC_* được nhúng vào bundle lúc build.
ARG NEXT_PUBLIC_SITE_URL=https://uidfinder.site
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w apps/frontend

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public ./apps/frontend/public

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/frontend/server.js"]
