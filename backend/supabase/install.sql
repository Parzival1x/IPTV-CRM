-- ===========================================================================
-- StreamOps IPTV CRM -- complete schema for a NEW database
-- ===========================================================================
--
-- Run this ONCE, in the Supabase SQL Editor, on an empty project. It creates
-- everything the application needs: types, tables, indexes, triggers,
-- functions, views, row level security, and the starter plan catalogue.
--
--   New project?      Run this file. Nothing else.
--   Existing project? Do NOT run this file. Apply the numbered files in
--                     ./migrations/ instead -- they upgrade a database that
--                     already holds customer data. See ./README.md.
--
-- Safe to run more than once: every statement is guarded.
--
-- ---------------------------------------------------------------------------
-- CONTENTS
-- ---------------------------------------------------------------------------
--   1. Extensions and enumerated types
--   2. Shared trigger function
--   3. Identity        -- admin_users, customers
--   4. Catalogue       -- subscription_plans
--   5. Subscriptions   -- customer_subscriptions
--   6. Money           -- payments, payment_allocations
--   7. Requests        -- service_requests, admin_notifications
--   8. Messaging       -- email_messages, whatsapp_messages, subscription_reminders
--   9. Audit           -- activity_logs
--  10. Indexes
--  11. updated_at triggers
--  12. Business logic  -- record_customer_payment, refund_customer_payment,
--                         expire_lapsed_subscriptions
--  13. Reporting views -- customer_financials, renewal_overview, revenue_by_month
--  14. Row level security
--  15. Starter data
--
-- ---------------------------------------------------------------------------
-- A NOTE ON WHAT IS NOT HERE
-- ---------------------------------------------------------------------------
-- The original schema also created `profiles`, `devices`, `device_assignments`,
-- `invoices`, `support_tickets` and `whatsapp_templates`. No route, repository
-- or script ever read from any of them, and `profiles` in particular was the
-- target of foreign keys that were therefore always null. They are omitted so
-- a new installation starts with a schema that matches the application.
--
-- ---------------------------------------------------------------------------
-- A NOTE ON SECURITY
-- ---------------------------------------------------------------------------
-- This application authenticates against `admin_users` and
-- `customers.portal_password_hash` with its own JWTs. It never signs anyone
-- into Supabase Auth, so `auth.uid()` is always null and no policy written
-- against it could ever match a real request. Every read and write goes
-- through the Express API using the service role key, and service_role
-- bypasses RLS.
--
-- Deny-all is therefore the correct posture: RLS on, no policies, and the
-- table grants revoked from `anon` and `authenticated` so that a permissive
-- policy added later still cannot expose anything to the public key.


