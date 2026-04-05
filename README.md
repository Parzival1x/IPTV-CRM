# StreamOps IPTV CRM

StreamOps is a production-oriented IPTV CRM built with React, TypeScript, Vite, Express, and Supabase Postgres.

This repository contains:
- an admin CRM for managing customers, services, renewals, balances, portal access, and requests
- a customer portal for signed-in customers to review services and request new plans
- an Express API that handles authentication, business rules, notifications, and database access
- a Supabase Postgres schema for CRM, subscriptions, payments, notifications, and audit data

## Table Of Contents

- [Overview](#overview)
- [Main Features](#main-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup Summary](#local-setup-summary)
- [Detailed Setup](#detailed-setup)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Running The App](#running-the-app)
- [Admin Bootstrap And Seed Data](#admin-bootstrap-and-seed-data)
- [Login Routes And Accounts](#login-routes-and-accounts)
- [Notifications Setup](#notifications-setup)
- [Scripts Reference](#scripts-reference)
- [How The App Is Organized](#how-the-app-is-organized)
- [Typical Local Workflow](#typical-local-workflow)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Current Auth Model](#current-auth-model)

## Overview

This project is no longer a static dashboard template. It now behaves as a real CRM-style application with:
- admin sign-in and protected admin routes
- customer portal sign-in and protected portal routes
- customer creation with generated identifiers
- service and subscription tracking
- payment recording with support for credit and due balances
- service requests from customers to admins
- portal password reset management
- WhatsApp and email notifications from the backend
- Supabase-backed data persistence

The repository is split into:
- a frontend application under [src](E:\projects\admin_dashboard\src)
- a backend API under [backend](E:\projects\admin_dashboard\backend)
- a SQL schema under [backend/supabase/schema.sql](E:\projects\admin_dashboard\backend\supabase\schema.sql)

## Main Features

### Admin CRM

- dashboard with operational metrics
- customer directory
- customer detail view
- add customer flow
- edit customer flow
- payment status and renewal review
- portal access administration
- service request review queue
- customer notification sending

### Customer Portal

- secure customer login
- overview of current subscribed services
- available services catalog
- request flow for new services
- account visibility for billing and status

### Backend

- admin JWT authentication
- customer portal JWT authentication
- request validation
- protected customer CRUD routes
- service and payment business logic
- SMTP email sending
- WhatsApp Cloud API sending
- logging of notification activity

## Tech Stack

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Database: Supabase Postgres
- Notifications: WhatsApp Cloud API and SMTP email
- Auth: backend-issued JWT for both admin and customer portal flows

## Project Structure

```text
admin_dashboard/
  backend/
    config/
      runtime.js
      supabase.js
    middleware/
      auth.js
    repositories/
      adminRepository.js
      customerRepository.js
      serviceRequestRepository.js
      adminNotificationRepository.js
    routes/
      admin.js
      adminNotifications.js
      auth.js
      customerAuth.js
      customers.js
      notifications.js
      plans.js
      portal.js
      serviceRequests.js
    scripts/
      apply-schema.js
      configure-notifications.js
      seed-admin.js
      seed-demo-customers.js
      test-email.js
      test-notifications.js
    services/
      notificationService.js
    supabase/
      schema.sql
    utils/
      ids.js
    server.js
    package.json
  src/
    components/
    context/
    data/
    pages/
    services/
    App.tsx
    main.tsx
  .env.example
  start.bat
  start-backend.bat
  restart-backend.bat
  close-ports.bat
  setup-notifications.bat
  README.md
```

## Prerequisites

Install or prepare these before you begin:

- Node.js 20 or later recommended
- npm
- a Supabase project
- PowerShell or Command Prompt on Windows
- a code editor such as VS Code

Optional but useful:
- a Meta developer app with WhatsApp Cloud API access
- SMTP email credentials

## Local Setup Summary

If you only want the short version, this is the minimum path:

1. Clone the repo
2. Install frontend and backend dependencies
3. Copy `.env.example` to `.env`
4. Fill in Supabase keys and database connection values
5. Run [backend/supabase/schema.sql](E:\projects\admin_dashboard\backend\supabase\schema.sql) in Supabase SQL Editor
6. Start the project with [start.bat](E:\projects\admin_dashboard\start.bat)
7. Seed the first admin if needed with `cd backend && npm.cmd run seed:admin`
8. Optionally seed demo customers with `cd backend && npm.cmd run seed:demo-customers`

The rest of this README explains every step in detail.

## Detailed Setup

### Step 1: Clone The Repository

```powershell
git clone https://github.com/Parzival1x/admin_dashboard.git
cd admin_dashboard
```

If you already have the repository locally:

```powershell
cd /d E:\projects\admin_dashboard
```

### Step 2: Install Frontend Dependencies

From the project root:

```powershell
npm.cmd install
```

### Step 3: Install Backend Dependencies

```powershell
cd backend
npm.cmd install
cd ..
```

### Step 4: Create The Local Environment File

Copy the example file:

```powershell
Copy-Item .env.example .env
```

This creates a local `.env` file that the frontend and backend will use during development.

### Step 5: Fill In The `.env` File

Open [`.env`](E:\projects\admin_dashboard\.env) and replace the placeholders with your real values.

Use [`.env.example`](E:\projects\admin_dashboard\.env.example) only as a template. Do not keep secrets there.

### Step 6: Create And Configure Your Supabase Project

If you do not already have a Supabase project:

1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Wait for the database to finish provisioning
4. Open your project dashboard

You will need:
- project URL
- anon key
- service role key
- Postgres connection string

### Step 7: Apply The SQL Schema

Open the SQL editor in Supabase and run:

- [backend/supabase/schema.sql](E:\projects\admin_dashboard\backend\supabase\schema.sql)

How:
1. Open Supabase dashboard
2. Open `SQL Editor`
3. Create a new query
4. Paste the full contents of `schema.sql`
5. Run the query

Do not skip this step. The backend expects these tables and columns to exist.

### Step 8: Start The Application

The easiest option is:

```powershell
start.bat
```

That launches:
- the backend API in a separate console window
- the frontend Vite dev server in a separate console window

### Step 9: Verify Health

Open:

- [http://localhost:3001/api/health](http://localhost:3001/api/health)

Expected result:

```text
OK
```

### Step 10: Create An Admin

If development seeding is enabled, the backend may create a default admin automatically.

If you want to create it explicitly:

```powershell
cd backend
npm.cmd run seed:admin
```

### Step 11: Optional Demo Data

If you want the admin panel and customer portal to have realistic test data:

```powershell
cd backend
npm.cmd run seed:demo-customers
```

## Environment Variables

The project uses a shared root `.env` file. The frontend reads `VITE_*` variables, and the backend reads the rest.

### Minimum Required Variables

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development

FRONTEND_URL=http://localhost:5173
```

### Development Seed Variables

```env
SEED_DEFAULT_ADMIN=true
SEED_SAMPLE_CUSTOMERS=true
DEV_ADMIN_NAME=Admin User
DEV_ADMIN_EMAIL=admin@example.com
DEV_ADMIN_PASSWORD=admin123
DEV_ADMIN_ROLE=admin
```

### Production Bootstrap Variables

```env
ADMIN_BOOTSTRAP_NAME=Production Admin
ADMIN_BOOTSTRAP_EMAIL=admin@yourcompany.com
ADMIN_BOOTSTRAP_PASSWORD=replace-with-a-strong-password
ADMIN_BOOTSTRAP_ROLE=super-admin
```

### Notification Variables

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

EMAIL_FROM=Abhishek Jangra <i.abhishekjangra@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=i.abhishekjangra@gmail.com
SMTP_PASS=your_gmail_app_password
```

### What Each Important Variable Does

- `VITE_API_BASE_URL`
  Frontend base URL for the Express API.

- `VITE_SUPABASE_URL`
  Supabase project URL exposed to the frontend.

- `VITE_SUPABASE_ANON_KEY`
  Frontend-safe Supabase key.

- `SUPABASE_URL`
  Backend copy of the same Supabase project URL.

- `SUPABASE_SERVICE_ROLE_KEY`
  Backend-only privileged Supabase key. Never expose this in frontend code.

- `DATABASE_URL`
  Postgres connection string used by backend schema scripts.

- `JWT_SECRET`
  Secret used by the backend to sign admin and portal JWTs.

- `FRONTEND_URL`
  Frontend origin allowed by backend CORS.

- `SEED_DEFAULT_ADMIN`
  Enables automatic dev admin seeding on startup.

- `SEED_SAMPLE_CUSTOMERS`
  Enables automatic sample customer seeding if supported by the current backend flow.

## Supabase Setup

### Where To Find Supabase Values

In the Supabase dashboard:

1. Open your project
2. Go to `Settings`
3. Open `API`

You can get:
- project URL
- anon key
- service role key

For `DATABASE_URL`:

1. Open `Connect`
2. Find your Postgres connection string
3. Copy the direct or pooler connection string

If direct DB access is unreliable from your machine or deployment target, prefer the Supabase pooler connection string.

### Required Schema Tables

The app expects the Supabase schema to create tables such as:

- `admin_users`
- `customers`
- `subscription_plans`
- `customer_subscriptions`
- `payments`
- `invoices`
- `service_requests`
- `admin_notifications`
- `whatsapp_templates`
- `whatsapp_messages`
- `email_messages`
- `activity_logs`

### If Schema Changes Later

When this project’s SQL changes in the future:

1. open [backend/supabase/schema.sql](E:\projects\admin_dashboard\backend\supabase\schema.sql)
2. re-run the updated SQL in Supabase SQL Editor
3. restart the backend

## Running The App

### Fastest Windows Path

Use:

```powershell
start.bat
```

This script:
- checks that Node is installed
- checks that `.env` exists
- checks that key Supabase values exist
- installs dependencies if missing
- starts backend
- starts frontend

### Manual Startup

Backend:

```powershell
cd /d E:\projects\admin_dashboard\backend
npm.cmd start
```

Frontend in a second terminal:

```powershell
cd /d E:\projects\admin_dashboard
npm.cmd run dev
```

### Development Backend Restart

If port `3001` is stuck or you want a clean dev restart:

```powershell
restart-backend.bat
```

### Close Occupied Ports

If local ports are stuck:

```powershell
close-ports.bat
```

### Build Frontend

```powershell
cd /d E:\projects\admin_dashboard
npm.cmd run build
```

### Backend Syntax Smoke Test

```powershell
cd /d E:\projects\admin_dashboard\backend
npm.cmd test
```

## Admin Bootstrap And Seed Data

### Default Development Admin

If `SEED_DEFAULT_ADMIN=true`, the backend can create a development admin automatically.

Default credentials:
- Email: `admin@example.com`
- Password: `admin123`

### Explicit Admin Creation

```powershell
cd /d E:\projects\admin_dashboard\backend
npm.cmd run seed:admin
```

This uses:
- `ADMIN_BOOTSTRAP_NAME`
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `ADMIN_BOOTSTRAP_ROLE`

### Demo Customer Seeding

```powershell
cd /d E:\projects\admin_dashboard\backend
npm.cmd run seed:demo-customers
```

This creates richer customer records for testing:
- multiple services
- mixed statuses
- due balances
- credit
- portal-enabled users

Known seeded customer portal account:
- Email: `user@example.com`
- Password: `user123`

## Login Routes And Accounts

### Public Home

- [http://localhost:5173/](http://localhost:5173/)

This page lets users choose whether to continue as:
- Admin
- Customer

### Admin Sign-In

- [http://localhost:5173/signin](http://localhost:5173/signin)

### Customer Portal Sign-In

- [http://localhost:5173/portal/signin](http://localhost:5173/portal/signin)

### Admin App

After login:
- [http://localhost:5173/dashboard](http://localhost:5173/dashboard)

### Customer Portal

After login:
- [http://localhost:5173/portal](http://localhost:5173/portal)

## Notifications Setup

Notifications are optional for development, but required if you want live WhatsApp and email delivery.

### WhatsApp Setup

Add to `.env`:

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

Important:
- save customer WhatsApp numbers in full international format
- example: `+919876543210`
- if using Meta test mode, the target recipient must be approved in the Meta dashboard
- the target number must actually be registered on WhatsApp

### Email Setup

For Gmail SMTP:

```env
EMAIL_FROM=Abhishek Jangra <i.abhishekjangra@gmail.com>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=i.abhishekjangra@gmail.com
SMTP_PASS=your_gmail_app_password
```

Important:
- `SMTP_PASS` should be a Gmail App Password
- do not use the normal Gmail login password

### Guided Notification Setup

```powershell
setup-notifications.bat
```

### Test Email

```powershell
cd /d E:\projects\admin_dashboard\backend
npm.cmd run email:test
```

To send to a real recipient:

```powershell
cd /d E:\projects\admin_dashboard\backend
npm.cmd run email:test -- --to=you@example.com
```

### Test Notifications

```powershell
cd /d E:\projects\admin_dashboard\backend
npm.cmd run notifications:test -- --list-customers
npm.cmd run notifications:test -- --customer-id=YOUR_CUSTOMER_UUID --channel=email --template=welcome
npm.cmd run notifications:test -- --customer-id=YOUR_CUSTOMER_UUID --channel=whatsapp --template=custom --message="Your IPTV service is active."
```

Restart the backend after changing notification-related `.env` values.

## Scripts Reference

### Frontend Scripts

From [package.json](E:\projects\admin_dashboard\package.json):

- `npm.cmd run dev`
  Starts the Vite development server.

- `npm.cmd run build`
  Builds the production frontend bundle.

- `npm.cmd run lint`
  Runs ESLint on the frontend codebase.

### Backend Scripts

From [backend/package.json](E:\projects\admin_dashboard\backend\package.json):

- `npm.cmd start`
  Starts the backend in normal mode.

- `npm.cmd run dev`
  Starts the backend with Nodemon.

- `npm.cmd test`
  Runs backend syntax checks across main files.

- `npm.cmd run db:push`
  Applies schema SQL via the backend script path where applicable.

- `npm.cmd run seed:admin`
  Creates the initial admin.

- `npm.cmd run seed:demo-customers`
  Seeds sample customers and service data.

- `npm.cmd run email:test`
  Verifies SMTP configuration and can send a test email.

- `npm.cmd run notifications:test`
  Tests email and WhatsApp notification flows.

### Windows Helper Scripts

- [start.bat](E:\projects\admin_dashboard\start.bat)
  Starts frontend and backend together.

- [start-backend.bat](E:\projects\admin_dashboard\start-backend.bat)
  Starts the backend only.

- [restart-backend.bat](E:\projects\admin_dashboard\restart-backend.bat)
  Kills the process on port `3001` and starts backend dev mode again.

- [close-ports.bat](E:\projects\admin_dashboard\close-ports.bat)
  Frees local dev ports if they are occupied.

- [setup-notifications.bat](E:\projects\admin_dashboard\setup-notifications.bat)
  Runs the backend notification setup helper.

## How The App Is Organized

### Frontend

The frontend is routed from [App.tsx](E:\projects\admin_dashboard\src\App.tsx).

Main route groups:
- public homepage
- admin authentication
- admin CRM shell
- customer portal authentication
- customer portal shell

Important page files include:
- [src/pages/HomePage.tsx](E:\projects\admin_dashboard\src\pages\HomePage.tsx)
- [src/pages/AuthPages/SignIn.tsx](E:\projects\admin_dashboard\src\pages\AuthPages\SignIn.tsx)
- [src/pages/Dashboard.tsx](E:\projects\admin_dashboard\src\pages\Dashboard.tsx)
- [src/pages/Tables.tsx](E:\projects\admin_dashboard\src\pages\Tables.tsx)
- [src/pages/CustomerDetail.tsx](E:\projects\admin_dashboard\src\pages\CustomerDetail.tsx)
- [src/pages/Forms.tsx](E:\projects\admin_dashboard\src\pages\Forms.tsx)
- [src/pages/EditCustomer.tsx](E:\projects\admin_dashboard\src\pages\EditCustomer.tsx)
- [src/pages/CustomerPortalDashboard.tsx](E:\projects\admin_dashboard\src\pages\CustomerPortalDashboard.tsx)

### Backend

The backend entry point is [backend/server.js](E:\projects\admin_dashboard\backend\server.js).

Key backend pieces:
- [backend/routes/auth.js](E:\projects\admin_dashboard\backend\routes\auth.js)
- [backend/routes/customerAuth.js](E:\projects\admin_dashboard\backend\routes\customerAuth.js)
- [backend/routes/customers.js](E:\projects\admin_dashboard\backend\routes\customers.js)
- [backend/routes/portal.js](E:\projects\admin_dashboard\backend\routes\portal.js)
- [backend/routes/serviceRequests.js](E:\projects\admin_dashboard\backend\routes\serviceRequests.js)
- [backend/routes/notifications.js](E:\projects\admin_dashboard\backend\routes\notifications.js)

### Database

Supabase stores:
- admin users
- customers
- subscriptions and plans
- service requests
- portal access data
- payments and invoices
- notification logs
- activity logs

## Typical Local Workflow

This is a good day-to-day workflow for development:

1. Pull the latest code
2. Start the backend
3. Start the frontend
4. Open the homepage
5. Log in as admin
6. Check dashboard, customers, renewals, and portal access
7. If needed, seed test data
8. If you change `.env`, restart the backend and frontend
9. Before finishing, run:

```powershell
cd /d E:\projects\admin_dashboard
npm.cmd run build

cd /d E:\projects\admin_dashboard\backend
npm.cmd test
```

## Production Checklist

Before production deployment:

1. Set `NODE_ENV=production`
2. Set `SEED_DEFAULT_ADMIN=false`
3. Set `SEED_SAMPLE_CUSTOMERS=false`
4. Use a strong random `JWT_SECRET`
5. Use a strong bootstrap admin password
6. Run `npm.cmd run seed:admin` once for the real admin
7. Use real SMTP credentials
8. Use a valid WhatsApp token
9. Confirm `FRONTEND_URL` matches the deployed frontend URL exactly
10. Rotate any secrets that may have been exposed during development
11. Confirm the latest SQL schema is applied in Supabase
12. Test admin login, customer portal login, and one notification send before launch

## Troubleshooting

### Backend Health Check Fails

Check:
- `.env` exists at the project root
- `SUPABASE_URL` is set
- `SUPABASE_SERVICE_ROLE_KEY` is set
- `DATABASE_URL` is set
- the SQL schema was actually run in Supabase

Then retry:

- [http://localhost:3001/api/health](http://localhost:3001/api/health)

### Frontend Says Backend Is Unreachable

Check:
- the backend process is running
- `VITE_API_BASE_URL=http://localhost:3001/api`
- you restarted Vite after editing `.env`
- the frontend is running on the origin expected by `FRONTEND_URL`

### CORS Errors

Check:
- `FRONTEND_URL` matches the actual browser origin
- backend is running
- you are not mixing `localhost` and `127.0.0.1` unexpectedly without matching CORS config

### Port 3001 Is Already In Use

Use:

```powershell
restart-backend.bat
```

or:

```powershell
close-ports.bat
```

### Admin Login Fails

Check:
- `admin_users` exists in Supabase
- an admin record has been created
- `JWT_SECRET` is set
- you seeded the admin with `npm.cmd run seed:admin`

### Customer Portal Login Fails

Check:
- the customer exists in `customers`
- portal access is enabled for that customer
- the customer password has been created or reset

### WhatsApp Send Fails

Check:
- `WHATSAPP_ACCESS_TOKEN` is valid
- `WHATSAPP_PHONE_NUMBER_ID` is valid
- the customer number is saved with country code, such as `+919876543210`
- the target number is actually on WhatsApp
- if using Meta sandbox/test setup, the number has been approved as a recipient

### Email Send Fails

Check:
- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

If using Gmail:
- make sure `SMTP_PASS` is a Gmail App Password
- do not use the account login password

### Schema Or Column Errors

If you see missing table or missing column errors:

1. open [backend/supabase/schema.sql](E:\projects\admin_dashboard\backend\supabase\schema.sql)
2. rerun the SQL in Supabase SQL Editor
3. restart the backend

## Security Notes

- Never commit real secrets into `.env.example`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend
- Use a strong `JWT_SECRET`
- Disable development seeding in production
- Rotate any credentials that were ever shared in tracked files

## Current Auth Model

The app currently uses backend-issued JWTs for both admin and customer portal flows.

That means:
- admin login does not currently use Supabase Auth
- customer portal login does not currently use Supabase Auth
- Supabase is currently the database layer, not the primary auth provider

## Notes

- The old Mongo runtime path has been removed from this project.
- The README is the single top-level setup guide.
- If setup fails, start by checking `.env`, Supabase schema, and backend health first.
