import { Request, Response, NextFunction } from 'express';

interface SqliteError extends Error {
  code?: string;
}

export function errorHandler(
  err: SqliteError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[error]', err.message);

  // SQLite UNIQUE constraint → 409 Conflict
  if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.message?.includes('UNIQUE constraint')) {
    res.status(409).json({ error: 'A record with that ID already exists' });
    return;
  }

  // SQLite NOT NULL constraint → 400 Bad Request
  if (err.code === 'SQLITE_CONSTRAINT_NOTNULL' || err.message?.includes('NOT NULL constraint')) {
    res.status(400).json({ error: 'Missing required field: ' + err.message });
    return;
  }

  res.status(500).json({ error: err.message ?? 'Internal server error' });
}