-- ===========================================================================
-- 1. Extensions and enumerated types
-- ===========================================================================

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'customer_status') then
    create type customer_status as enum ('active', 'inactive', 'pending', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('draft', 'active', 'expired', 'cancelled', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('paid', 'pending', 'failed', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_mode') then
    create type payment_mode as enum ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type message_type as enum ('welcome', 'reminder', 'alert', 'broadcast', 'payment_due');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type message_status as enum ('queued', 'sent', 'delivered', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'service_request_status') then
    create type service_request_status as enum ('pending', 'approved', 'rejected', 'fulfilled');
  end if;
end $$;


-- ===========================================================================
-- 2. Shared trigger function
-- ===========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


-- ===========================================================================
-- 3. Identity
-- ===========================================================================

-- Console logins. The only actor table in the system.
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin' check (role in ('super-admin', 'admin', 'moderator')),
  avatar text not null default '/images/user/user-01.png',
  is_active boolean not null default true,
  -- Every JWT carries this value and it is checked on each request. Bumping it
  -- invalidates every token already issued to this admin, which is what makes
  -- a password change or a deactivation take effect immediately rather than
  -- whenever the token happens to expire.
  token_version integer not null default 0,
  last_login timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Customer identity, contact details, and portal credentials.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),

  -- Human-facing references, generated by the API.
  customer_code text,
  service_id text,
  transaction_id text,

  -- Identity and contact.
  name text not null,
  phone text not null,
  whatsapp_number text,
  email text,
  address text,
  city text,
  country text,
  status customer_status not null default 'active',
  avatar text not null default '/images/user/user-02.png',
  role text not null default 'customer',

  -- A copy of the primary subscription, kept for the flat list views. The
  -- subscription rows are authoritative.
  mac text,
  box text,
  start_date date,
  payment_date date,
  payment_mode payment_mode not null default 'other',
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'USD',
  expiry_date date,
  service_duration integer,

  -- Notification consent. Enforced by the notification service; the only
  -- messages that ignore it are the customer's own portal credentials.
  whatsapp_opt_in boolean not null default true,
  email_opt_in boolean not null default true,

  -- Portal access.
  portal_password_hash text,
  portal_access_enabled boolean not null default true,
  portal_reset_required boolean not null default true,
  -- A temporary password stops being a standing credential once this passes.
  portal_password_expires_at timestamptz,
  portal_last_login timestamptz,
  token_version integer not null default 0,

  notes text,

  -- Soft delete. Removing a customer must not destroy the record of money they
  -- paid, so nothing is ever hard-deleted here.
  deleted_at timestamptz,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);


-- ===========================================================================
-- 4. Catalogue
-- ===========================================================================

-- Shared across every customer. A customer's negotiated price lives on their
-- own subscription row, never here.
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text unique,
  name text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'USD',
  -- Billing cycle length. Renewal arithmetic uses months so that it agrees
  -- with the calendar: storing only days meant a 12-month plan renewed after
  -- 360 days and the customer lost five days a year.
  duration_months integer not null default 12 check (duration_months > 0),
  duration_days integer not null check (duration_days > 0),
  max_connections integer not null default 1 check (max_connections > 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);


-- ===========================================================================
-- 5. Subscriptions
-- ===========================================================================

-- A customer's instance of a plan. Owns the device identifiers and the price
-- that customer actually pays.
create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,

  activation_date date not null,
  expiry_date date not null,
  status subscription_status not null default 'active',

  amount numeric(12,2) not null default 0 check (amount >= 0),
  discount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  payment_mode payment_mode not null default 'other',

  -- How much has been paid toward the CURRENT billing cycle. This is what
  -- makes a part payment survive: without it a payment short of the full price
  -- was recorded as `pending`, counted by nothing, and a second part payment
  -- started again from zero so the subscription could never renew.
  cycle_paid_amount numeric(12,2) not null default 0 check (cycle_paid_amount >= 0),

  auto_renew boolean not null default false,
  service_label text,
  service_code text,
  transaction_id text,
  device_box text,
  device_mac text,
  portal_url text,
  billing_url text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint customer_subscriptions_dates_check check (expiry_date >= activation_date)
);


-- ===========================================================================
-- 6. Money
-- ===========================================================================

-- One row per payment EVENT -- one row per transaction the customer performed,
-- not one row per service it touched.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  -- Set only when the payment covered exactly one service. The allocations
  -- below are the authoritative breakdown.
  subscription_id uuid references public.customer_subscriptions (id) on delete set null,

  amount numeric(12,2) not null default 0 check (amount >= 0),
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  final_amount numeric(12,2) generated always as ((amount - discount) + tax) stored,
  currency text not null default 'USD',

  payment_mode payment_mode not null default 'cash',
  transaction_id text,
  status payment_status not null default 'paid',
  payment_date timestamptz not null default timezone('utc', now()),
  next_due_date date,
  notes text,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- How a payment was split across services. Paying for three services in one
-- transaction is one payment row and three allocation rows.
create table if not exists public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  -- Null means the money was not applied to any service: it is account credit
  -- sitting on the customer, available to settle a later cycle.
  subscription_id uuid references public.customer_subscriptions (id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  -- True when this slice renewed the subscription rather than only topping up
  -- the current cycle.
  renewed boolean not null default false,
  -- Set on a credit row once a later payment draws that credit down. Without
  -- it, spent credit would show as available forever.
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);


-- ===========================================================================
-- 7. Requests
-- ===========================================================================

-- Raised by customers from the portal, reviewed by an admin.
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  plan_id uuid references public.subscription_plans (id) on delete set null,
  requested_plan_code text,
  requested_plan_name text not null,
  requested_duration_months integer not null default 12 check (requested_duration_months > 0),
  requested_amount numeric(12,2) not null default 0,
  notes text,
  status service_request_status not null default 'pending',
  admin_response text,
  reviewed_by uuid references public.admin_users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- The admin inbox.
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text not null,
  customer_id uuid references public.customers (id) on delete set null,
  service_request_id uuid references public.service_requests (id) on delete cascade,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);


