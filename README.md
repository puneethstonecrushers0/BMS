# Boulder & Material Business Management System (BMS)

A secure, production-grade enterprise dashboard system engineered to replace daily spreadsheet workflows for boulder and construction material sales operations.

---

## 1. System Overview & Technology Stack

### Frontend
- **Framework**: React with TypeScript & Vite
- **Styling**: Tailwind CSS (Strict Monochrome design system: white, black, neutral grays; zero gradients, sharp rectangular button geometry, subtle paper/grid textures)
- **Routing**: React Router v7 with role-based route isolation
- **State & Server Cache**: TanStack Query v5
- **Data Visualization**: Recharts (Custom monochrome chart styling with line patterns and grayscale contrast)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL (Locally installed or managed)
- **ORM & Migrations**: Prisma ORM with version-controlled migrations
- **Validation**: Zod request schema validation (body, query, params)
- **Security**: Argon2id password hashing, JWT access tokens in `HttpOnly` cookies, rotating refresh sessions with replay attack detection, CSRF protection, rate limiting, and CSV formula injection neutralization
- **Testing**: Vitest + Supertest

---

## 2. Quickstart & Local Setup

### Step 1: Database Setup (PostgreSQL)

Create the local database and application user using `psql` or pgAdmin:

```sql
CREATE USER app_user WITH PASSWORD 'YOUR_PASSWORD';
CREATE DATABASE boulder_business OWNER app_user;
GRANT ALL PRIVILEGES ON DATABASE boulder_business TO app_user;
\c boulder_business
GRANT ALL ON SCHEMA public TO app_user;
```

### Step 2: Backend Configuration & Startup

```bash
cd backend

# Install dependencies
npm install

# Configure environment (edit DATABASE_URL with your local credentials)
cp .env.example .env

# Apply version-controlled Prisma migrations
npm run db:setup

# Verify database connection and schema integrity
npm run db:init

# Seed initial Administrator account
npm run db:seed

# Run tests
npm test

# Start backend dev server (Runs on http://localhost:5000)
npm run dev
```

### Step 3: Frontend Startup

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server (Runs on http://localhost:5173 with proxy to backend)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 3. Seeded Default Administrator Credentials

Upon running `npm run db:seed`, the primary system administrator account is initialized:

- **Email**: `admin@bms.local`
- **Password**: `Admin@BMS2026`
- **Role**: `ADMIN`

*(Change the password upon initial login in production environments).*

---

## 4. Operational Roles & Dashboard Access

| Role | Permitted Capabilities & Views |
| :--- | :--- |
| **`ADMIN`** | Universal operational access: Overview, Analytics, Sales Ledger, Boulder Trips, Master Buyers & Vehicles, Reports, User Management (Approve, Demote, Disable), Audit Logs. |
| **`SALES_OPERATOR`** | Material Sales Ledger (Create, Update, Cancel), Master Buyers & Vehicles references, Daily Sales Reports & CSV exports. |
| **`BOULDER_OPERATOR`** | Boulder Intake Trips (Create, Update, Cancel), Commercial Vehicles references, Daily Boulder Reports & CSV exports. |

---

## 5. Security & Financial Integrity Highlights

1. **Calculated Values**: Net weights (`gross - tare`) and sales amounts (`net * rate`) are computed strictly on the backend using `decimal.js`. The server never trusts client-supplied totals.
2. **Replay Detection**: Refresh sessions are tracked server-side with SHA-256 token hashes. If an already revoked token is used, all active sessions for that account are revoked immediately.
3. **Admin Safety Invariant**: The system programmatically prevents disabling or demoting the last active `ADMIN` in the organization.
4. **CSV Formula Injection Prevention**: Export functions sanitize cell prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) before generating downloadable CSV files.
5. **Zero Gradient Monochrome Aesthetic**: Sharp, rectangular buttons with small corner radii, high-contrast typography, and restrained shadows.
