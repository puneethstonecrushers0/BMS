import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { prisma } from './database/prisma.js';
import { verifyDatabaseInitialization, sanitizeDatabaseUrl } from './database/init.js';

async function startServer() {
  console.log(`[BMS Server] Initializing Boulder & Material Management System...`);
  console.log(`[BMS Server] Connecting to: ${sanitizeDatabaseUrl(ENV.DATABASE_URL)}`);

  // 1. Verify Database and Schema Integrity
  const dbCheck = await verifyDatabaseInitialization();

  if (!dbCheck.connected) {
    console.error(`\n[FATAL] Database connection failed: ${dbCheck.error}`);
    console.error(`[FATAL] Application cannot start without an active PostgreSQL database.`);
    console.error(`[FATAL] Please check your PostgreSQL server status and DATABASE_URL in .env.\n`);
    process.exit(1);
  }

  if (!dbCheck.ready) {
    console.error(`\n[FATAL] Database "${dbCheck.databaseName}" is missing required tables:`);
    dbCheck.missingTables.forEach((table) => console.error(`        - ${table}`));
    console.error(`[FATAL] Pending Prisma migrations must be applied before launching the server.`);
    console.error(`[FATAL] Please run "npm run db:setup" or "npm run db:migrate:deploy".\n`);
    process.exit(1);
  }

  console.log(`[BMS Server] Database "${dbCheck.databaseName}" verified with all tables initialized.`);

  // 2. Start Express HTTP Listener
  const app = createApp();
  const server = app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`[BMS Server] HTTP server accepting traffic on http://localhost:${ENV.PORT} [${ENV.NODE_ENV}]`);
    console.log(`[BMS Server] API Health endpoint: http://localhost:${ENV.PORT}/api/health`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n[BMS Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await prisma.$disconnect();
        console.log('[BMS Server] Database connection released.');
        process.exit(0);
      } catch (err) {
        console.error('[BMS Server] Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force exit if shutdown hangs
    setTimeout(() => {
      console.error('[BMS Server] Forcing shutdown after timeout.');
      process.exit(1);
    }, 8000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[FATAL] Unexpected startup failure:', err);
  process.exit(1);
});
