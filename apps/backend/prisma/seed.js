/* Tạo SUPER_ADMIN đầu tiên. JS thuần để chạy được cả trong image production:
 *   Dev:  npm run seed:admin
 *   Prod: docker compose -f docker-compose.prod.yml exec \
 *           -e SEED_ADMIN_EMAIL=... -e SEED_ADMIN_PASSWORD=... backend node prisma/seed.js
 */
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';

  if (!email || !password) {
    throw new Error('Cần đặt SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD');
  }
  if (password.length < 10 || password.startsWith('DOI_')) {
    throw new Error('SEED_ADMIN_PASSWORD phải được đổi và dài tối thiểu 10 ký tự');
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Tài khoản ${email} đã tồn tại, bỏ qua.`);
    return;
  }

  await prisma.adminUser.create({
    data: {
      email,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    },
  });
  console.log(`Đã tạo SUPER_ADMIN: ${email}`);
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
