/**
 * Email Templates with EverReach Branding
 * Includes logo, consistent styling, and responsive design
 */

import { sendEmail } from './email';

const LOGO_URL = process.env.EMAIL_LOGO_URL || process.env.LOGO_URL || 'https://your-cdn-url/logo.png';
const APP_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ever-reach-be.vercel.app';
const APP_NAME = 'EverReach';

interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

export const emailStyles = `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f7fa;
  }
  .email-container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .email-header {
    padding: 40px 40px 20px;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  .email-logo {
    max-width: 150px;
    height: auto;
  }
  .email-body {
    padding: 40px;
    color: #333333;
    line-height: 1.6;
  }
  .email-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a202c;
    margin: 0 0 20px 0;
  }
  .email-text {
    font-size: 16px;
    color: #4a5568;
    margin: 0 0 20px 0;
  }
  .email-button {
    display: inline-block;
    padding: 14px 32px;
    background-color: #667eea;
    color: #ffffff !important;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    margin: 20px 0;
  }
  .email-button:hover {
    background-color: #5568d3;
  }
  .email-footer {
    padding: 30px 40px;
    text-align: center;
    background-color: #f7fafc;
    border-top: 1px solid #e2e8f0;
  }
  .email-footer-text {
    font-size: 14px;
    color: #718096;
    margin: 5px 0;
  }
  .email-footer-link {
    color: #667eea;
    text-decoration: none;
  }
  @media only screen and (max-width: 600px) {
    .email-body {
      padding: 20px !important;
    }
    .email-header {
      padding: 30px 20px 15px !important;
    }
  }
`;

function getBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <img src="${LOGO_URL}" alt="${APP_NAME}" class="email-logo" />
    </div>
    ${content}
    <div class="email-footer">
      <p class="email-footer-text">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      <p class="email-footer-text">
        <a href="${APP_URL}" class="email-footer-link">Visit Dashboard</a> •
        <a href="${APP_URL}/settings" class="email-footer-link">Manage Preferences</a>
      </p>
      <p class="email-footer-text" style="margin-top: 20px; font-size: 12px;">
        Questions? Reply to this email or contact us at info@everreach.app
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Template definitions
const templates = {
  welcome: (data: EmailTemplateData) => getBaseTemplate(`
    <div class="email-body">
      <h1 class="email-title">Welcome to ${APP_NAME}! 🎉</h1>
      <p class="email-text">Hi ${data.userName || 'there'},</p>
      <p class="email-text">
        Thank you for joining ${APP_NAME}! We're excited to help you build and maintain stronger relationships.
      </p>
      <p class="email-text">
        Get started by exploring your dashboard and connecting your first integration:
      </p>
      <a href="${data.loginLink || APP_URL}" class="email-button">Get Started</a>
      <p class="email-text" style="margin-top: 30px;">
        If you have any questions, our team is here to help. Just reply to this email!
      </p>
    </div>
  `),

  passwordReset: (data: EmailTemplateData) => getBaseTemplate(`
    <div class="email-body">
      <h1 class="email-title">Reset Your Password</h1>
      <p class="email-text">Hi ${data.userName || 'there'},</p>
      <p class="email-text">
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      <a href="${data.resetLink}" class="email-button">Reset Password</a>
      <p class="email-text" style="margin-top: 30px; font-size: 14px; color: #718096;">
        This link will expire in ${data.expiryTime || '1 hour'}. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `),

  notification: (data: EmailTemplateData) => getBaseTemplate(`
    <div class="email-body">
      <h1 class="email-title">${data.title || 'New Notification'}</h1>
      <p class="email-text">Hi ${data.userName || 'there'},</p>
      <p class="email-text">
        ${data.message || 'You have a new notification.'}
      </p>
      ${data.actionLink ? `
        <a href="${data.actionLink}" class="email-button">${data.actionText || 'View Details'}</a>
      ` : ''}
    </div>
  `),

  warmthAlert: (data: EmailTemplateData) => getBaseTemplate(`
    <div class="email-body">
      <h1 class="email-title">🔔 Warmth Alert: ${data.contactName}</h1>
      <p class="email-text">Hi ${data.userName || 'there'},</p>
      <p class="email-text">
        The warmth score for <strong>${data.contactName}</strong> has dropped to ${data.warmthScore}/100.
      </p>
      <p class="email-text">
        Last interaction: ${data.lastInteraction || 'Unknown'}
      </p>
      <p class="email-text">
        It might be a good time to reach out and reconnect.
      </p>
      <a href="${data.contactLink || APP_URL}" class="email-button">View Contact</a>
    </div>
  `),

  digest: (data: EmailTemplateData) => getBaseTemplate(`
    <div class="email-body">
      <h1 class="email-title">Your Weekly Digest 📊</h1>
      <p class="email-text">Hi ${data.userName || 'there'},</p>
      <p class="email-text">
        Here's what happened this week:
      </p>
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0; font-size: 16px;">
          <strong>${data.newContacts || 0}</strong> new contacts added
        </p>
        <p style="margin: 10px 0; font-size: 16px;">
          <strong>${data.interactions || 0}</strong> interactions logged
        </p>
        <p style="margin: 10px 0; font-size: 16px;">
          <strong>${data.warmthAlerts || 0}</strong> warmth alerts
        </p>
      </div>
      <a href="${APP_URL}" class="email-button">View Dashboard</a>
    </div>
  `),

  custom: (data: EmailTemplateData) => getBaseTemplate(`
    <div class="email-body">
      ${data.content || ''}
    </div>
  `),
};

type TemplateName = keyof typeof templates;

export async function sendEmailWithTemplate(opts: {
  to: string | string[];
  subject: string;
  template: TemplateName;
  data?: EmailTemplateData;
  from?: string;
}) {
  const template = templates[opts.template];
  if (!template) {
    throw new Error(`Unknown template: ${opts.template}`);
  }

  const html = template(opts.data || {});

  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html,
    from: opts.from,
  });
}

// Helper for sending branded emails with custom HTML
export async function sendBrandedEmail(opts: {
  to: string | string[];
  subject: string;
  content: string; // HTML content for email body
  from?: string;
}) {
  const html = getBaseTemplate(`<div class="email-body">${opts.content}</div>`);
  
  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html,
    from: opts.from,
  });
}
