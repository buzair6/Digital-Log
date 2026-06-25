import { hash, compare } from 'bcryptjs';
import { prisma } from './prisma';

export { prisma };

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return compare(password, hashedPassword);
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(
  email: string,
  password: string,
  fullName?: string,
  role: 'ADMIN' | 'USER' = 'USER',
) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { email, passwordHash, fullName, role },
  });
}

export async function validateUserCredentials(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || !user.isActive) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}