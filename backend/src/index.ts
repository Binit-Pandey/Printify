import { startServer } from './server';

// Safety net: prevent unhandled errors from crashing the process
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

startServer()
  .then(() => {
    console.log('✅ PrintPress ERP backend ready');
  })
  .catch((err) => {
    console.error('[FATAL] Failed to start backend:', err);
    process.exit(1);
  });