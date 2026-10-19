# Foundry — Campus Lost & Found (NoSQL Prototype)

A full-stack, MongoDB-backed version of the campus lost-and-found prototype. It keeps the original workflow and field names (`type`, `reg_no`, `name`, `description`, `category`, `location`, `date`, `status`, `image`) while moving persistence and business rules to an Express API.

## What's working

- Responsive campus-style UI with search, type/category/status filters and listing details.
- Student registration and login with bcrypt password hashing and signed JWT sessions.
- Create lost/found reports, persisted in MongoDB.
- Claim a found item with proof; prevent self-claims and duplicate pending claims.
- Student activity page for their own reports and claims.
- Admin desk with dashboard statistics, pending-claim review, recent reports and audit trail.
- Claim approval marks an item Claimed; rejection reopens it when no other pending claim remains. On approval, other pending claims for that item are rejected.
- Audit records for sign-in, registration, reports, claim submissions and admin decisions.
- Seed script recreates the six original sample listings (L1001–F1006) plus demo users and one pending claim.
- API validation, Helmet security headers, rate limiting on authentication endpoints, environment-based secrets and role checks.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- NoSQL database: MongoDB + Mongoose
- Authentication: bcryptjs + JWT

## Run locally (VS Code)

You need Node.js 18+ and either a local MongoDB server or a MongoDB Atlas database.

1. Extract this folder and open **`campus-lost-found-nosql`** in VS Code.
2. Open the VS Code terminal in this folder and install packages:

   ```bash
   npm install
   ```

3. Create your environment file by copying `.env.example` to `.env`.
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
4. Edit `.env`:
   - `MONGODB_URI`: your local URI (`mongodb://127.0.0.1:27017/campus_lost_found`) or Atlas connection string.
   - `JWT_SECRET`: replace the example with a long random secret.
   - `ADMIN_PASSWORD`: set a private admin password before seeding.
5. Seed the sample data:

   ```bash
   npm run seed
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

   Or use `npm start`.
7. Open **http://localhost:3000**.

The frontend and API are served by the same Express server, so you do not need a separate Live Server window.

## Demo accounts

The seed script prints the configured admin email and password in the terminal. Default values in `.env.example` are only for local demonstration; change them before seeding or deploying.

Student demo accounts (password for all: `Student123!`):

- `aarav.demo@campus.local`
- `riya.demo@campus.local`
- `kabir.demo@campus.local`
- `ananya.demo@campus.local`

Use the admin credentials from `.env` to open the **Admin desk**. Do not use demo credentials for a public deployment.

## MongoDB collections

| Collection | Purpose |
|---|---|
| `users` | Student/admin profiles, unique email and registration number, password hash and role |
| `items` | Lost/found listings; `type` and `status` retain the original prototype semantics |
| `claims` | Claimant, proof, review status, reviewer and timestamps; separate so multiple claim attempts can be recorded |
| `auditlogs` | Who did what, to which record, and when |

Mongoose creates indexes for unique user identifiers, common filters, text search and recent audit activity. MongoDB stores real documents; browser storage is used only for the signed-in token and non-secret profile display data, never for passwords or the primary records.

## Main API routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register a student |
| `POST` | `/api/auth/login` | Public | Sign in |
| `GET` | `/api/auth/me` | Signed in | Get current profile |
| `GET` | `/api/items?q=&type=&category=&status=` | Public | Search/filter listings |
| `GET` | `/api/items/:id` | Public | Get item details (Mongo ID or legacy ID) |
| `POST` | `/api/items` | Signed in | Publish a lost/found report |
| `GET` | `/api/items/mine/reports` | Signed in | Current user's reports |
| `POST` | `/api/claims` | Signed in | Submit a claim |
| `GET` | `/api/claims/mine` | Signed in | Current user's claims |
| `GET` | `/api/claims/admin/all` | Admin | View claims |
| `PATCH` | `/api/claims/:id/review` | Admin | Approve/reject a pending claim |
| `GET` | `/api/admin/dashboard` | Admin | Dashboard statistics and recent activity |
| `GET` | `/api/admin/audit-logs` | Admin | Recent audit records |
| `GET` | `/api/health` | Public | App/database health |

For API testing, send `Authorization: Bearer <token>` on protected routes.

## Data and prototype notes

- The original sample records' legacy IDs and their fields are preserved in the seed (`L1001`, `L1002`, `F1003`, `F1004`, `L1005`, `F1006`). MongoDB adds its own `_id` to each document.
- Seed uses upserts for the sample items and will not overwrite existing versions of those records. It is safe to run again for the same demo database, but it will not reset changed statuses.
- This is a classroom/demo prototype, not yet a production deployment. For production, add email verification/password reset, CSRF strategy if moving to cookie auth, stricter CORS, HTTPS, monitoring, backups, pagination, moderation and automated tests. The review flow uses ordered writes rather than a MongoDB multi-document transaction; for high-concurrency production use, move claim review into a transaction on a replica set and add a concurrency strategy.
- If you deploy publicly, use MongoDB Atlas, a strong unique JWT secret, a private admin password, and do not commit `.env`.

## Troubleshooting

- **`Missing MONGODB_URI or JWT_SECRET`**: ensure `.env` exists in the project root and values are filled in.
- **MongoDB connection failed**: start your local MongoDB service or verify the Atlas URI, database-user password and Atlas network access list.
- **`npm` is not recognized**: install Node.js 18+ and reopen VS Code.
- **Port 3000 is in use**: set another `PORT` value in `.env` and restart.
