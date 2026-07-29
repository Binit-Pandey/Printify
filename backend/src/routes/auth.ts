import { Router } from 'express';
import { wrap } from './wrap';
import { AuthService } from '../services/authService';

const router = Router();

// Get the base URL for email verification links
const getVerificationBaseUrl = (req: any): string => {
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:5173';
  // For development, adjust as needed
  return `http://localhost:5173`;
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  wrap((req, res) => {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
      return;
    }

    const verificationBaseUrl = getVerificationBaseUrl(req);

    AuthService.register(
      { email, password, firstName, lastName },
      verificationBaseUrl
    ).then((result) => {
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    });
  })
);

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post(
  '/verify-email',
  wrap((req, res) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
      return;
    }

    const result = AuthService.verifyEmail(token);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * GET /api/auth/verify-email?token=...
 * Verify email with token from URL (for email links)
 */
router.get(
  '/verify-email',
  wrap((req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
      return;
    }

    const result = AuthService.verifyEmail(token);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post(
  '/resend-verification',
  wrap(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const verificationBaseUrl = getVerificationBaseUrl(req);
    const result = await AuthService.resendVerification(email, verificationBaseUrl);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  wrap((req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    const result = AuthService.login({ email, password });
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  })
);

/**
 * GET /api/auth/verification-status?email=...
 * Get verification status for an email
 */
router.get(
  '/verification-status',
  wrap((req, res) => {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    const status = AuthService.getVerificationStatus(email);
    res.json(status);
  })
);

export default router;
