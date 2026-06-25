import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: admin already exists (${email}) — skipping.`);
    return;
  }
  const passwordHash = await hash('admin123', 10);
  await prisma.user.create({
    data: {
      email,
      fullName: 'System Administrator',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Seed: created admin user.');
  console.log('   email: admin@example.com');
  console.log('   password: admin123');
  console.log('   ⚠ change this password immediately after first login.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());