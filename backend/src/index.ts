import express from 'express';
import cors from 'cors';
import './db'; // initialises DB and seeds on first run

// Safety net: prevent unhandled errors from crashing the process
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

import customersRouter from './routes/customers';
import inventoryRouter from './routes/inventory';
import vendorsRouter from './routes/vendors';
import expensesRouter from './routes/expenses';
import billsRouter from './routes/bills';
import settingsRouter from './routes/settings';
import vendorPaymentsRouter from './routes/vendorPayments';
import authRouter from './routes/auth';
import staffRouter from './routes/staff';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = 3001;

const allowedOrigins = new Set([
  'http://localhost:5000',
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
]);
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/bills', billsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/vendor-payments', vendorPaymentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/staff', staffRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Must be registered AFTER all routes
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
