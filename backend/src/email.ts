import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST_2 || process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER_2 || process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS_2 || process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const hasSmtpCredentials = Boolean(smtpUser && smtpPass);

const transporter = hasSmtpCredentials
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser!,
        pass: smtpPass!,
      },
    })
  : null;

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

  if (!transporter || !smtpFrom) {
    console.log(`📧 [OTP] Email to ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
    html,
  });
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

  if (!transporter || !smtpFrom) {
    console.log(`📧 [RESET] Email to ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
    html,
  });
}
