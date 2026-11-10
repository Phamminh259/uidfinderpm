#!/usr/bin/env bash
# Sao lưu PostgreSQL ra file .sql.gz. Chạy trên VPS tại thư mục gốc dự án.
# Cron mỗi ngày 02:30:  30 2 * * * cd /opt/uidfinder && ./infrastructure/scripts/backup-db.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a

OUT_DIR="infrastructure/backups"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$OUT_DIR"

FILE="$OUT_DIR/uidfinder_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip > "$FILE"

find "$OUT_DIR" -name 'uidfinder_*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "Đã sao lưu: $FILE"
