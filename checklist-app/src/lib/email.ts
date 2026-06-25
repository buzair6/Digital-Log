import crypto from 'crypto';
import { prisma } from './prisma';

const ROUTING_SECRET = process.env.ROUTING_SECRET || 'dev-insecure-routing-secret-change-me';
const ROUTING_TTL_SECONDS = 7 * 24 * 3600;

/**
 * Token = base64url(payloadJson).base64url(hmac)
 * payload = { iid, gid, iat, exp }
 */
export function signRoutingToken(instanceId: string, groupId: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ROUTING_TTL_SECONDS;
  const payload = JSON.stringify({ iid: instanceId, gid: groupId, iat, exp });
  const payloadB64 = Buffer.from(payload, 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', ROUTING_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyRoutingToken(
  token: string,
): { instanceId: string; groupId: string } | null {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', ROUTING_SECRET).update(payloadB64).digest('base64url');
    if (sig.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { instanceId: payload.iid, groupId: payload.gid };
  } catch {
    return null;
  }
}

export function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'noreply@example.com',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  };
}

export async function sendRoutingEmails(
  instanceId: string,
  groupId: string,
  groupName: string,
  recipients: { email: string; name?: string }[],
  templateName: string,
  instanceTitle: string,
): Promise<number> {
  if (!recipients.length) return 0;
  const cfg = getEmailConfig();
  const token = signRoutingToken(instanceId, groupId);
  const link = `${cfg.baseUrl}/instances/${instanceId}/fill?t=${token}`;

  let sent = 0;
  for (const r of recipients) {
    console.log(`[EMAIL] -> ${r.email} | Checklist "${instanceTitle}" routed to "${groupName}"`);
    console.log(`[EMAIL]    Template: ${templateName}`);
    console.log(`[EMAIL]    Link: ${link}`);
    sent++;
  }

  // In-app notifications for user members of the group
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: true } });
  if (group) {
    await prisma.notification.createMany({
      data: group.members.map((m: { id: string }) => ({
        userId: m.id,
        title: `Checklist routed to ${groupName}`,
        body: `"${instanceTitle}" has been routed to your group "${groupName}" for completion.`,
        url: `/instances/${instanceId}/fill?t=${token}`,
      })),
    });
  }
  return sent;
}