# UIDFinder

Công cụ tìm **Facebook UID** từ đường dẫn Facebook công khai. Không yêu cầu đăng nhập Facebook, không thu thập mật khẩu, cookie hay token.

> **Trạng thái:** mã nguồn đã được viết đầy đủ nhưng **chưa được biên dịch, lint hay chạy thử toàn hệ thống** (môi trường tạo mã không có mạng để cài thư viện). Đọc [HANDOVER.md](HANDOVER.md) trước khi làm tiếp.

## Công nghệ

Next.js 14 · React 18 · TypeScript · Tailwind CSS · NestJS 10 · PostgreSQL 16 + Prisma 5 · Redis 7 · Nginx · Docker Compose · Ubuntu LTS.

## Cấu trúc

```
apps/frontend     Next.js: trang công khai, SEO, khu /admin
apps/backend      NestJS: UidFinder, Auth, Admin, Analytics, Health, Prisma, Redis
packages/shared   Kiểu dùng chung
infrastructure    Nginx, script backup/restore
docs              Tài liệu hướng dẫn (16 file)
.github/workflows CI/CD: build Docker image, đẩy GHCR, deploy VPS
docker-compose.yml        Dev (PostgreSQL + Redis)
docker-compose.prod.yml   Production (toàn bộ hệ thống + Nginx)
```

## Bắt đầu nhanh (PowerShell)

```powershell
Copy-Item .env.example .env      # rồi sửa theo docs/02
docker compose --env-file .env up -d
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed:admin
npm run dev:backend              # cửa sổ 1
npm run dev:frontend             # cửa sổ 2
```

Website: http://localhost:3000 · Admin: http://localhost:3000/admin

## Tài liệu

| # | Nội dung |
|---|---|
| 01 | [Cài đặt môi trường Windows](docs/01-cai-dat-moi-truong-windows.md) |
| 02 | [Chạy project bằng PowerShell](docs/02-chay-project-powershell.md) |
| 03 | [PostgreSQL và Redis](docs/03-cau-hinh-postgresql-redis.md) |
| 04 | [Git và GitHub](docs/04-git-va-github.md) |
| 05 | [Đưa code lên GitHub](docs/05-dua-code-len-github.md) |
| 06 | [Docker](docs/06-docker.md) |
| 07 | [Deploy VPS Ubuntu](docs/07-deploy-vps-ubuntu.md) |
| 08 | [Kết nối tên miền](docs/08-ket-noi-ten-mien.md) |
| 09 | [Cấu hình DNS](docs/09-cau-hinh-dns.md) |
| 10 | [Cài SSL](docs/10-cai-ssl.md) |
| 11 | [Nginx](docs/11-nginx.md) |
| 12 | [Backup và restore](docs/12-backup-restore-database.md) |
| 13 | [Google Search Console](docs/13-google-search-console.md) |
| 14 | [Tạo admin ban đầu](docs/14-tao-admin-ban-dau.md) |
| 15 | [SEO: tên site, title, mô tả, favicon](docs/15-seo-va-favicon.md) |
| 16 | [Triển khai: GitHub, Actions, VPS, Namecheap (uidfinder.site)](docs/16-trien-khai-github-actions-vps-namecheap.md) |

## Bảo mật

Validate đầu vào (class-validator, whitelist), chống SSRF (chỉ host Facebook, chặn IP nội bộ, kiểm tra từng chặng redirect), rate limit Redis và Nginx, Argon2id, JWT ngắn hạn + refresh token xoay vòng, khóa đăng nhập sai, Helmet và security headers, IP được băm trước khi lưu, PostgreSQL/Redis không publish ra ngoài. **Không commit `.env`.**

## Giới hạn đã biết

- Tra cứu UID phụ thuộc cơ chế chống bot của Facebook; nhiều URL có thể trả lỗi giới hạn truy cập. Hệ thống báo lỗi rõ ràng và không tìm cách vượt qua.
- Logo/favicon cấu hình bằng URL ảnh, chưa có tải ảnh trực tiếp.
- Chưa có kiểm thử end-to-end.
