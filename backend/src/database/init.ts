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
 * Sanitizes a PostgreSQL connection string for safe logging.
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
 * Checks database connectivity and required public tables.
 * Schema changes must be applied through Prisma migrations.
 */
export async function verifyDatabaseInitialization(): Promise<DatabaseVerificationResult> {
  try {
    const [dbResult] = await prisma.$queryRaw<
      Array<{ current_db: string }>
    >`
      SELECT current_database() AS current_db
    `;

    const tables = await prisma.$queryRaw<
      Array<{ table_name: string }>
    >`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    const existingTableNames = new Set(
      tables.map((table) => table.table_name),
    );

    const missingTables = REQUIRED_TABLES.filter(
      (tableName) => !existingTableNames.has(tableName),
    );

    return {
      connected: true,
      databaseName: dbResult?.current_db || 'unknown',
      ready: missingTables.length === 0,
      missingTables,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      ready: false,
      missingTables: REQUIRED_TABLES,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to connect to PostgreSQL',
    };
  }
}

// Standalone execution script.
if (
  process.argv[1]?.endsWith('init.ts') ||
  process.argv[1]?.endsWith('init.js')
) {
  console.log('[DB Init] Checking database connectivity and schema readiness...');
  console.log(`[DB Init] Target: ${sanitizeDatabaseUrl(ENV.DATABASE_URL)}`);

  verifyDatabaseInitialization()
    .then((result) => {
      if (!result.connected) {
        console.error('[DB Init] PostgreSQL connection failed:', result.error);
        process.exitCode = 1;
        return;
      }

      console.log(
        `[DB Init] Connected to database: "${result.databaseName}"`,
      );

      if (!result.ready) {
        console.error('[DB Init] Missing required tables:');
        result.missingTables.forEach((table) => {
          console.error(`  - ${table}`);
        });
        console.error(
          '[DB Init] Run "npm run db:migrate:deploy" to apply pending migrations.',
        );
        process.exitCode = 1;
        return;
      }

      console.log(
        `[DB Init] All ${REQUIRED_TABLES.length} required tables are present.`,
      );
    })
    .catch((err: unknown) => {
      console.error('[DB Init] Verification failed:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
