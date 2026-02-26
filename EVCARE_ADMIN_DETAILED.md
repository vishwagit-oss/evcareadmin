# EVCare Admin — Detailed Documentation

**Electric Vehicle Fleet Management Console** — a Next.js 14 admin dashboard for managing EV fleet data, battery health, and reports, with AWS Cognito auth and optional AWS S3, SES, and CloudWatch integration.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Environment & Configuration](#2-environment--configuration)
3. [Project Structure](#3-project-structure)
4. [Database](#4-database)
5. [Authentication](#5-authentication)
6. [API Routes](#6-api-routes)
7. [Frontend Pages & Components](#7-frontend-pages--components)
8. [AWS Integration](#8-aws-integration)
9. [Scripts & Deployment](#9-scripts--deployment)
10. [End-to-End Flows](#10-end-to-end-flows)

---

## 1. Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 14.2.x | App Router, SSR, API routes |
| **Language** | TypeScript 5.x | Type safety across app and API |
| **UI** | React 18 | Components and hooks |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS |
| **Charts** | Recharts 3.7 | Bar charts, pie charts on dashboard/analytics |
| **Icons** | Lucide React | LayoutDashboard, Car, Battery, etc. |
| **Auth (client)** | amazon-cognito-identity-js 6.3 | Sign up, sign in, session, tokens |
| **Auth (server)** | jose 6.1 | JWT verification using Cognito JWKS |
| **Database** | pg 8.18 (node-postgres) | PostgreSQL connection pool |
| **AWS** | @aws-sdk/client-* | Cognito (via SDK if needed), S3, SES, CloudWatch Logs, Secrets Manager |
| **Config** | dotenv 17.x | Load .env.local in Node scripts |
| **Process manager** | PM2 (ecosystem.config.js) | Run `next start` in production |

**Key files:** `package.json`, `next.config.mjs`, `tailwind.config.ts`, `tsconfig.json`.

---

## 2. Environment & Configuration

### Required (`.env.local`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. RDS). SSL is used when present. |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito User Pool ID (used in browser and for JWKS URL). |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito App Client ID (public). |
| `AWS_REGION` | AWS region (e.g. `us-east-2`). Used for S3, SES, CloudWatch, Secrets, and JWKS. |

### Optional (AWS features)

| Variable | Default | Description |
|----------|---------|-------------|
| `EVCARE_S3_BUCKET` | `evcare-reports` | S3 bucket for report uploads. |
| `EVCARE_ALERT_FROM` | `noreply@evcare.local` | SES “From” address for battery alerts. |
| `EVCARE_ALERT_EMAIL` | — | Fallback email for battery alerts if user email not in token. |
| `EVCARE_SECRET_NAME` | `evcare/production/config` | Secrets Manager secret (optional config). |
| `EVCARE_LOG_GROUP` | `/evcare/admin` | CloudWatch Logs log group. |
| `EVCARE_LOG_STREAM` | `api` | CloudWatch Logs stream name. |

If `AWS_REGION` is not set, S3/SES/CloudWatch are skipped (e.g. local dev); logging falls back to `console`.

---

## 3. Project Structure

```
evcare-admin/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout: Geist fonts, <Providers>
│   │   ├── page.tsx                  # Landing: Sign In, Sign Up, Dashboard link
│   │   ├── globals.css               # Tailwind + CSS variables
│   │   ├── (auth)/                   # Auth route group (no layout change)
│   │   │   ├── login/page.tsx        # Email/password → Cognito → /dashboard
│   │   │   └── register/page.tsx     # Name, email, password → Cognito → success → /login
│   │   ├── (dashboard)/             # Dashboard route group
│   │   │   ├── layout.tsx            # AuthGuard + sidebar nav + main area
│   │   │   └── dashboard/
│   │   │       ├── page.tsx         # Dashboard home (KPIs + 2 charts)
│   │   │       ├── fleet/page.tsx    # Vehicle list + add/edit/delete
│   │   │       ├── battery/page.tsx  # Battery health per vehicle
│   │   │       ├── analytics/page.tsx # Charts + Export CSV / Export to S3
│   │   │       └── profile/page.tsx  # Show name/email (read-only)
│   │   └── api/                      # Backend API (server-side only)
│   │       ├── auth/verify/route.ts  # GET — validate Bearer token
│   │       ├── vehicles/route.ts     # GET list, POST create
│   │       ├── vehicles/[id]/route.ts # GET one, PUT update, DELETE
│   │       ├── dashboard/stats/route.ts
│   │       ├── dashboard/analytics/route.ts
│   │       └── reports/export/route.ts
│   ├── components/
│   │   ├── Providers.tsx             # Wraps children with AuthProvider
│   │   ├── AuthGuard.tsx             # Redirects to /login if not authenticated
│   │   └── DashboardNav.tsx         # Left sidebar: logo, user, nav links, sign out
│   ├── contexts/
│   │   └── AuthContext.tsx           # Session state, user, signOut
│   ├── lib/
│   │   ├── db.ts                    # PostgreSQL pool + query()
│   │   ├── cognito.ts               # Cognito: signUp, signIn, signOut, getSession, getAuthToken, getCurrentUser
│   │   ├── verify-token.ts          # Verify JWT with Cognito JWKS (jose)
│   │   ├── api-auth.ts              # requireAuth() for API routes
│   │   ├── cloudwatch.ts            # logEvent() to CloudWatch
│   │   ├── s3.ts                    # uploadReport() — upload CSV to S3
│   │   ├── ses.ts                   # sendBatteryAlertEmail()
│   │   ├── secrets.ts               # getSecrets() from AWS Secrets Manager
│   │   └── schema.sql               # DB schema (vehicles, battery_alerts, trigger)
│   └── types/
│       └── index.ts                 # Vehicle, VehicleStatus
├── scripts/
│   ├── init-db.js                   # Run schema.sql (npm run db:init)
│   └── seed-db.js                   # Insert sample vehicles (npm run db:seed)
├── public/                          # Static assets (if any)
├── .env.example / .env.local        # Environment variables
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── ecosystem.config.js              # PM2 config for production
└── nginx-evcare.conf                # Nginx sample (if used in front of Next)
```

---

## 4. Database

### Schema (`src/lib/schema.sql`)

- **Extension:** `uuid-ossp` for `uuid_generate_v4()`.

**Table: `vehicles`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, default uuid_generate_v4() |
| `cognito_user_id` | VARCHAR(255) | NOT NULL — ties row to Cognito user |
| `vin` | VARCHAR(17) | NOT NULL, UNIQUE |
| `make` | VARCHAR(100) | NOT NULL |
| `model` | VARCHAR(100) | NOT NULL |
| `battery_capacity_kwh` | DECIMAL(10,2) | NOT NULL |
| `current_charge_percent` | DECIMAL(5,2) | NOT NULL, CHECK 0–100 |
| `battery_health_score` | DECIMAL(5,2) | NOT NULL, CHECK 0–100 |
| `status` | VARCHAR(20) | NOT NULL, CHECK IN ('active','charging','maintenance','offline') |
| `license_plate` | VARCHAR(20) | nullable |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

Indexes: `idx_vehicles_cognito_user_id`, `idx_vehicles_status`, `idx_vehicles_vin`.

**Table: `battery_alerts`**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | PRIMARY KEY |
| `vehicle_id` | UUID | FK → vehicles(id) ON DELETE CASCADE |
| `threshold` | DECIMAL(5,2) | Threshold that triggered alert (e.g. 50) |
| `notified_at` | TIMESTAMPTZ | When alert was created |
| `email_sent` | BOOLEAN | Whether SES email was sent |
| `created_at` | TIMESTAMPTZ | Record creation |

Index: `idx_battery_alerts_vehicle_id`.

**Trigger:** `update_vehicles_updated_at` — before UPDATE on `vehicles`, sets `updated_at = CURRENT_TIMESTAMP` via function `update_updated_at_column()`.

### Connection (`src/lib/db.ts`)

- Uses `DATABASE_URL`; if missing, logs a warning and API routes that use DB will fail.
- Creates a `pg.Pool` with `ssl: { rejectUnauthorized: false }` when `connectionString` is set (for RDS).
- Exports `query(text, params?)` and `pool`.

---

## 5. Authentication

### Cognito setup (assumed)

- User Pool with **email** as sign-in (e.g. email alias).
- App client (no secret for public SPA).
- Attributes: email, name, preferred_username.

### Client-side (`src/lib/cognito.ts`)

- **User pool:** `NEXT_PUBLIC_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`.
- **signUp(email, password, name):** Creates user with attributes email, name, preferred_username. Username is internal: `user_<timestamp>_<random>` (required when using email alias).
- **signIn(email, password):** Uses `AuthenticationDetails` + `CognitoUser` with email; on success Cognito stores session in memory/localStorage.
- **signOut():** Calls `currentUser.signOut()`.
- **getSession():** Returns `{ idToken, accessToken }` or null.
- **getAuthToken():** Returns id token string or null (used for API `Authorization: Bearer`).
- **getCurrentUser():** Decodes JWT payload (email, name from token) for display.

### Auth context (`src/contexts/AuthContext.tsx`)

- On mount: `getSession()` → if valid, `getCurrentUser()` → sets `isAuthenticated`, `user`; else clears.
- Exposes: `isAuthenticated`, `isLoading`, `user`, `signOut()`.
- `signOut()` calls Cognito signOut then `window.location.href = "/login"`.

### Auth guard (`src/components/AuthGuard.tsx`)

- Used in dashboard layout.
- If `!isLoading && !isAuthenticated` → `router.replace("/login")`.
- While loading: shows “Loading…”.
- If not authenticated after load: renders null (redirect in progress).
- Otherwise: renders children (dashboard content).

### Server-side verification (`src/lib/verify-token.ts` + `api-auth.ts`)

- **JWKS URL:** `https://cognito-idp.{AWS_REGION}.amazonaws.com/{UserPoolId}/.well-known/jwks.json`.
- **verifyCognitoToken(token):** Uses `jose` `jwtVerify(token, jwks)`; returns `{ sub, email }` or null.
- **getTokenFromHeader(authHeader):** Returns token if header is `Bearer <token>`.
- **requireAuth(authHeader):** Gets token, verifies via `verifyCognitoToken`; returns either `{ sub, email }` or `{ error: NextResponse }` (401).

All protected API routes call `requireAuth(request.headers.get("authorization"))` and use `auth.sub` as `cognito_user_id` for DB queries.

---

## 6. API Routes

Summary: every protected route uses `requireAuth()` and scopes data by `auth.sub` (`cognito_user_id`).

### `GET /api/auth/verify`

- **Auth:** Bearer token in `Authorization`.
- **Logic:** `getTokenFromHeader` → `verifyCognitoToken`; if invalid → 401 `{ valid: false }`; else 200 `{ valid: true, sub }`.
- **Use:** Frontend can check token validity.

### `GET /api/vehicles`

- **Auth:** Required.
- **Logic:** `SELECT * FROM vehicles WHERE cognito_user_id = $1 ORDER BY created_at DESC`.
- **Response:** 200 JSON array of vehicle rows. On error: 500, and logs to CloudWatch on failure.

### `POST /api/vehicles`

- **Auth:** Required.
- **Body:** `vin`, `make`, `model`, `battery_capacity_kwh` required; optional: `current_charge_percent` (default 0), `battery_health_score` (100), `status` ('active'), `license_plate` ('').
- **Logic:** INSERT into `vehicles` with `cognito_user_id = auth.sub`. Returns inserted row (201). 400 if validation fails; 409 if VIN duplicate; 500 on other errors. Logs “Vehicle added” to CloudWatch.

### `GET /api/vehicles/[id]`

- **Auth:** Required.
- **Logic:** SELECT where `id = params.id` and `cognito_user_id = auth.sub`. 404 if not found; 200 with vehicle object otherwise.

### `PUT /api/vehicles/[id]`

- **Auth:** Required.
- **Body:** Optional fields: vin, make, model, battery_capacity_kwh, current_charge_percent, battery_health_score, status, license_plate. Uses COALESCE to update only provided fields.
- **Logic:**
  1. UPDATE vehicle where `id` and `cognito_user_id = auth.sub`; RETURNING row. 404 if no row.
  2. **Battery alert:** If updated `battery_health_score` < 50 and `AWS_REGION` set: get email from `auth.email` or `EVCARE_ALERT_EMAIL`, call `sendBatteryAlertEmail()`, INSERT into `battery_alerts` (vehicle_id, threshold 50, email_sent). Log “Battery alert sent” to CloudWatch.
- **Response:** 200 with updated vehicle. 409 if VIN conflict; 500 on error.

### `DELETE /api/vehicles/[id]`

- **Auth:** Required.
- **Logic:** DELETE from vehicles where `id` and `cognito_user_id = auth.sub` RETURNING id. 404 if not found; 200 `{ success: true }`.

### `GET /api/dashboard/stats`

- **Auth:** Required.
- **Logic:** Single query: COUNT(*), COUNT by status (active/charging/maintenance/offline), AVG(battery_health_score), COUNT where battery_health_score < 70, for `cognito_user_id = auth.sub`.
- **Response:** 200 JSON: `totalVehicles`, `byStatus`, `avgBatteryHealth`, `vehiclesNeedingAttention`.

### `GET /api/dashboard/analytics`

- **Auth:** Required.
- **Logic:** Two queries for same user: (1) GROUP BY status with counts; (2) battery health ranges (Excellent 90–100, Good 70–89, Fair 50–69, Poor <50) with counts.
- **Response:** 200 JSON: `byStatus: [{ name, value }]`, `batteryDistribution: [{ name, count }]`.

### `GET /api/reports/export`

- **Auth:** Required.
- **Query:** `format` (default `csv`), `target` (default `download`; or `s3`).
- **Logic:** SELECT vehicles for user; build CSV. If `target=download`: return CSV with `Content-Disposition: attachment`. If `target=s3`: `uploadReport(key, csv)` to S3 (key like `reports/{sub}/{date}-fleet-report.csv`), log “Report exported to S3”, return JSON `{ url, key }`.
- **Errors:** 500 with optional details in dev; CloudWatch “Report export failed” on error.

---

## 7. Frontend Pages & Components

### Root layout (`src/app/layout.tsx`)

- Geist font (local woff), metadata (title “EVCare Admin”, description).
- Renders `<Providers>{children}</Providers>`.

### Landing (`src/app/page.tsx`)

- EVCare logo and tagline; links: Sign In (`/login`), Sign Up (`/register`), “Go to Dashboard” (`/dashboard`). No auth check; dashboard layout will redirect if not logged in.

### Login (`src/app/(auth)/login/page.tsx`)

- Form: email, password. Submit → `signIn(email, password)` → on success `window.location.href = "/dashboard"`. Error state and “Forgot password?” / “Sign up” links.

### Register (`src/app/(auth)/register/page.tsx`)

- Form: Full Name, Email, Password (min 8). Submit → `signUp(email, password, name)` → on success shows “Account created! Redirecting to sign in…” then `router.push("/login")` after 2s.

### Dashboard layout (`src/app/(dashboard)/layout.tsx`)

- Wraps children in `<AuthGuard>`; then gray background, `<DashboardNav />`, and `<main className="ml-64 ...">{children}</main>`.

### DashboardNav (`src/components/DashboardNav.tsx`)

- Fixed left sidebar (w-64): EVCare logo (link to `/dashboard`), “Welcome back” + user name/email, links to Profile and Sign Out, then nav: Dashboard, Fleet, Battery, Analytics. Active route highlighted. Footer “EVCare Admin / Electric Vehicle Fleet”.

### Dashboard home (`src/app/(dashboard)/dashboard/page.tsx`)

- Fetches `/api/dashboard/stats` and `/api/dashboard/analytics` with Bearer token (from `getAuthToken()`). Renders: 4 KPI cards (Total Vehicles, Active, Avg Battery Health, Needs Attention), bar chart “Vehicles by Status”, pie chart “Battery Health Distribution”, status summary. Loading and error states.

### Fleet (`src/app/(dashboard)/dashboard/fleet/page.tsx`)

- State: vehicles list, loading, error, showForm, editing (vehicle or null), form fields (vin, make, model, etc.). Fetches GET `/api/vehicles` on mount. “Add Vehicle” opens form; table row “Edit” fills form and sets editing; submit: POST new or PUT by id; “Delete” confirms then DELETE by id. VIN disabled when editing. Status badges with colors. All requests use Bearer token.

### Battery (`src/app/(dashboard)/dashboard/battery/page.tsx`)

- Fetches same GET `/api/vehicles`; shows summary cards (Vehicles Monitored, Average Health, Needs Attention) and a grid of vehicle cards with battery health bar, charge %, capacity, last updated. Color bands: Excellent (90+), Good (70+), Fair (50+), Poor (<50).

### Analytics (`src/app/(dashboard)/dashboard/analytics/page.tsx`)

- Fetches `/api/dashboard/analytics` and `/api/dashboard/stats`. Renders fleet summary numbers, same two charts (by status, battery distribution), and two buttons: “Export CSV” (GET `/api/reports/export?target=download` → blob download), “Export to S3” (GET `?target=s3` → alert with S3 URL). Error state for failed export.

### Profile (`src/app/(dashboard)/dashboard/profile/page.tsx`)

- Read-only: shows `user.name` and `user.email` from `useAuth()`. Note that changes require Cognito console or admin.

---

## 8. AWS Integration

### Cognito

- Used for identity only (user pool + app client). Frontend uses `amazon-cognito-identity-js`; backend validates id token with JWKS via `jose`. No direct Cognito API calls in Node except as needed for custom flows.

### S3 (`src/lib/s3.ts`)

- Client: `S3Client` in `AWS_REGION`. Bucket: `EVCARE_S3_BUCKET`.
- `uploadReport(key, body, contentType)`: PutObject; returns `s3://bucket/key`. Used by reports export when `target=s3`.

### SES (`src/lib/ses.ts`)

- Client: `SESClient`. From: `EVCARE_ALERT_FROM`.
- `sendBatteryAlertEmail(toEmail, vehicle)`: Sends plain-text email with subject/body about low battery health; returns true/false. Called from PUT `/api/vehicles/[id]` when health < 50.

### CloudWatch Logs (`src/lib/cloudwatch.ts`)

- Log group: `EVCARE_LOG_GROUP`, stream: `EVCARE_LOG_STREAM`. `logEvent(message, level, meta)` sends one log event (JSON). Used in vehicles list (success/failure), vehicle add, report export, battery alert. If `AWS_REGION` not set, only console is used.

### Secrets Manager (`src/lib/secrets.ts`)

- Optional. `getSecrets()` fetches JSON from `EVCARE_SECRET_NAME`, cached. On failure or no region, falls back to `process.env`. Not used in current route handlers but available for DB URL or other config.

---

## 9. Scripts & Deployment

### NPM scripts (`package.json`)

- `dev`: `next dev`
- `build`: `next build`
- `start`: `next start`
- `lint`: `next lint`
- `db:init`: `node scripts/init-db.js` — runs `src/lib/schema.sql` (requires `DATABASE_URL` in .env.local).
- `db:seed`: `node scripts/seed-db.js` — inserts 3 sample vehicles for `cognito_user_id = "demo-user-id"` (replace with real sub after signup for your user).

### Init DB (`scripts/init-db.js`)

- Loads `.env.local` via dotenv; reads `schema.sql` from `src/lib/schema.sql`; executes with single `pool.query(schema)`; exits on error.

### Seed DB (`scripts/seed-db.js`)

- Inserts Tesla Model 3, Model Y, VW ID.4 with ON CONFLICT (vin) DO NOTHING. Uses same pool config as init (SSL, etc.).

### Production (PM2)

- `ecosystem.config.js`: one app, name “evcare-admin”, script `node_modules/next/dist/bin/next`, args `start`, cwd project root, NODE_ENV=production, max memory 500M, no watch. Run with `pm2 start ecosystem.config.js`.

### Nginx

- `nginx-evcare.conf` is present for optional reverse proxy in front of Next (e.g. proxy to localhost:3000).

---

## 10. End-to-End Flows

### User signs up and lands on dashboard

1. User opens `/register`, enters name, email, password.
2. `signUp(email, password, name)` → Cognito creates user (internal username, email alias).
3. Success → “Account created! Redirecting…” → redirect to `/login`.
4. User logs in with email/password → `signIn()` → Cognito session stored.
5. Redirect to `/dashboard`. Layout loads → AuthGuard runs; AuthContext already has session → authenticated. Dashboard layout renders; DashboardNav and dashboard home load.
6. Dashboard page calls GET `/api/dashboard/stats` and GET `/api/dashboard/analytics` with `Authorization: Bearer <idToken>`. API `requireAuth()` verifies token with JWKS, gets `sub`. Queries run with `cognito_user_id = sub`. JSON returned; KPIs and charts render.

### User adds a vehicle and gets a battery alert

1. User goes to Fleet, clicks “Add Vehicle”, fills VIN, make, model, battery kWh, etc., status “active”, health 100. Submit.
2. POST `/api/vehicles` with Bearer token and body. requireAuth → sub. INSERT into vehicles. 201 with vehicle. “Vehicle added” logged to CloudWatch. List refetches.
3. User clicks Edit on that vehicle, sets battery health to 45, Submit.
4. PUT `/api/vehicles/[id]` with body. UPDATE vehicle. Because battery_health_score < 50 and AWS_REGION set: get user email, call `sendBatteryAlertEmail()`, INSERT into battery_alerts (email_sent = true/false). Log “Battery alert sent”. 200 with updated vehicle. User receives email if SES is configured.

### User exports report to S3

1. User goes to Analytics, clicks “Export to S3”.
2. Frontend GET `/api/reports/export?target=s3` with Bearer token.
3. requireAuth → sub. SELECT vehicles for user, build CSV. `uploadReport("reports/{sub}/{date}-fleet-report.csv", csv)` → S3 PutObject. Log “Report exported to S3”. Return { url, key }.
4. Frontend shows alert with S3 URL.

---

## Quick reference

| What | Where |
|------|--------|
| Auth state | `AuthContext` (session, user, signOut) |
| Protect dashboard | `AuthGuard` in `(dashboard)/layout.tsx` |
| Protect API | `requireAuth()` from `@/lib/api-auth` |
| DB | `query()` from `@/lib/db`, schema in `src/lib/schema.sql` |
| Token for API | `getAuthToken()` from `@/lib/cognito` (id token) |
| Battery alert threshold | 50% in `src/app/api/vehicles/[id]/route.ts` |

This document reflects the full EVCare Admin codebase as of the latest review.