-- ===========================================================================
-- 8. Messaging
-- ===========================================================================

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  template_name text,
  subject text not null,
  message_text text,
  message_html text,
  status message_status not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  subscription_id uuid references public.customer_subscriptions (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  message_type message_type not null,
  template_name text,
  message_content text not null,
  status message_status not null default 'queued',
  provider_message_id text,
  -- Written by the delivery webhook at POST /api/webhooks/whatsapp. Without
  -- that endpoint there is no way to tell a message the API accepted from one
  -- that actually arrived.
  provider_status text,
  retry_count integer not null default 0,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Which renewal reminders have already gone out.
--
-- Keyed on the expiry date the reminder was ABOUT, not the date it was sent. A
-- subscription that renews gets a new expiry date and becomes eligible for the
-- same reminder again, which is correct; two scheduler runs on the same day
-- for the same unrenewed subscription collide on the unique constraint, which
-- is also correct.
create table if not exists public.subscription_reminders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.customer_subscriptions (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  reminder_kind text not null,
  expiry_date date not null,
  channels text[] not null default '{}',
  sent_at timestamptz not null default timezone('utc', now()),
  constraint subscription_reminders_unique unique (subscription_id, reminder_kind, expiry_date)
);


-- ===========================================================================
-- 9. Audit
-- ===========================================================================

-- Who did what. Written for every administrative action that changes money,
-- access, or the existence of a record.
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.admin_users (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);


-- ===========================================================================
-- 10. Indexes
-- ===========================================================================

create index if not exists idx_admin_users_email on public.admin_users (email);

-- The uniqueness constraints ignore soft-deleted rows, so removing a customer
-- does not reserve their email and phone number forever.
create unique index if not exists idx_customers_email_unique
  on public.customers (lower(email)) where email is not null and deleted_at is null;
create unique index if not exists idx_customers_phone_unique
  on public.customers (phone) where deleted_at is null;
create unique index if not exists idx_customers_customer_code_unique
  on public.customers (customer_code) where customer_code is not null and deleted_at is null;
create unique index if not exists idx_customers_service_id_unique
  on public.customers (service_id) where service_id is not null and deleted_at is null;
create unique index if not exists idx_customers_transaction_id_unique
  on public.customers (transaction_id) where transaction_id is not null and deleted_at is null;

create index if not exists idx_customers_status on public.customers (status);
create index if not exists idx_customers_whatsapp on public.customers (whatsapp_number);
create index if not exists idx_customers_deleted_at on public.customers (deleted_at) where deleted_at is null;
create index if not exists idx_customers_notification_optin
  on public.customers (whatsapp_opt_in, email_opt_in) where deleted_at is null;

create index if not exists idx_customer_subscriptions_customer_id on public.customer_subscriptions (customer_id);
create index if not exists idx_customer_subscriptions_expiry_date on public.customer_subscriptions (expiry_date);
create index if not exists idx_customer_subscriptions_status on public.customer_subscriptions (status);
create index if not exists idx_customer_subscriptions_service_code on public.customer_subscriptions (service_code);

create index if not exists idx_payments_customer_id on public.payments (customer_id);
create index if not exists idx_payments_payment_date on public.payments (payment_date desc);
create index if not exists idx_payments_next_due_date on public.payments (next_due_date);

create index if not exists idx_payment_allocations_payment_id on public.payment_allocations (payment_id);
create index if not exists idx_payment_allocations_subscription_id on public.payment_allocations (subscription_id);
create index if not exists idx_payment_allocations_open_credit
  on public.payment_allocations (payment_id) where subscription_id is null and consumed_at is null;

create index if not exists idx_email_messages_customer_id on public.email_messages (customer_id);
create index if not exists idx_email_messages_status on public.email_messages (status);
create index if not exists idx_whatsapp_messages_customer_id on public.whatsapp_messages (customer_id);
create index if not exists idx_whatsapp_messages_status on public.whatsapp_messages (status);
create index if not exists idx_whatsapp_messages_provider_message_id
  on public.whatsapp_messages (provider_message_id) where provider_message_id is not null;

create index if not exists idx_subscription_reminders_customer on public.subscription_reminders (customer_id);

create index if not exists idx_service_requests_customer_id on public.service_requests (customer_id);
create index if not exists idx_service_requests_status on public.service_requests (status);

create index if not exists idx_admin_notifications_is_read on public.admin_notifications (is_read);
create index if not exists idx_admin_notifications_created_at on public.admin_notifications (created_at desc);

create index if not exists idx_activity_logs_user_id on public.activity_logs (user_id);
create index if not exists idx_activity_logs_customer_id on public.activity_logs (customer_id);
create index if not exists idx_activity_logs_action on public.activity_logs (action);
create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);


