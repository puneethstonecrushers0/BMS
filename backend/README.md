# BMS Backend — Boulder & Material Management System

Enterprise REST API built with Node.js, Express.js, TypeScript, and Prisma ORM on PostgreSQL.

---

## 1. Prerequisites

- **Node.js** >= 20.x
- **PostgreSQL** >= 14.x (Locally installed or managed)

---

## 2. Local PostgreSQL Setup

### Step A: Create Database and Application User (via `psql` or pgAdmin)

Run the following administrative SQL commands:

```sql
-- Connect to PostgreSQL as superuser (e.g. postgres)
-- Create application user
CREATE USER app_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';

-- Create business database
CREATE DATABASE boulder_business OWNER app_user;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE boulder_business TO app_user;

-- Connect to boulder_business and grant schema privileges
\c boulder_business
GRANT ALL ON SCHEMA public TO app_user;
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your local database connection string in `.env`:

```env
DATABASE_URL="postgresql://app_user:YOUR_SECURE_PASSWORD@localhost:5432/boulder_business?schema=public"
PORT=5000
NODE_ENV=development
JWT_ACCESS_SECRET="bms_super_secret_access_jwt_key_min_32_characters"
JWT_REFRESH_SECRET="bms_super_secret_refresh_jwt_key_min_32_characters"
CORS_ORIGIN="http://localhost:5173"
COOKIE_DOMAIN="localhost"
COOKIE_SECURE="false"
```

---

## 4. Database Setup & Migrations

All schema changes are version-controlled via Prisma migrations:

```bash
# Generate Prisma Client and apply migrations
npm run db:setup

# Verify database connectivity and schema readiness
npm run db:init

# Seed initial Administrator account (admin@bms.local / Admin@BMS2026)
npm run db:seed
```

### Available Database Scripts

- `npm run db:validate` — Validates `prisma/schema.prisma`
- `npm run db:generate` — Generates Prisma Client TypeScript types
- `npm run db:migrate:deploy` — Applies pending version-controlled migrations
- `npm run db:migrate:dev` — Creates a new migration from schema changes
- `npm run db:status` — Checks pending migration status
- `npm run db:studio` — Opens Prisma Studio database GUI
- `npm run db:init` — Verifies database connection and table integrity safely

---

## 5. Running the Application

```bash
# Start backend in development mode with hot-reloading
npm run dev

# Run automated test suite (Vitest + Supertest)
npm test

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 6. Architecture & Security Controls

- **Argon2id** password hashing (`argon2`).
- **Short-lived JWT Access Tokens** (15 min) in `HttpOnly`, `SameSite=Lax` cookies.
- **Server-Side Refresh Session Rotation** with replay detection and token family invalidation.
- **CSRF Defense**: Double-submit cookie pattern + `X-CSRF-Token` header validation on mutating operations (`POST`, `PUT`, `DELETE`).
- **Centralized Error Handling**: Safe error envelopes without leaking database details or stack traces in production.
- **CSV Formula Injection Prevention**: Automatic neutralization of formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) in exports.
- **Precise Decimal Arithmetic**: Server-side `decimal.js` calculations for net weights (`gross - tare`) and billing amounts (`net * rate`).
- **Role Isolation**: Express middleware enforcement for `ADMIN`, `SALES_OPERATOR`, and `BOULDER_OPERATOR`.
