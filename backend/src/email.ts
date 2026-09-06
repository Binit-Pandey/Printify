import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { db } from './db';

// SMTP is configurable in-app (Settings → Email/SMTP, stored in the settings
// table) and overridable via environment variables. The database config takes
// precedence, then env vars, then the transport is left unconfigured (the
// verification/reset emails fall back to a console log so development still
// works without an SMTP server).

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function envSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER_2 || process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS_2 || process.env.SMTP_PASS;
  if (!user || !pass) return null;
  return {
    host: process.env.SMTP_HOST_2 || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  };
}

function dbSmtpConfig(): SmtpConfig | null {
  const row = db.prepare(`
    SELECT smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpFrom
    FROM settings WHERE id = 1
  `).get() as {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: number | null;
    smtpUser: string | null;
    smtpPass: string | null;
    smtpFrom: string | null;
  } | undefined;

  if (!row || !row.smtpUser || !row.smtpPass) return null;
  return {
    host: row.smtpHost || 'smtp.gmail.com',
    port: row.smtpPort || 587,
    secure: !!row.smtpSecure,
    user: row.smtpUser,
    pass: row.smtpPass,
    from: row.smtpFrom || row.smtpUser,
  };
}

export function getSmtpConfig(): SmtpConfig | null {
  return dbSmtpConfig() ?? envSmtpConfig();
}

// The transport is re-created only when the effective config changes, so a
// "Save" in Settings takes effect immediately without a restart.
let cachedConfigKey = '';
let cachedTransporter: Transporter | null = null;

function getTransporter(config: SmtpConfig): Transporter {
  const key = `${config.host}|${config.port}|${config.secure}|${config.user}|${config.pass}|${config.from}`;
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<{ delivered: boolean }> {
  const config = getSmtpConfig();
  if (!config) return { delivered: false };
  await getTransporter(config).sendMail({ from: config.from, to, subject, text, html });
  return { delivered: true };
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const subject = 'Your Prime Printify verification code';
  const text = [
    'Prime Printify',
    '',
    `Hi there,`,
    '',
    `Your verification code is: ${code}`,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not request this code, you can safely ignore this email.',
    '',
    '— Prime Printify',
  ].join('\n');
  const html = `
    <div style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; padding: 16px 0 24px;">
          <div style="font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #111827;">PRIME PRINTIFY</div>
        </div>
        <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Verify your email address</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 24px;">
            Use the code below to complete your registration. This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="text-align: center; padding: 16px; background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">${code}</span>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding: 24px 0 0; font-size: 12px; color: #9ca3af;">
          &copy; ${new Date().getFullYear()} Prime Printify. All rights reserved.
        </div>
      </div>
    </div>
  `;

  const delivered = await sendMail(to, subject, text, html);
  if (!delivered.delivered) {
    console.log(`📧 [OTP] Email to ${to}: ${code} (SMTP not configured — set it up in Settings → Email & SMTP)`);
  }
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const subject = 'Your Prime Printify password reset code';
  const text = [
    'Prime Printify',
    '',
    `Hi there,`,
    '',
    `We received a request to reset your password. Your reset code is: ${code}`,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not request this, you can safely ignore this email.',
    '',
    '— Prime Printify',
  ].join('\n');
  const html = `
    <div style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 520px; margin: 0 auto; padding: 32px 16px;">
        <div style="text-align: center; padding: 16px 0 24px;">
          <div style="font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #111827;">PRIME PRINTIFY</div>
        </div>
        <div style="background-color: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">Reset your password</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 24px;">
            Use the code below to set a new password for your account. This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="text-align: center; padding: 16px; background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">${code}</span>
          </div>
          <p style="font-size: 13px; line-height: 1.6; color: #6b7280; margin: 0;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding: 24px 0 0; font-size: 12px; color: #9ca3af;">
          &copy; ${new Date().getFullYear()} Prime Printify. All rights reserved.
        </div>
      </div>
    </div>
  `;

  const delivered = await sendMail(to, subject, text, html);
  if (!delivered.delivered) {
    console.log(`📧 [RESET] Email to ${to}: ${code} (SMTP not configured — set it up in Settings → Email & SMTP)`);
  }
}

export async function sendTestEmail(to: string): Promise<void> {
  const delivered = await sendMail(
    to,
    'Prime Printify — SMTP test',
    `Hello,\n\nThis is a test email confirming that your SMTP settings work.\n\n— Prime Printify`,
    `<div style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
        <div style="text-align:center;padding:16px 0 24px;">
          <div style="font-size:20px;font-weight:700;letter-spacing:1px;color:#111827;">PRIME PRINTIFY</div>
        </div>
        <div style="background-color:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <h1 style="font-size:20px;font-weight:600;color:#111827;margin:0 0 8px;">SMTP test successful</h1>
          <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0;">
            This email was sent with the SMTP settings configured in PrintPress ERP.
          </p>
        </div>
        <div style="text-align:center;padding:24px 0 0;font-size:12px;color:#9ca3af;">
          &copy; ${new Date().getFullYear()} Prime Printify. All rights reserved.
        </div>
      </div>
    </div>`,
  );
  if (!delivered.delivered) {
    throw new Error('SMTP is not configured. Fill in the SMTP details in Settings → Email & SMTP first, then try again.');
  }
}