import { prisma } from './auth';

export async function getUserFromRequest(req: Request) {
  try {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization');
    let userId: string | null = null;
    if (auth) {
      const parts = auth.split(' ');
      const token = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : parts[0];
      try {
        userId = Buffer.from(token, 'base64').toString('utf-8');
      } catch (e) {
        userId = null;
      }
    }

    // also check cookie named dev_token for browser requests
    if (!userId) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('dev_token='));
        if (match) {
          const token = match.split('=')[1];
          try {
            userId = Buffer.from(token, 'base64').toString('utf-8');
          } catch (e) {
            userId = null;
          }
        }
      }
    }

    if (!userId) return null;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user;
  } catch (err) {
    return null;
  }
}
