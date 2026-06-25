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
  try {
    const user = await getUserByEmail(email);
    if (!user || !user.isActive) {
      console.log('[AUTH] validate failed: user not found or inactive', { email });
      return null;
    }
    console.log('[AUTH] found user', { email, hasPassword: !!user.passwordHash });
    const ok = await verifyPassword(password, user.passwordHash);
    console.log('[AUTH] password verify', { email, ok });
    return ok ? user : null;
  } catch (error) {
    console.error('[AUTH] validate error', error);
    return null;
  }
}