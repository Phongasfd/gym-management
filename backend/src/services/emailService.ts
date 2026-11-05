import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from '../lib/logger';

let transporter: Transporter | undefined;

export function isEmailConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}

function getTransporter(): Transporter {
  transporter ??= nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  return transporter;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #333; color: white; padding: 20px; text-align: center; border-radius: 5px; }
      .content { padding: 20px; background-color: #f9f9f9; margin: 20px 0; border-radius: 5px; }
      .code-box { background-color: #e8f4f8; border: 2px solid #3498db; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
      .code { font-size: 32px; font-weight: bold; color: #3498db; letter-spacing: 5px; }
      .warning { color: #d9534f; font-size: 14px; margin-top: 15px; }
      .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>ELEVATE Gym</h1></div>
      <div class="content">
        <h2>${title}</h2>
        ${body}
      </div>
      <div class="footer"><p>&copy; 2026 ELEVATE Gym. All rights reserved.</p></div>
    </div>
  </body>
</html>`;
}

// Throws on failure so the outbox worker retries; returns false when e-mail is not configured.
async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.info('E-mail not configured, skipping', { type: 'EMAIL_SKIPPED', to, subject });
    return false;
  }
  await getTransporter().sendMail({ from: process.env.EMAIL_USER, to, subject, html });
  logger.info('E-mail sent', { type: 'EMAIL_SENT', to, subject });
  return true;
}

export async function sendPasswordResetEmail(email: string, resetCode: string): Promise<boolean> {
  try {
    await send(
      email,
      'Password Reset Code - ELEVATE Gym',
      layout(
        'Password Reset Request',
        `<p>Hello,</p>
        <p>We received a request to reset your password for your ELEVATE Gym account. Use the verification code below to proceed with resetting your password.</p>
        <div class="code-box"><p>Your verification code is:</p><div class="code">${escapeHtml(resetCode)}</div></div>
        <p><strong>Important:</strong></p>
        <ul>
          <li>This code will expire in 10 minutes</li>
          <li>If you didn't request a password reset, please ignore this email</li>
          <li>Never share this code with anyone</li>
        </ul>
        <p class="warning">&#x1F6A9; If you didn't request this, your account may be at risk. Please contact our support team immediately.</p>`,
      ),
    );
    return true;
  } catch (err) {
    logger.error('Failed to send password reset email', { email, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function sendSeatAvailableEmail(input: { to: string; memberName: string; className: string; startsAt: Date | null }) {
  const when = input.startsAt ? input.startsAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'TBD';
  return send(
    input.to,
    `You got a seat in ${input.className}`,
    layout(
      'A seat opened up for you',
      `<p>Hi ${escapeHtml(input.memberName)},</p>
      <p>Someone cancelled, so your waitlisted booking for <strong>${escapeHtml(input.className)}</strong> (${escapeHtml(when)}) is now confirmed.</p>
      <p>If you can no longer come, please cancel it in the member portal so the next person gets the seat.</p>`,
    ),
  );
}

export async function sendPaymentReceiptEmail(input: { to: string; memberName: string; packageName: string; amount: string; endDate: Date | null }) {
  const until = input.endDate ? input.endDate.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
  return send(
    input.to,
    'Your ELEVATE Gym membership is active',
    layout(
      'Payment received',
      `<p>Hi ${escapeHtml(input.memberName)},</p>
      <p>We received ${escapeHtml(input.amount)} VND for <strong>${escapeHtml(input.packageName)}</strong>. Your membership is active until ${escapeHtml(until)}.</p>`,
    ),
  );
}

export async function sendPaymentFailedEmail(input: { to: string; memberName: string; packageName: string }) {
  return send(
    input.to,
    'Your ELEVATE Gym payment did not go through',
    layout(
      'Payment not completed',
      `<p>Hi ${escapeHtml(input.memberName)},</p>
      <p>Your payment for <strong>${escapeHtml(input.packageName)}</strong> was not completed. You can try again from the pricing page.</p>`,
    ),
  );
}
