import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('No admin user to reset.');
    return;
  }
  const passwordHash = await hash('admin123', 10);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });
  console.log('Reset admin password to admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());