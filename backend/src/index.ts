import express from 'express';
import cors from 'cors';
import './db'; // initialises DB and seeds on first run

import customersRouter from './routes/customers';
import inventoryRouter from './routes/inventory';
import vendorsRouter from './routes/vendors';
import expensesRouter from './routes/expenses';
import billsRouter from './routes/bills';
import settingsRouter from './routes/settings';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/customers', customersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/bills', billsRouter);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Must be registered AFTER all routes
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
