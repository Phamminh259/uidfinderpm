#!/usr/bin/env bash
# Chuẩn bị VPS Ubuntu 22.04/24.04 mới. Chạy MỘT LẦN bằng root.
#   scp infrastructure\scripts\setup-vps.sh root@IP_VPS:/root/      (từ PowerShell)
#   ssh root@IP_VPS
#   bash /root/setup-vps.sh "ssh-ed25519 AAAA... github-actions-uidfinder"
#
# Làm gì: cập nhật hệ thống; cài Docker (kho chính thức), certbot, ufw; tạo user `deploy`
# (chỉ đăng nhập bằng khóa SSH, thuộc nhóm docker, không có sudo); mở firewall 22/80/443;
# tạo /opt/uidfinder và /var/www/certbot.
# Biến tùy chọn: DEPLOY_USER (mặc định deploy), SSH_PORT (mặc định 22).
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Cần chạy bằng root."; exit 1; }
. /etc/os-release
[ "${ID:-}" = "ubuntu" ] || { echo "Script chỉ hỗ trợ Ubuntu (phát hiện: ${ID:-không rõ})."; exit 1; }

DEPLOY_USER="${DEPLOY_USER:-deploy}"
SSH_PORT="${SSH_PORT:-22}"
PUBKEY="${1:-}"

echo "==> Cập nhật hệ thống"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw certbot git

echo "==> Cài Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

echo "==> Tạo user ${DEPLOY_USER}"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"

install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
AUTH="/home/${DEPLOY_USER}/.ssh/authorized_keys"
touch "$AUTH"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"
chmod 600 "$AUTH"
if [ -n "$PUBKEY" ]; then
  grep -qxF "$PUBKEY" "$AUTH" || echo "$PUBKEY" >> "$AUTH"
  echo "Đã thêm khóa công khai cho ${DEPLOY_USER}."
else
  echo "CHƯA có khóa công khai cho ${DEPLOY_USER}: thêm vào ${AUTH} trước khi dùng GitHub Actions."
fi

echo "==> Thư mục dự án"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/uidfinder
install -d /var/www/certbot

echo "==> Tường lửa (chỉ SSH ${SSH_PORT}, 80, 443)"
ufw allow "${SSH_PORT}/tcp"
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo
echo "HOÀN TẤT. Phiên bản:"
docker --version
docker compose version
certbot --version
echo "Bước tiếp theo: trỏ DNS, tạo .env (make-env.sh), cấp SSL (docs/16, mục 5-6)."
