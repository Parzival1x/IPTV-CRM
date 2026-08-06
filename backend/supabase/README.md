# Database

One file creates everything.

## Setup

Open the Supabase SQL Editor, paste the contents of [`install.sql`](install.sql),
and run it. That is the entire database setup — types, tables, indexes,
triggers, functions, views, row level security, and a starter plan catalogue.

It prints a summary when it finishes, and raises an exception rather than
completing quietly if any part of it failed to take.

Safe to run more than once — every statement is guarded. See
[what re-running does and does not do](#what-re-running-does-and-does-not-do)
before relying on it to carry a schema change into a database that already
exists.

## Files

| File | What it is |
| --- | --- |
| `install.sql` | The complete schema, in fifteen numbered sections. The only source of truth. |
| `verify.mjs` | Applies it to a throwaway in-process Postgres and runs 49 checks over the money paths. |

## Verifying a change

The payment logic is a plpgsql function — deliberately, so that recording a
payment is atomic — which means it cannot be covered from JavaScript. This is
how it gets tested:

```powershell
cd backend
npm.cmd test
```

No Supabase project and no Docker: it builds a Postgres in-process, applies
`install.sql` twice to prove it is re-runnable, and then exercises it.

The suite covers full payments; part payments accumulating until they renew;
discounts; overpayment becoming account credit and that credit later being
spent; one payment split across several services; refunds rolling a renewal
back; the nightly expiry sweep; soft delete leaving payment history intact;
reminder deduplication; the reporting views; and every layer of the security
posture below.

## Contents

| Section | Tables |
| --- | --- |
| Identity | `admin_users`, `customers` |
| Catalogue | `subscription_plans` |
| Subscriptions | `customer_subscriptions` |
| Money | `payments`, `payment_allocations` |
| Requests | `service_requests`, `admin_notifications` |
| Messaging | `email_messages`, `whatsapp_messages`, `subscription_reminders` |
| Audit | `activity_logs` |

Functions: `record_customer_payment`, `refund_customer_payment`,
`expire_lapsed_subscriptions`, `set_updated_at`.

Views: `customer_financials`, `renewal_overview`, `revenue_by_month`.

## Security

The application authenticates against `admin_users` and
`customers.portal_password_hash` with its own JWTs. It never signs anyone into
Supabase Auth, so `auth.uid()` is always null and no policy written against it
could ever match a real request. Every read and write goes through the Express
API using the service role key, and `service_role` carries `BYPASSRLS`.

Deny-all is therefore the correct posture, applied in four layers so that
undoing any one of them by accident still leaves the data closed:

1. **Row level security enabled on every table, with no policies.** Nothing
   matches, so nothing is readable.
2. **Table, view and sequence grants revoked** from `anon` and `authenticated`.
   A permissive policy added later still exposes nothing.
3. **Function execute revoked** from the same roles. PostgREST publishes every
   function in the exposed schema as an RPC endpoint, and
   `record_customer_payment` moves money.
4. **Default privileges altered**, so a table or function created in future
   starts locked rather than inheriting Supabase's defaults.

`install.sql` discovers the tables to protect by querying `pg_class` rather
than working from a hardcoded list, so a table added later without updating the
security section is still caught the next time it runs. The closing block
re-checks all four layers and raises if any of them is incomplete.

`verify.mjs` asserts the same things independently.

### One thing deliberately not enabled

`FORCE ROW LEVEL SECURITY` would apply RLS to the table owner as well. It is
not set, because the Supabase dashboard's Table Editor connects as a privileged
role and would stop showing rows — a confusing failure in exchange for very
little, given `service_role` bypasses RLS by role attribute anyway.

## Changing the schema

Edit `install.sql` in the appropriate section, then run `npm.cmd test`.

### What re-running does and does not do

`install.sql` builds a database **from scratch**. Re-running it is safe, but be
clear about what that means:

| Change | Picked up by re-running? |
| --- | --- |
| New function, or a change to one | **Yes** — every function is `create or replace` |
| New view, or a change to one | **Yes** — every view is `create or replace` |
| New index | **Yes** — `create index if not exists` |
| New RLS or grant rule | **Yes** — the security section discovers tables at runtime |
| **New table** | **Yes** — `create table if not exists` |
| **New column on an existing table** | **No** — `create table if not exists` skips the table entirely, leaving the column missing |

So a change confined to logic, views, indexes or security propagates by running
the file again. A change that adds a column to a table that already exists does
not, and needs one `alter table ... add column if not exists` run by hand
against that database first.

If that trade-off starts to bite — several deployed databases, or frequent
column changes — the answer is to reintroduce a numbered `migrations/` folder
alongside this file rather than to make `install.sql` carry both jobs.
