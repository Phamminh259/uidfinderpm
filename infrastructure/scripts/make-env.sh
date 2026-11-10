#!/usr/bin/env bash
# Sinh file .env production với mật khẩu và khóa ngẫu nhiên.
#   bash make-env.sh uidfinder.site                 # ghi /opt/uidfinder/.env
#   bash make-env.sh uidfinder.site /đường/dẫn/.env # ghi chỗ khác
# Không ghi đè file đã tồn tại (tránh mất mật khẩu database đang dùng).
set -euo pipefail

DOMAIN="${1:?Cách dùng: make-env.sh <domain> [file_đầu_ra]}"
OUT="${2:-/opt/uidfinder/.env}"

[ -e "$OUT" ] && { echo "$OUT đã tồn tại, không ghi đè. Xóa hoặc đổi tên nếu thật sự muốn tạo lại."; exit 1; }
command -v openssl >/dev/null || { echo "Thiếu openssl"; exit 1; }
case "$DOMAIN" in *[!a-zA-Z0-9.-]*|"") echo "Domain không hợp lệ: $DOMAIN"; exit 1;; esac

PG_PASS="$(openssl rand -hex 24)"
RD_PASS="$(openssl rand -hex 24)"
JWT_ACCESS="$(openssl rand -hex 32)"
JWT_REFRESH="$(openssl rand -hex 32)"
IP_SALT="$(openssl rand -hex 32)"

umask 077
cat > "$OUT" <<EOF
# ===== Chung =====
NODE_ENV=production
APP_DOMAIN=${DOMAIN}
PUBLIC_SITE_URL=https://${DOMAIN}

# ===== PostgreSQL =====
POSTGRES_USER=uidfinder
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=uidfinder
DATABASE_URL=postgresql://uidfinder:${PG_PASS}@postgres:5432/uidfinder?schema=public

# ===== Redis =====
REDIS_PASSWORD=${RD_PASS}
REDIS_URL=redis://:${RD_PASS}@redis:6379

# ===== Backend =====
BACKEND_PORT=4000
CORS_ORIGIN=https://${DOMAIN}
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
ANALYTICS_IP_SALT=${IP_SALT}
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_MINUTES=15
UID_RATE_LIMIT_PER_MINUTE=10
UID_CACHE_TTL_SECONDS=86400

# ===== Frontend =====
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
NEXT_PUBLIC_API_URL=/api
INTERNAL_API_URL=http://backend:4000
EOF

# Nếu chạy bằng root và user deploy tồn tại thì giao quyền sở hữu cho deploy (CI cần đọc file này).
if [ "$(id -u)" -eq 0 ] && id deploy >/dev/null 2>&1; then
  chown deploy:deploy "$OUT"
fi
chmod 600 "$OUT"
echo "Đã tạo $OUT (quyền 600). Hãy sao lưu file này vào nơi an toàn."
