interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Email service for sending verification emails
 * Currently logs to console for development
 * Can be integrated with SendGrid, Nodemailer, or other providers
 */
export class EmailService {
  /**
   * Send a verification email with token
   */
  static async sendVerificationEmail(
    email: string,
    firstName: string,
    token: string,
    verificationUrl: string
  ): Promise<boolean> {
    const html = this.generateVerificationEmailHTML(firstName, token, verificationUrl);
    const text = this.generateVerificationEmailText(firstName, verificationUrl);

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address - Printify',
      html,
      text,
    });
  }

  /**
   * Send a resend verification email
   */
  static async sendResendVerificationEmail(
    email: string,
    firstName: string,
    token: string,
    verificationUrl: string
  ): Promise<boolean> {
    const html = this.generateResendVerificationEmailHTML(firstName, token, verificationUrl);
    const text = this.generateResendVerificationEmailText(firstName, verificationUrl);

    return this.sendEmail({
      to: email,
      subject: 'Resend: Verify Your Email Address - Printify',
      html,
      text,
    });
  }

  /**
   * Generic email sending function
   * In production, integrate with email provider (SendGrid, Nodemailer, AWS SES, etc.)
   */
  private static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For now, just log to console
      console.log(`📧 [EMAIL SERVICE] Sending email to: ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      console.log(`   HTML Preview: ${options.html.substring(0, 100)}...`);

      // In production, uncomment below and use real email service:
      // const result = await nodemailer.transporter.sendMail({
      //   from: process.env.EMAIL_FROM,
      //   to: options.to,
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text,
      // });
      // return !!result.messageId;

      return true;
    } catch (error) {
      console.error('[EMAIL SERVICE ERROR]', error);
      return false;
    }
  }

  private static generateVerificationEmailHTML(
    firstName: string,
    token: string,
    verificationUrl: string
  ): string {
    const displayUrl = `${verificationUrl}?token=${encodeURIComponent(token)}`;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
            .expires { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; font-size: 14px; }
            .code { background: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 3px; font-weight: bold; color: #667eea; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              
              <p>Thank you for creating an account with Printify! To complete your registration, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${displayUrl}" class="button">Verify Email Address</a>
              </div>

              <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px;"><code>${displayUrl}</code></p>

              <div class="expires">
                ⏱️ <strong>This link expires in 24 hours</strong>
              </div>

              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                If you didn't create this account or need assistance, please contact our support team.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0; color: #999;">© 2026 Printify. All rights reserved.</p>
              <p style="margin: 5px 0 0 0; color: #bbb; font-size: 11px;">If you didn't create this account, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private static generateVerificationEmailText(
    firstName: string,
    verificationUrl: string
  ): string {
    return `
Hi ${firstName},

Thank you for creating an account with Printify! To complete your registration, please verify your email address by visiting the link below:

${verificationUrl}

This link expires in 24 hours.

If you didn't create this account, you can safely ignore this email.

© 2026 Printify. All rights reserved.
    `.trim();
  }

  private static generateResendVerificationEmailHTML(
    firstName: string,
    token: string,
    verificationUrl: string
  ): string {
    const displayUrl = `${verificationUrl}?token=${encodeURIComponent(token)}`;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .footer { font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
            .expires { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              
              <p>We've sent you a new verification link. Please click the button below to verify your email address:</p>
              
              <div style="text-align: center;">
                <a href="${displayUrl}" class="button">Verify Email Address</a>
              </div>

              <p style="color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 12px;"><code>${displayUrl}</code></p>

              <div class="expires">
                ⏱️ <strong>This link expires in 24 hours</strong>
              </div>

              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                Having trouble? Check your spam folder or contact our support team.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0; color: #999;">© 2026 Printify. All rights reserved.</p>
              <p style="margin: 5px 0 0 0; color: #bbb; font-size: 11px;">If you didn't create this account, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private static generateResendVerificationEmailText(
    firstName: string,
    verificationUrl: string
  ): string {
    return `
Hi ${firstName},

We've sent you a new verification link. Please verify your email address by visiting the link below:

${verificationUrl}

This link expires in 24 hours.

Having trouble? Check your spam folder or contact our support team.

© 2026 Printify. All rights reserved.
    `.trim();
  }
}
