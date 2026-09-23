# EquipTrack

EquipTrack is a full-stack web app for tracking a heavy-equipment fleet: who has what, what's available, what's overdue, and what needs servicing. It was built as a team project using Agile Scrum.

The app has three role-based workspaces:

- **Admin**: fleet health overview, equipment catalogue management, rental approval/rejection, issue reports, user management, and a view-only "impersonate" mode to see the app as any user.
- **Field user**: browse available equipment, submit rental requests, track active/pending rentals, and report equipment issues.
- **Maintenance**: a prioritized service queue (overdue / critical / upcoming), service logs and technician notes, issue triage, and equipment status updates.

Shared across roles: a scheduling calendar, QR code generation and scanning (camera or image upload) to jump straight to an equipment profile, in-app notifications, a personalizable dashboard layout, and dark mode.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Radix UI / MUI, TanStack Query and TanStack Table, React Hook Form, React Router

**Backend:** Node.js, Express 5, TypeScript, SQLite/libSQL (`@libsql/client`), scrypt password hashing, role-based route guards

Deployed on Vercel: the frontend builds as a static SPA and the Express API runs as a single serverless function (`api/index.ts`). The database defaults to a local SQLite file with no setup required — on Vercel that file lives in `/tmp`, which is wiped on cold starts and isn't shared across concurrent instances, so demo data resets periodically by design. Set `TURSO_DATABASE_URL` (+ `TURSO_AUTH_TOKEN`) to a real [Turso](https://turso.tech) database instead if you want data to persist reliably — same code, just point it at a hosted database.

## Running Locally

Requires Node.js 20+ (uses `process.loadEnvFile`, added in Node 20.12/21.7).

```bash
npm run install:all          # installs root, backend, and frontend dependencies
npm --prefix backend run seed   # creates backend/dev.db (SQLite file) with ~1,000 equipment units and demo data
npm run dev                  # backend on :4000, frontend on :5173
```

Open http://localhost:5173 and choose a role on the login screen to sign in as a demo user.

### Demo accounts

All seeded accounts use the password `demo123`.

| Role        | Email                          |
| ----------- | ------------------------------ |
| Admin       | `admin1@equiptrack.local`       |
| Field user  | `field1@equiptrack.local`       |
| Maintenance | `maintenance1@equiptrack.local` |

To reset the database: `npm --prefix backend run db:reset`

### Production build

```bash
npm run build   # builds the frontend into frontend/dist
npm start       # serves the API and the built frontend from one Express server
```

## Project Structure

```
api/
  index.ts        Vercel serverless entry point — delegates to backend/src/server.ts
backend/
  src/
    lib/db.ts     database connection + query helpers (SQLite file or Turso)
    db/           schema.sql, seed script, enum and row mappers
    routes/       auth, equipment, rentals, maintenance, dashboard, calendar, users
    services/     rental lifecycle, availability, maintenance scheduling
    middleware/   auth + role guards
frontend/
  src/
    features/     admin, field, maintenance, equipment, rentals, calendar, auth
    components/   shared UI (data table, dashboard widgets, dialogs)
    services/     typed API client per resource
```
