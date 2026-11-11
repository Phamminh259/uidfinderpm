#!/usr/bin/env bash
# Cập nhật website trên VPS Ubuntu: lấy code mới từ GitHub, sao lưu DB, build và khởi động lại container.
# Chạy tự động bởi GitHub Actions (.github/workflows/deploy.yml) và cũng chạy tay được:
#   bash /opt/uidfinder/source/infrastructure/scripts/deploy-on-vps.sh
# Biến tùy chọn: APP_DIR (mặc định /opt/uidfinder/source), ENV_FILE (mặc định /opt/uidfinder/.env),
#                BRANCH (mặc định main), DEPLOY_SHA (commit cụ thể; bỏ trống = commit mới nhất của BRANCH).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/uidfinder/source}"
ENV_FILE="${ENV_FILE:-/opt/uidfinder/.env}"
BRANCH="${BRANCH:-main}"
BACKUP_DIR="${BACKUP_DIR:-/opt/uidfinder/backups}"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE")

say() { printf '\n==> %s\n' "$*"; }

[ -d "$APP_DIR/.git" ] || { echo "Không thấy kho git tại $APP_DIR"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "Thiếu file $ENV_FILE (chứa mật khẩu, không nằm trong GitHub)"; exit 1; }
cd "$APP_DIR"

# Khi build/khởi động lỗi, in log backend để biết nguyên nhân ngay trong GitHub Actions.
on_error() {
  echo; echo "!! Triển khai thất bại. Trạng thái và log gần nhất:"
  "${COMPOSE[@]}" ps || true
  "${COMPOSE[@]}" logs --tail=60 backend || true
}
trap on_error ERR

say "1/5 Lấy code mới từ GitHub (nhánh $BRANCH)"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git remote -v | head -1
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Cảnh báo: có file đã sửa trực tiếp trên VPS, sẽ bị ghi đè bởi code từ GitHub:"
  git status --short --untracked-files=no
fi
git fetch --prune origin "$BRANCH"
TARGET="${DEPLOY_SHA:-origin/$BRANCH}"
git reset --hard "$TARGET"
echo "Đang triển khai commit: $(git log -1 --format='%h %s')"

say "2/5 Kiểm tra cấu hình Docker Compose"
"${COMPOSE[@]}" config --quiet

say "3/5 Sao lưu PostgreSQL trước khi cập nhật"
if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx postgres; then
  mkdir -p "$BACKUP_DIR"
  FILE="$BACKUP_DIR/pre-deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
  if "${COMPOSE[@]}" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists' | gzip > "$FILE"; then
    echo "Đã sao lưu: $FILE"
    ls -1t "$BACKUP_DIR"/pre-deploy_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f   # giữ 10 bản gần nhất
  else
    rm -f "$FILE"
    echo "Cảnh báo: không sao lưu được, vẫn tiếp tục triển khai."
  fi
else
  echo "PostgreSQL chưa chạy (lần triển khai đầu tiên), bỏ qua bước sao lưu."
fi

say "4/5 Build image và khởi động lại (backend tự chạy prisma migrate deploy khi khởi động)"
"${COMPOSE[@]}" up -d --build --remove-orphans

say "5/5 Dọn dẹp và kiểm tra"
docker image prune -f >/dev/null
docker builder prune -f --filter 'until=72h' >/dev/null || true
"${COMPOSE[@]}" ps
echo; echo "Hoàn tất."
