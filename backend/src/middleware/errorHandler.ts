import { Request, Response, NextFunction } from 'express';
import { dirname, join } from 'path';

interface SqliteError extends Error {
  code?: string;
  status?: number;
  statusCode?: number;
  type?: string;
}

const SQLITE_MESSAGES: Array<[RegExp, string]> = [
  [/UNIQUE constraint failed: ([\w.]+)/i, 'A record with that ID already exists'],
  [/NOT NULL constraint failed: ([\w.]+)/i, 'A required field is missing'],
  [/CHECK constraint failed/i, 'One of the provided values is not allowed'],
  [/FOREIGN KEY constraint failed/i, 'A related record could not be found'],
  [/no such table/i, 'Database is not initialized'],
  [/no such column/i, 'Database schema is outdated'],
];

/** Strips SQLite internals and returns a short human-readable reason. */
function humanize(err: SqliteError): string {
  for (const [pattern, friendly] of SQLITE_MESSAGES) {
    if (pattern.test(err.message)) return friendly;
  }
  // Never leak raw SQL / file paths to the client.
  if (/^(SQLITE_|SQL error)/i.test(err.message)) {
    return 'The record could not be saved';
  }
  return err.message || 'Internal server error';
}

export function errorHandler(
  err: SqliteError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[error]', err);

  const status = err.status ?? err.statusCode;

  // Body parser rejection (e.g. a receipt larger than the limit) → 413
  if (err.type === 'entity.too.large' || status === 413) {
    res.status(413).json({ error: 'That file is too large to upload' });
    return;
  }
  // Malformed JSON → 400 instead of a confusing 500
  if (err.type === 'entity.parse.failed' || status === 400) {
    res.status(400).json({ error: 'The request could not be read' });
    return;
  }

  // SQLite UNIQUE constraint → 409 Conflict
  if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err.message?.includes('UNIQUE constraint')) {
    res.status(409).json({ error: 'A record with that ID already exists' });
    return;
  }

  // SQLite NOT NULL constraint → 400 Bad Request
  if (err.code === 'SQLITE_CONSTRAINT_NOTNULL' || err.message?.includes('NOT NULL constraint')) {
    res.status(400).json({ error: humanize(err) });
    return;
  }

  // better-sqlite3 raises this when a named @placeholder has no matching key —
  // a bug in a route's parameter list rather than bad user input. Answer with a
  // clear 400 and record it, instead of an unexplained 500.
  if (err instanceof RangeError || /Missing named parameter/i.test(err.message)) {
    logServerError(err);
    res.status(400).json({ error: 'That record was missing required fields' });
    return;
  }

  // Foreign key violations mean the parent row is gone (often a stale id in
  // the client after a delete) — actionable, so it is a 400 not a 500.
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || /FOREIGN KEY constraint/i.test(err.message)) {
    res.status(400).json({ error: 'A related record no longer exists' });
    return;
  }

  // Everything else is an unexpected failure. Log it in full to disk so it can
  // be diagnosed after the fact, and return a generic message rather than
  // leaking SQL internals or a stack trace to the client.
  logServerError(err);
  res.status(500).json({ error: 'The server could not complete that request' });
}

/**
 * Appends unexpected errors to a log file next to the database, because the
 * console output is only visible in the terminal that launched the app.
 */
function logServerError(err: SqliteError): void {
  try {
    const { appendFileSync } = require('fs') as typeof import('fs');
    const dir = process.env.PRINTPRESS_DB_PATH
      ? dirname(process.env.PRINTPRESS_DB_PATH)
      : join(__dirname, '../../data');
    appendFileSync(
      join(dir, 'printpress-errors.log'),
      `${new Date().toISOString()} ${err?.stack || err?.message || String(err)}\n\n`
    );
  } catch {
    // Logging must never be the reason a request fails.
  }
}
