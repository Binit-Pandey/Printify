import { db } from '../db';
import {
  generateToken,
  hashToken,
  hashPassword,
  verifyPassword,
  getTokenExpiration,
  isTokenExpired,
  generateId,
} from '../utils/crypto';
import { EmailService } from './emailService';

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ResendVerificationInput {
  email: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(
    input: RegisterInput,
    verificationBaseUrl: string
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    // Check if user already exists
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(input.email) as { id: string } | undefined;

    if (existingUser) {
      return {
        success: false,
        message: 'Email already registered',
      };
    }

    try {
      // Create user
      const userId = generateId('user_');
      const { hash, salt } = hashPassword(input.password);
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO users (id, email, passwordHash, firstName, lastName, isEmailVerified, status, createdAt, updatedAt)
         VALUES (@id, @email, @passwordHash, @firstName, @lastName, 0, 'pending', @createdAt, @updatedAt)`
      ).run({
        id: userId,
        email: input.email,
        passwordHash: `${hash}:${salt}`, // Store hash:salt together
        firstName: input.firstName || '',
        lastName: input.lastName || '',
        createdAt: now,
        updatedAt: now,
      });

      // Generate and store verification token
      const token = generateToken();
      const tokenHash = hashToken(token);
      const tokenId = generateId('token_');
      const expiresAt = getTokenExpiration(24);

      db.prepare(
        `INSERT INTO emailVerificationTokens (id, userId, token, tokenHash, type, expiresAt, createdAt)
         VALUES (@id, @userId, @token, @tokenHash, @type, @expiresAt, @createdAt)`
      ).run({
        id: tokenId,
        userId,
        token: token, // Store raw token temporarily for this demo
        tokenHash,
        type: 'verification',
        expiresAt,
        createdAt: now,
      });

      // Send verification email
      const verificationUrl = `${verificationBaseUrl}/verify-email`;
      const emailSent = await EmailService.sendVerificationEmail(
        input.email,
        input.firstName || 'User',
        token,
        verificationUrl
      );

      if (!emailSent) {
        console.warn(`[AUTH SERVICE] Email delivery failed for ${input.email}`);
      }

      return {
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        userId,
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.',
      };
    }
  }

  /**
   * Verify email with token
   */
  static verifyEmail(token: string): { success: boolean; message: string; userId?: string } {
    try {
      const tokenHash = hashToken(token);

      // Find token
      const record = db
        .prepare(
          `SELECT id, userId, expiresAt, usedAt FROM emailVerificationTokens WHERE tokenHash = ?`
        )
        .get(tokenHash) as any;

      if (!record) {
        return {
          success: false,
          message: 'Invalid or expired verification token',
        };
      }

      // Check if already used
      if (record.usedAt) {
        return {
          success: false,
          message: 'This verification token has already been used',
        };
      }

      // Check expiration
      if (isTokenExpired(record.expiresAt)) {
        return {
          success: false,
          message: 'Verification token has expired',
        };
      }

      const now = new Date().toISOString();

      // Mark token as used
      db.prepare('UPDATE emailVerificationTokens SET usedAt = ? WHERE id = ?').run(
        now,
        record.id
      );

      // Update user as verified
      db.prepare(
        `UPDATE users SET isEmailVerified = 1, status = 'active', updatedAt = ? WHERE id = ?`
      ).run(now, record.userId);

      return {
        success: true,
        message: 'Email verified successfully! You can now login.',
        userId: record.userId,
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Email verification error:', error);
      return {
        success: false,
        message: 'Verification failed. Please try again.',
      };
    }
  }

  /**
   * Resend verification email with rate limiting
   */
  static async resendVerification(
    email: string,
    verificationBaseUrl: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user
      const user = db
        .prepare('SELECT id, email, firstName, isEmailVerified FROM users WHERE email = ?')
        .get(email) as any;

      if (!user) {
        return {
          success: false,
          message: 'Email not found',
        };
      }

      if (user.isEmailVerified) {
        return {
          success: false,
          message: 'Email is already verified',
        };
      }

      // Check rate limiting: max 3 resends per hour
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const recentResends = db
        .prepare(
          `SELECT COUNT(*) as count FROM emailVerificationTokens 
           WHERE userId = ? AND type = 'resend' AND createdAt > ?`
        )
        .get(user.id, oneHourAgo) as { count: number };

      if (recentResends.count >= 3) {
        return {
          success: false,
          message: 'Too many resend attempts. Please try again in 1 hour',
        };
      }

      // Invalidate old tokens
      db.prepare(
        `UPDATE emailVerificationTokens SET expiresAt = ? WHERE userId = ? AND usedAt IS NULL`
      ).run(new Date().toISOString(), user.id);

      // Generate new token
      const token = generateToken();
      const tokenHash = hashToken(token);
      const tokenId = generateId('token_');
      const expiresAt = getTokenExpiration(24);
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO emailVerificationTokens (id, userId, token, tokenHash, type, expiresAt, createdAt)
         VALUES (@id, @userId, @token, @tokenHash, @type, @expiresAt, @createdAt)`
      ).run({
        id: tokenId,
        userId: user.id,
        token: token,
        tokenHash,
        type: 'resend',
        expiresAt,
        createdAt: now,
      });

      // Send verification email
      const verificationUrl = `${verificationBaseUrl}/verify-email`;
      const emailSent = await EmailService.sendResendVerificationEmail(
        user.email,
        user.firstName || 'User',
        token,
        verificationUrl
      );

      if (!emailSent) {
        console.warn(`[AUTH SERVICE] Email delivery failed for ${user.email}`);
      }

      return {
        success: true,
        message: 'Verification email sent! Check your inbox.',
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Resend verification error:', error);
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  /**
   * Login user
   */
  static login(input: LoginInput): { success: boolean; message: string; user?: any } {
    try {
      const user = db
        .prepare('SELECT id, email, firstName, lastName, passwordHash, isEmailVerified FROM users WHERE email = ?')
        .get(input.email) as any;

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return {
          success: false,
          message: 'Email not verified. Please check your inbox or request a new verification link.',
        };
      }

      // Verify password
      const [hash, salt] = user.passwordHash.split(':');
      if (!verifyPassword(input.password, hash, salt)) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Record login attempt
      const attemptId = generateId('login_');
      db.prepare(
        `INSERT INTO loginAttempts (id, email, success, timestamp) VALUES (@id, @email, @success, @timestamp)`
      ).run({
        id: attemptId,
        email: input.email,
        success: 1,
        timestamp: new Date().toISOString(),
      });

      // Update last login
      db.prepare('UPDATE users SET updatedAt = ? WHERE id = ?').run(
        new Date().toISOString(),
        user.id
      );

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: user.isEmailVerified,
        },
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.',
      };
    }
  }

  /**
   * Get verification status
   */
  static getVerificationStatus(
    email: string
  ): { isVerified: boolean; canResend: boolean; expiresAt?: string } {
    try {
      const user = db
        .prepare('SELECT isEmailVerified FROM users WHERE email = ?')
        .get(email) as any;

      if (!user) {
        return { isVerified: false, canResend: false };
      }

      const token = db
        .prepare(
          `SELECT expiresAt FROM emailVerificationTokens 
           WHERE userId = (SELECT id FROM users WHERE email = ?) 
           AND usedAt IS NULL
           ORDER BY createdAt DESC LIMIT 1`
        )
        .get(email) as any;

      return {
        isVerified: user.isEmailVerified,
        canResend: !token || isTokenExpired(token.expiresAt),
        expiresAt: token?.expiresAt,
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Get verification status error:', error);
      return { isVerified: false, canResend: false };
    }
  }
}