-- ===========================================================================
-- 11. updated_at triggers
-- ===========================================================================

do $$
declare
  target text;
begin
  foreach target in array array[
    'admin_users', 'customers', 'subscription_plans', 'customer_subscriptions',
    'payments', 'email_messages', 'whatsapp_messages', 'service_requests'
  ]
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$I', target);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I
       for each row execute function public.set_updated_at()', target);
  end loop;
end $$;


-- ===========================================================================
-- 12. Business logic
-- ===========================================================================

-- Records a payment atomically.
--
-- This is a function rather than a sequence of statements in the API because
-- it has to be all-or-nothing. Done from the application it was five-plus
-- separate writes -- extend each expiry date, insert the payment rows, update
-- the customer -- and a failure in between renewed a service without recording
-- that anyone had paid for it.
--
-- Allocation order follows p_subscription_ids, so the caller decides which
-- service is settled first when the money does not cover everything.
--
-- Returns the id of the payment event it created.
create or replace function public.record_customer_payment(
  p_customer_id uuid,
  p_subscription_ids uuid[],
  p_amount numeric,
  p_payment_mode payment_mode,
  p_transaction_id text,
  p_payment_date timestamptz,
  p_discount numeric default 0,
  p_tax numeric default 0,
  p_currency text default 'USD',
  p_notes text default null,
  p_apply_credit boolean default true
)
returns uuid
language plpgsql
as $$
declare
  v_payment_id uuid;
  v_subscription record;
  v_net_price numeric(12,2);
  v_outstanding numeric(12,2);
  v_allocated numeric(12,2);
  v_remaining numeric(12,2);
  v_credit numeric(12,2);
  v_renewed boolean;
  v_base_date date;
  v_duration_months integer;
  v_selected_count integer;
