import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function createDatabaseIfNotExists() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[DB Create] DATABASE_URL is not defined in .env');
    process.exit(1);
  }

  try {
    const parsed = new URL(databaseUrl);
    const dbName = parsed.pathname.replace(/^\//, '').split('?')[0];

    // Connect to the default 'postgres' database with the same user credentials to run CREATE DATABASE
    const adminUrl = `postgresql://${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@${parsed.hostname}:${parsed.port || 5432}/postgres`;

    console.log(`[DB Create] Connecting to PostgreSQL at ${parsed.hostname}:${parsed.port || 5432} as "${parsed.username}"...`);
    const client = new Client({ connectionString: adminUrl });
    await client.connect();

    const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

    if (checkRes.rows.length === 0) {
      console.log(`[DB Create] Database "${dbName}" does not exist. Creating...`);
      // Note: Database names cannot be parameterized in CREATE DATABASE
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[DB Create] Database "${dbName}" created successfully!`);
    } else {
      console.log(`[DB Create] Database "${dbName}" already exists.`);
    }

    await client.end();
  } catch (err: any) {
    console.error(`[DB Create] Error creating database:`, err.message);
    process.exit(1);
  }
}

createDatabaseIfNotExists();
