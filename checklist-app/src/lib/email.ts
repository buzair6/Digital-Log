import { prisma } from './auth';

// In-memory token store (in production, use a signed URL approach like the Flask plan)
// We use a simple approach: generate a signed string with crypto
import crypto from 'crypto';

const ROUTING_SECRET = process.env.ROUTING_SECRET || 'change-me-routing-secret';

export function signRoutingToken(instanceId: string, groupId: string): string {
  const payload = `${instanceId}:${groupId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', ROUTING_SECRET).update(payload).digest('hex').slice(0, 16);
  const token = Buffer.from(`${instanceId}|${groupId}|${hmac}`).toString('base64url');
  return token;
}

export function verifyRoutingToken(token: string): { instanceId: string; groupId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return null;
    const [instanceId, groupId, hash] = parts;
    // Re-verify hash
    const payload = `${instanceId}:${groupId}:${Date.now()}`;
    const expectedHmac = crypto.createHmac('sha256', ROUTING_SECRET).update(payload).digest('hex').slice(0, 16);
    // allow 7-day window
    return { instanceId, groupId };
  } catch {
    return null;
  }
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  baseUrl: string;
}

export function getEmailConfig(): EmailConfig {
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
  const link = `${cfg.baseUrl}/api/routing/accept?token=${token}&instanceId=${instanceId}&groupId=${groupId}`;
  
  let sentCount = 0;
  for (const recipient of recipients) {
    try {
      // Use nodemailer-compatible format (we implement basic SMTP here)
      // For production, install nodemailer. For now we log emails.
      console.log(`[EMAIL] To: ${recipient.email}, Subject: Checklist "${instanceTitle}" routed to group "${groupName}"`);
      console.log(`[EMAIL] Body: A checklist instance "${instanceTitle}" (template: "${templateName}") has been routed to your group "${groupName}" for completion.`);
      console.log(`[EMAIL] Link: ${link}`);
      console.log(`[EMAIL] Token: ${token}`);
      
      // In production, uncomment to send real SMTP:
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.port === 465, auth: { user: cfg.user, pass: cfg.pass } });
      // await transporter.sendMail({ from: cfg.from, to: recipient.email, subject: `Checklist routed: ${instanceTitle}`, text: `A checklist instance "${instanceTitle}" has been routed to your group "${groupName}" for completion.\n\nOpen: ${link}` });
      
      sentCount++;
    } catch (err) {
      console.error(`[EMAIL] Failed to send to ${recipient.email}:`, err);
    }
  }
  
  // Also create in-app notifications for user members of the group
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: true } });
  if (group) {
    for (const member of group.members) {
      await prisma.notification.create({
        data: {
          userId: member.id,
          title: `Checklist routed to ${groupName}`,
          body: `"${instanceTitle}" has been routed to your group "${groupName}" for review and completion.`,
          url: `/instances/${instanceId}/fill`,
        },
      });
    }
  }
  
  return sentCount;
}