begin
  if p_customer_id is null then
    raise exception 'A customer is required to record a payment.';
  end if;

  if p_subscription_ids is null or array_length(p_subscription_ids, 1) is null then
    raise exception 'Choose at least one service for this payment.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  -- Every id must belong to this customer. Anything else is either a bug or an
  -- attempt to pay down somebody else's subscription.
  select count(*)
  into v_selected_count
  from public.customer_subscriptions cs
  where cs.customer_id = p_customer_id
    and cs.id = any (p_subscription_ids);

  if v_selected_count <> array_length(p_subscription_ids, 1) then
    raise exception 'One or more selected services could not be found for this customer.';
  end if;

  insert into public.payments (
    customer_id, subscription_id, amount, discount, tax, payment_mode,
    transaction_id, status, payment_date, currency, notes
  )
  values (
    p_customer_id,
    case when array_length(p_subscription_ids, 1) = 1 then p_subscription_ids[1] else null end,
    p_amount,
    coalesce(p_discount, 0),
    coalesce(p_tax, 0),
    coalesce(p_payment_mode, 'other'),
    nullif(p_transaction_id, ''),
    'paid',
    coalesce(p_payment_date, timezone('utc', now())),
    coalesce(nullif(p_currency, ''), 'USD'),
    p_notes
  )
  returning id into v_payment_id;

  -- final_amount is generated: (amount - discount) + tax. That is the money
  -- actually received, so that is what gets allocated.
  select final_amount into v_remaining from public.payments where id = v_payment_id;

  -- Draw down any account credit the customer is already sitting on, so a
  -- surplus left by an earlier payment settles a later cycle instead of
  -- showing as available forever. Whatever is not spent by the end of this
  -- call is written back as a fresh credit row, so the balance is preserved
  -- either way.
  if coalesce(p_apply_credit, true) then
    with drawn as (
      update public.payment_allocations pa
      set consumed_at = timezone('utc', now())
      from public.payments p
      where p.id = pa.payment_id
        and p.customer_id = p_customer_id
        and p.status = 'paid'
        and pa.subscription_id is null
        and pa.consumed_at is null
      returning pa.amount
    )
    select coalesce(sum(amount), 0) into v_credit from drawn;

    v_remaining := v_remaining + v_credit;
  end if;

  for v_subscription in
    select cs.id,
           cs.amount,
           cs.discount,
           cs.expiry_date,
           cs.cycle_paid_amount,
           coalesce(sp.duration_months, 12) as duration_months
    from unnest(p_subscription_ids) with ordinality as sel(subscription_id, ord)
    join public.customer_subscriptions cs on cs.id = sel.subscription_id
    left join public.subscription_plans sp on sp.id = cs.plan_id
    where cs.customer_id = p_customer_id
    order by sel.ord
    -- Serialises two admins recording a payment for the same customer at the
    -- same moment. Without it both could read cycle_paid_amount = 0, both
    -- decide the cycle is unpaid, and both renew.
    for update of cs
  loop
    exit when v_remaining <= 0;

    v_net_price := greatest(v_subscription.amount - coalesce(v_subscription.discount, 0), 0);
    v_outstanding := greatest(v_net_price - v_subscription.cycle_paid_amount, 0);

    if v_outstanding <= 0 then
      -- Already settled for this cycle. Skip rather than renewing twice.
      continue;
    end if;

    v_allocated := least(v_remaining, v_outstanding);
    v_renewed := (v_subscription.cycle_paid_amount + v_allocated) >= v_net_price;

    if v_renewed then
      -- Renew from whichever is later: the current expiry, so paying early
      -- does not forfeit the unused remainder, or today, so a long-lapsed
      -- account does not receive a term that is already in the past.
      v_base_date := greatest(coalesce(v_subscription.expiry_date, current_date), current_date);
      v_duration_months := greatest(v_subscription.duration_months, 1);

      update public.customer_subscriptions
      set status = 'active',
          expiry_date = (v_base_date + make_interval(months => v_duration_months))::date,
          cycle_paid_amount = (v_subscription.cycle_paid_amount + v_allocated) - v_net_price
      where id = v_subscription.id;
    else
      update public.customer_subscriptions
      set cycle_paid_amount = v_subscription.cycle_paid_amount + v_allocated
      where id = v_subscription.id;
    end if;

    insert into public.payment_allocations (payment_id, subscription_id, amount, renewed)
    values (v_payment_id, v_subscription.id, v_allocated, v_renewed);

    v_remaining := v_remaining - v_allocated;
  end loop;

  -- Anything left over is account credit, not attached to a service.
  if v_remaining > 0 then
    insert into public.payment_allocations (payment_id, subscription_id, amount, renewed)
    values (v_payment_id, null, v_remaining, false);
  end if;

  return v_payment_id;
end;
$$;

revoke all on function public.record_customer_payment(
  uuid, uuid[], numeric, payment_mode, text, timestamptz, numeric, numeric, text, text, boolean
) from public, anon, authenticated;


-- Reverses a payment: cycle progress is given back, and a renewal the payment
-- bought is rolled back by the same number of months.
create or replace function public.refund_customer_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
as $$
declare
  v_allocation record;
  v_duration_months integer;
begin
  if not exists (select 1 from public.payments where id = p_payment_id and status = 'paid') then
    raise exception 'Only a payment currently marked paid can be refunded.';
  end if;

  for v_allocation in
    select pa.id,
           pa.subscription_id,
           pa.amount,
           pa.renewed,
           cs.cycle_paid_amount,
           cs.amount as subscription_amount,
           cs.discount,
           cs.expiry_date,
           coalesce(sp.duration_months, 12) as duration_months
    from public.payment_allocations pa
    join public.customer_subscriptions cs on cs.id = pa.subscription_id
    left join public.subscription_plans sp on sp.id = cs.plan_id
    where pa.payment_id = p_payment_id
    for update of cs
  loop
    v_duration_months := greatest(v_allocation.duration_months, 1);

    if v_allocation.renewed then
      update public.customer_subscriptions
      set expiry_date = (v_allocation.expiry_date - make_interval(months => v_duration_months))::date,
          cycle_paid_amount = greatest(
            v_allocation.cycle_paid_amount
              + greatest(v_allocation.subscription_amount - coalesce(v_allocation.discount, 0), 0)
              - v_allocation.amount,
            0
          ),
          status = case
            when (v_allocation.expiry_date - make_interval(months => v_duration_months))::date < current_date
              then 'expired'::subscription_status
            else status
          end
      where id = v_allocation.subscription_id;
    else
      update public.customer_subscriptions
      set cycle_paid_amount = greatest(v_allocation.cycle_paid_amount - v_allocation.amount, 0)
      where id = v_allocation.subscription_id;
    end if;
  end loop;

  update public.payments
  set status = 'refunded',
      notes = coalesce(nullif(p_reason, ''), notes)
  where id = p_payment_id;

  return p_payment_id;
