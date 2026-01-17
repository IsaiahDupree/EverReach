import { Resend } from 'resend';

export function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('Server misconfigured: missing RESEND_API_KEY');
  return new Resend(key);
}

export function defaultFrom(): string {
  // For DMARC/Apple Private Relay alignment, keep From domain equal to the DKIM d= domain.
  // If you verify mail.everreach.app in Resend, use noreply@mail.everreach.app
  // You can override via EMAIL_FROM env.
  return process.env.EMAIL_FROM || 'EverReach <noreply@mail.everreach.app>';
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  headers?: Record<string, string>;
}) {
  const resend = getResendClient();
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];
  const html = (opts.html ?? (opts.text ? `<pre style="white-space:pre-wrap">${escapeHtml(opts.text)}</pre>` : '<p></p>')) as string;
  const res = await resend.emails.send({
    from: opts.from || defaultFrom(),
    to,
    subject: opts.subject,
    html,
    text: opts.text,
    headers: opts.headers,
  });
  return res;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
