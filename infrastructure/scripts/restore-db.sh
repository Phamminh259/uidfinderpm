#!/usr/bin/env bash
# Khôi phục PostgreSQL từ file sao lưu.  Cách dùng: ./restore-db.sh infrastructure/backups/<file>.sql.gz
# CẢNH BÁO: ghi đè dữ liệu hiện tại.
set -euo pipefail

FILE="${1:?Cần truyền đường dẫn file .sql.gz}"
[ -f "$FILE" ] || { echo "Không tìm thấy $FILE"; exit 1; }

cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a

read -r -p "Dữ liệu hiện tại sẽ bị ghi đè. Gõ 'yes' để tiếp tục: " ok
[ "$ok" = "yes" ] || { echo "Đã hủy."; exit 1; }

gunzip -c "$FILE" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1
echo "Khôi phục hoàn tất."
