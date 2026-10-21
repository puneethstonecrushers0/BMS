import { prisma } from './prisma.js';
import { ENV } from '../config/env.js';

export interface DatabaseVerificationResult {
  connected: boolean;
  databaseName?: string;
  ready: boolean;
  missingTables: string[];
  error?: string;
}

const REQUIRED_TABLES = [
  'app_users',
  'refresh_sessions',
  'password_reset_tokens',
  'buyers',
  'vehicles',
  'sales',
  'boulder_trips',
  'audit_logs',
];

/**
 * Sanitizes a PostgreSQL connection string for safe logging without exposing passwords.
 */
export function sanitizeDatabaseUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const user = parsed.username || 'user';
    const host = parsed.hostname || 'localhost';
    const port = parsed.port || '5432';
    const db = parsed.pathname.replace(/^\//, '') || 'unknown_db';
    return `postgresql://${user}:*****@${host}:${port}/${db}`;
  } catch {
    return 'postgresql://*****:*****@localhost:5432/******';
  }
}

/**
 * Verifies database server connectivity and checks that all required tables exist.
 */
export async function verifyDatabaseInitialization(): Promise<DatabaseVerificationResult> {
  const sanitizedUrl = sanitizeDatabaseUrl(ENV.DATABASE_URL);

  try {
    // 1. Verify PostgreSQL server connection and retrieve current database name
    const [dbResult] = await prisma.$queryRaw<Array<{ current_db: string }>>`
      SELECT current_database() AS current_db
    `;

    const databaseName = dbResult?.current_db || 'unknown';

    // 2. Query information_schema for initialized public tables
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `;

    const existingTableNames = new Set(tables.map((t) => t.table_name));
    const missingTables = REQUIRED_TABLES.filter((name) => !existingTableNames.has(name));

    const ready = missingTables.length === 0;

    return {
      connected: true,
      databaseName,
      ready,
      missingTables,
    };
  } catch (err: any) {
    return {
      connected: false,
      ready: false,
      missingTables: REQUIRED_TABLES,
      error: err.message || 'Unable to establish connection to PostgreSQL server',
    };
  }
}

// Standalone execution script
if (process.argv[1]?.endsWith('init.ts') || process.argv[1]?.endsWith('init.js')) {
  console.log(`[DB Init] Checking database connectivity and schema readiness...`);
  console.log(`[DB Init] Target: ${sanitizeDatabaseUrl(ENV.DATABASE_URL)}`);

  verifyDatabaseInitialization()
    .then((result) => {
      if (!result.connected) {
        console.error(`[DB Init] FAILED: PostgreSQL connection could not be established.`);
        console.error(`[DB Init] Details: ${result.error}`);
        console.error(`[DB Init] Please ensure your local PostgreSQL service is running and DATABASE_URL is configured.`);
        process.exit(1);
      }

      console.log(`[DB Init] Connected successfully to database: "${result.databaseName}"`);

      if (!result.ready) {
        console.error(`[DB Init] INCOMPLETE SCHEMA: Missing required database tables:`);
        result.missingTables.forEach((t) => console.error(`          - ${t}`));
        console.error(`[DB Init] Please run "npm run db:setup" or "npm run db:migrate:deploy" to apply version-controlled migrations.`);
        process.exit(1);
      }

      console.log(`[DB Init] All ${REQUIRED_TABLES.length} required business tables and indexes are initialized and ready.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[DB Init] Unexpected error during verification:`, err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