end;
$$;

revoke all on function public.refund_customer_payment(uuid, text) from public, anon, authenticated;


-- Marks lapsed subscriptions expired and keeps the customer status in step.
-- Called nightly by the scheduler; nothing in the original application ever
-- did this, so a subscription stayed `active` forever after its expiry date
-- passed.
--
-- Returns the number of subscriptions it expired.
create or replace function public.expire_lapsed_subscriptions()
returns integer
language plpgsql
as $$
declare
  v_expired integer;
begin
  with lapsed as (
    update public.customer_subscriptions cs
    set status = 'expired'
    where cs.status = 'active'
      and cs.expiry_date < current_date
    returning cs.customer_id
  )
  select count(*) into v_expired from lapsed;

  -- A customer whose every subscription has lapsed becomes inactive. One with
  -- at least one live subscription is left alone.
  update public.customers c
  set status = 'inactive'
  where c.deleted_at is null
    and c.status = 'active'
    and exists (select 1 from public.customer_subscriptions cs where cs.customer_id = c.id)
    and not exists (
      select 1 from public.customer_subscriptions cs
      where cs.customer_id = c.id and cs.status in ('active', 'draft')
    );

  -- And the reverse, for an account a payment has brought back to life.
  update public.customers c
  set status = 'active'
  where c.deleted_at is null
    and c.status = 'inactive'
    and exists (
      select 1 from public.customer_subscriptions cs
      where cs.customer_id = c.id and cs.status = 'active'
    );

  return coalesce(v_expired, 0);
end;
$$;

revoke all on function public.expire_lapsed_subscriptions() from public, anon, authenticated;


-- ===========================================================================
-- 13. Reporting views
-- ===========================================================================
--
-- These replace cached `total_credit` / `already_given` / `remaining_credits`
-- columns whose names did not describe what they held and which were
-- maintained by application code across several un-batched writes. Computed
-- from the payments and subscriptions they summarise, they cannot drift.
--
-- security_invoker is deliberate: a view must not become a way around the row
-- level security on its base tables.

