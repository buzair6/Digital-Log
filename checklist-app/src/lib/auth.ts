import { hash, compare } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return compare(password, hashedPassword);
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createUser(email: string, password: string, fullName?: string, role: string = 'USER') {
  const hashedPassword = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      fullName,
      role,
    },
  });
}

export async function validateUserCredentials(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) return null;

  return user;
}
