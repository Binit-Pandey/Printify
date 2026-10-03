import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { join } from 'path';

import customersRouter from './routes/customers';
import inventoryRouter from './routes/inventory';
import vendorsRouter from './routes/vendors';
import expensesRouter from './routes/expenses';
import billsRouter from './routes/bills';
import settingsRouter from './routes/settings';
import vendorPaymentsRouter from './routes/vendorPayments';
import customerPaymentsRouter from './routes/customerPayments';
import authRouter from './routes/auth';
import staffRouter from './routes/staff';
import { errorHandler } from './middleware/errorHandler';

// Builds the Express application. Used by the CLI entrypoint (index.ts) and by
// the Electron main process (which starts the same server programmatically).
export function createApp() {
  const app = express();

  const allowedOrigins = new Set([
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  ]);

  app.use(cors({
    origin: (origin, callback) => {
      // No origin (server-to-server, curl, Electron window on the same local
      // service) or a localhost/file/electron origin is always allowed.
      if (!origin || origin === 'null' || origin === 'file://' || origin.startsWith('file://')) {
        return callback(null, true);
      }
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }));
  // Body size limit. Express defaults to 100kb, which silently rejects expense
  // receipts (base64 photos) and settings data imports with
  // "request entity too large". Allow up to 25mb, which comfortably covers a
  // 5mb receipt plus normal record payloads.
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  app.use('/api/customers', customersRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/vendors', vendorsRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/bills', billsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/vendor-payments', vendorPaymentsRouter);
  app.use('/api/customer-payments', customerPaymentsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/staff', staffRouter);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Production: serve the built React frontend from the same Express server.
  // This lets Electron load one local origin (no CORS / custom protocol) and
  // keeps relative /api URLs working. In development Vite owns the frontend.
  const distDir = join(__dirname, '../../dist');
  if (existsSync(join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    // SPA fallback — but never swallow /api routes.
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(join(distDir, 'index.html'));
    });
  }

  // Unknown API endpoints must answer with JSON. Falling through to Express's
  // default 404 returns an HTML page, which the frontend cannot parse.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Must be registered AFTER all routes
  app.use(errorHandler);

  // Final safety net. Anything that escapes errorHandler (a throw inside the
  // CORS callback, an unhandled rejection in middleware) would otherwise reach
  // Express's default handler, which replies with an HTML page. The frontend
  // cannot parse that and shows a vague "server could not complete" message, so
  // every failure is guaranteed to come back as JSON with a real reason.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    errorHandler(err as Error & { status?: number }, _req, res, _next);
  });

  return app;
}