create or replace view public.customer_financials
with (security_invoker = true)
as
with subscription_totals as (
  select
    cs.customer_id,
    sum(greatest(cs.amount - coalesce(cs.discount, 0), 0))
      filter (where cs.status in ('active', 'expired', 'suspended')) as recurring_amount,
    sum(greatest(greatest(cs.amount - coalesce(cs.discount, 0), 0) - cs.cycle_paid_amount, 0))
      filter (where cs.status in ('expired', 'suspended')
                 or (cs.status = 'active' and cs.expiry_date < current_date)) as overdue_amount,
    sum(greatest(greatest(cs.amount - coalesce(cs.discount, 0), 0) - cs.cycle_paid_amount, 0))
      filter (where cs.status = 'active'
                and cs.expiry_date >= current_date
                and cs.expiry_date <= current_date + 7) as due_soon_amount,
    count(*) filter (where cs.status in ('expired', 'suspended')
                       or (cs.status = 'active' and cs.expiry_date < current_date)) as overdue_service_count,
    count(*) filter (where cs.status = 'active'
                       and cs.expiry_date >= current_date
                       and cs.expiry_date <= current_date + 7) as due_soon_service_count,
    count(*) filter (where cs.status = 'active') as active_service_count,
    count(*) as service_count
  from public.customer_subscriptions cs
  group by cs.customer_id
),
payment_totals as (
  select
    p.customer_id,
    sum(p.final_amount) filter (where p.status = 'paid') as total_paid,
    sum(p.final_amount) filter (where p.status = 'refunded') as total_refunded,
    max(p.payment_date) filter (where p.status = 'paid') as last_payment_date
  from public.payments p
  group by p.customer_id
),
credit_totals as (
  -- Money received, not applied to any subscription, and not since drawn down.
  select p.customer_id, sum(pa.amount) as unapplied_credit
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id
  where pa.subscription_id is null
    and pa.consumed_at is null
    and p.status = 'paid'
  group by p.customer_id
)
select
  c.id as customer_id,
  coalesce(st.recurring_amount, 0)::numeric(12,2) as recurring_amount,
  (coalesce(st.overdue_amount, 0) + coalesce(st.due_soon_amount, 0))::numeric(12,2) as due_now,
  coalesce(st.overdue_amount, 0)::numeric(12,2) as overdue_amount,
  -- A refunded payment already has status 'refunded' and has dropped out of
  -- the 'paid' filter. Subtracting total_refunded here as well would remove it
  -- twice and drive the balance negative.
  coalesce(pt.total_paid, 0)::numeric(12,2) as total_paid,
  coalesce(pt.total_refunded, 0)::numeric(12,2) as total_refunded,
  coalesce(ct.unapplied_credit, 0)::numeric(12,2) as available_credit,
  greatest(
    coalesce(st.overdue_amount, 0) + coalesce(st.due_soon_amount, 0)
      - coalesce(ct.unapplied_credit, 0), 0
  )::numeric(12,2) as outstanding_balance,
  coalesce(st.due_soon_service_count, 0)::integer as due_soon_service_count,
  coalesce(st.overdue_service_count, 0)::integer as overdue_service_count,
  coalesce(st.active_service_count, 0)::integer as active_service_count,
  coalesce(st.service_count, 0)::integer as service_count,
  pt.last_payment_date
from public.customers c
left join subscription_totals st on st.customer_id = c.id
left join payment_totals pt on pt.customer_id = c.id
left join credit_totals ct on ct.customer_id = c.id
where c.deleted_at is null;

revoke all on public.customer_financials from anon, authenticated;


-- One row per subscription needing attention, which is what the renewals
-- screen and the reminder scheduler are both actually asking for.
create or replace view public.renewal_overview
with (security_invoker = true)
as
select
  cs.id as subscription_id,
  cs.customer_id,
  c.name as customer_name,
  c.email,
  c.phone,
  c.whatsapp_number,
  c.whatsapp_opt_in,
  c.email_opt_in,
  cs.service_label,
  cs.service_code,
  cs.status,
  cs.expiry_date,
  cs.amount,
  cs.discount,
  cs.currency,
  cs.cycle_paid_amount,
  greatest(greatest(cs.amount - coalesce(cs.discount, 0), 0) - cs.cycle_paid_amount, 0)::numeric(12,2)
    as outstanding_amount,
  (cs.expiry_date - current_date) as days_until_expiry,
  coalesce(sp.duration_months, 12) as duration_months,
  sp.name as plan_name,
  sp.plan_code
from public.customer_subscriptions cs
join public.customers c on c.id = cs.customer_id
left join public.subscription_plans sp on sp.id = cs.plan_id
where c.deleted_at is null
  and cs.status in ('active', 'expired', 'suspended');

revoke all on public.renewal_overview from anon, authenticated;


-- Revenue by month. A refund flips the original payment's status rather than
-- writing a reversing row, so it leaves `collected` by itself: `collected` is
-- already net of refunds, and is attributed to the month the money came in
-- rather than the month the refund was processed.
create or replace view public.revenue_by_month
with (security_invoker = true)
as
select
  date_trunc('month', p.payment_date)::date as month,
  p.currency,
  coalesce(sum(p.final_amount) filter (where p.status = 'paid'), 0)::numeric(12,2) as collected,
  coalesce(sum(p.final_amount) filter (where p.status = 'refunded'), 0)::numeric(12,2) as refunded,
  coalesce(sum(p.final_amount) filter (where p.status = 'pending'), 0)::numeric(12,2) as pending,
  count(*) filter (where p.status = 'paid')::integer as payment_count
from public.payments p
join public.customers c on c.id = p.customer_id
where c.deleted_at is null
group by 1, 2;

revoke all on public.revenue_by_month from anon, authenticated;


-- ===========================================================================
-- 14. Row level security and grants
-- ===========================================================================
-- See the note at the top of this file for why deny-all is the correct posture
-- rather than a set of policies.
--
-- Four layers, because any one of them can be undone by accident later:
--
--   1. RLS enabled on every table, with no policies -- nothing matches.
--   2. Table and view grants revoked from `anon` and `authenticated`, so a
--      permissive policy added later still exposes nothing.
--   3. Function execute revoked from the same roles, so the payment and refund
--      functions cannot be invoked through PostgREST's RPC endpoint.
--   4. Default privileges altered, so a table or function added in the future
--      is locked down on creation rather than inheriting Supabase's defaults.
--
-- `service_role` holds its own grants and carries the BYPASSRLS attribute, so
-- the API is unaffected by all of this.

-- 1 + 2: every table in the schema, found rather than listed, so a table added
-- later without updating this file is still caught on the next run.
do $$
declare
  target text;
begin
  for target in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format('revoke all on public.%I from anon, authenticated', target);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- 3: PostgREST exposes every function in the exposed schema as an RPC
-- endpoint. record_customer_payment moves money.
revoke all on all functions in schema public from anon, authenticated;

-- 4: anything created from here on starts locked.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;


-- ===========================================================================
-- 15. Starter data
-- ===========================================================================
-- A plan catalogue to begin from. Edit or retire these from Plans in the admin
-- console -- they are examples, not fixtures the application depends on.

insert into public.subscription_plans
  (plan_code, name, price, duration_months, duration_days, max_connections, description)
values
  ('IPTV-BAS-001', 'IPTV Basic Package',       30, 12, 365, 1, '100+ channels, HD quality, mobile app access, and DVR recording.'),
  ('IPTV-PRE-001', 'IPTV Premium Package',     60, 12, 365, 2, '300+ channels, 4K quality, sports bundles, and premium content.'),
  ('INT-BAS-001',  'Basic Internet Package',   25, 12, 365, 1, 'Up to 100 Mbps with unlimited data and basic support.'),
  ('INT-PRE-001',  'Premium Internet Package', 50, 12, 365, 2, 'Up to 500 Mbps, unlimited data, priority support, and advanced security.'),
  ('VPN-001',      'VPN Service',              15, 12, 365, 5, 'Global servers, no logs policy, and multi-device coverage.')
on conflict (plan_code) do nothing;


-- ===========================================================================
-- Done
-- ===========================================================================

-- Refuses to finish quietly if any of the four security layers failed to take.
-- An install that half-applied should be loud, not silently reachable with the
-- key that ships to every browser.
do $$
declare
  v_tables integer;
  v_functions integer;
  v_views integer;
  v_unprotected text;
  v_table_grants text;
  v_function_grants integer;
begin
  select count(*) into v_tables
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r';

  select count(*) into v_views
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'v';

  select count(*) into v_functions
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('record_customer_payment', 'refund_customer_payment',
                      'expire_lapsed_subscriptions', 'set_updated_at');

  -- Layer 1: RLS on every table.
  select string_agg(c.relname, ', ' order by c.relname) into v_unprotected
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  if v_unprotected is not null then
    raise exception 'Row level security is still disabled on: %', v_unprotected;
  end if;

  -- Layer 2: no table or view reachable with the public key.
  select string_agg(distinct table_name, ', ' order by table_name) into v_table_grants
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated');

  if v_table_grants is not null then
    raise exception 'Still reachable with the anon key: %', v_table_grants;
  end if;

  -- Layer 3: no function callable through PostgREST RPC.
  select count(*) into v_function_grants
  from information_schema.role_routine_grants
  where specific_schema = 'public' and grantee in ('anon', 'authenticated');

  if v_function_grants > 0 then
    raise exception '% function grant(s) remain for anon/authenticated', v_function_grants;
  end if;

  if v_functions < 4 then
    raise exception 'Expected 4 functions, found %', v_functions;
  end if;

  raise notice 'StreamOps schema installed.';
  raise notice '  % tables, % views, % functions', v_tables, v_views, v_functions;
  raise notice '  RLS enabled on every table; no anon/authenticated grants remain.';
  raise notice 'Next: cd backend && npm run seed:admin';
end $$;
