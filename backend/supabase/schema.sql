create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'staff', 'customer');
  end if;

  if not exists (select 1 from pg_type where typname = 'customer_status') then
    create type customer_status as enum ('active', 'inactive', 'pending', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('draft', 'active', 'expired', 'cancelled', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'device_status') then
    create type device_status as enum ('available', 'assigned', 'faulty', 'retired');
  end if;

  if not exists (select 1 from pg_type where typname = 'assignment_status') then
    create type assignment_status as enum ('assigned', 'returned', 'lost', 'damaged');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('paid', 'pending', 'failed', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_mode') then
    create type payment_mode as enum ('cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft', 'issued', 'void');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type message_type as enum ('welcome', 'reminder', 'alert', 'broadcast', 'payment_due');
  end if;

  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type message_status as enum ('queued', 'sent', 'delivered', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_priority') then
    create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'service_request_status') then
    create type service_request_status as enum ('pending', 'approved', 'rejected', 'fulfilled');
  end if;
end $$;

do $$
begin
  alter type app_role add value if not exists 'moderator';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type customer_status add value if not exists 'pending';
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role app_role not null default 'staff',
  full_name text not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin' check (role in ('super-admin', 'admin', 'moderator')),
  avatar text not null default '/images/user/user-01.png',
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  customer_code text unique,
  service_id text unique,
  transaction_id text unique,
  name text not null,
  phone text not null,
  whatsapp_number text,
  email text unique,
  address text,
  city text,
  country text,
  status customer_status not null default 'active',
  avatar text not null default '/images/user/user-02.png',
  role text not null default 'customer',
  mac text,
  box text,
  start_date date,
  payment_date date,
  payment_mode payment_mode not null default 'other',
  amount numeric(12,2) not null default 0,
  expiry_date date,
  total_credit numeric(12,2) not null default 0,
  already_given numeric(12,2) not null default 0,
  remaining_credits numeric(12,2) not null default 0,
  service_duration integer,
  whatsapp_opt_in boolean not null default true,
  email_opt_in boolean not null default true,
  portal_password_hash text,
  portal_access_enabled boolean not null default true,
  portal_reset_required boolean not null default true,
  portal_last_login timestamptz,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.customers add column if not exists avatar text not null default '/images/user/user-02.png';
alter table public.customers add column if not exists role text not null default 'customer';
alter table public.customers add column if not exists customer_code text;
alter table public.customers add column if not exists service_id text;
alter table public.customers add column if not exists transaction_id text;
alter table public.customers add column if not exists mac text;
alter table public.customers add column if not exists box text;
alter table public.customers add column if not exists start_date date;
alter table public.customers add column if not exists payment_date date;
alter table public.customers add column if not exists payment_mode payment_mode not null default 'other';
alter table public.customers add column if not exists amount numeric(12,2) not null default 0;
alter table public.customers add column if not exists expiry_date date;
alter table public.customers add column if not exists total_credit numeric(12,2) not null default 0;
alter table public.customers add column if not exists already_given numeric(12,2) not null default 0;
alter table public.customers add column if not exists remaining_credits numeric(12,2) not null default 0;
alter table public.customers add column if not exists service_duration integer;
alter table public.customers add column if not exists whatsapp_opt_in boolean not null default true;
alter table public.customers add column if not exists email_opt_in boolean not null default true;
alter table public.customers add column if not exists portal_password_hash text;
alter table public.customers add column if not exists portal_access_enabled boolean not null default true;
alter table public.customers add column if not exists portal_reset_required boolean not null default true;
alter table public.customers add column if not exists portal_last_login timestamptz;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text unique,
  name text not null,
  price numeric(12,2) not null default 0,
  duration_days integer not null check (duration_days > 0),
  max_connections integer not null default 1 check (max_connections > 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  activation_date date not null,
  expiry_date date not null,
  status subscription_status not null default 'active',
  discount numeric(12,2) not null default 0,
  auto_renew boolean not null default false,
  service_label text,
  service_code text,
  transaction_id text,
  payment_mode payment_mode not null default 'other',
  amount numeric(12,2) not null default 0,
  device_box text,
  device_mac text,
  portal_url text,
  billing_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_subscriptions_dates_check check (expiry_date >= activation_date)
);

alter table public.customer_subscriptions add column if not exists service_label text;
alter table public.customer_subscriptions add column if not exists service_code text;
alter table public.customer_subscriptions add column if not exists transaction_id text;
alter table public.customer_subscriptions add column if not exists payment_mode payment_mode not null default 'other';
alter table public.customer_subscriptions add column if not exists amount numeric(12,2) not null default 0;
alter table public.customer_subscriptions add column if not exists device_box text;
alter table public.customer_subscriptions add column if not exists device_mac text;
alter table public.customer_subscriptions add column if not exists portal_url text;
alter table public.customer_subscriptions add column if not exists billing_url text;
alter table public.customer_subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_type text not null,
  brand text,
  model text,
  mac_address text unique,
  serial_number text unique,
  status device_status not null default 'available',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.device_assignments (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  subscription_id uuid references public.customer_subscriptions (id) on delete set null,
  assigned_date date not null,
  return_date date,
  status assignment_status not null default 'assigned',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint device_assignments_dates_check check (return_date is null or return_date >= assigned_date)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  subscription_id uuid references public.customer_subscriptions (id) on delete set null,
  amount numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  final_amount numeric(12,2) generated always as ((amount - discount) + tax) stored,
  payment_mode payment_mode not null default 'cash',
  transaction_id text,
  status payment_status not null default 'paid',
  payment_date timestamptz not null default timezone('utc', now()),
  next_due_date date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  invoice_number text not null unique,
  pdf_url text,
  status invoice_status not null default 'issued',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  message_type message_type not null,
  template_body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  subscription_id uuid references public.customer_subscriptions (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  message_type message_type not null,
  template_id uuid references public.whatsapp_templates (id) on delete set null,
  template_name text,
  message_content text not null,
  status message_status not null default 'queued',
  provider_message_id text,
  retry_count integer not null default 0,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  subject text not null,
  message text not null,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

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

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_admin_users_email on public.admin_users (email);
create index if not exists idx_customers_status on public.customers (status);
create unique index if not exists idx_customers_customer_code_unique on public.customers (customer_code) where customer_code is not null;
create unique index if not exists idx_customers_service_id_unique on public.customers (service_id) where service_id is not null;
create unique index if not exists idx_customers_transaction_id_unique on public.customers (transaction_id) where transaction_id is not null;
create unique index if not exists idx_customers_phone_unique on public.customers (phone);
create index if not exists idx_customers_whatsapp on public.customers (whatsapp_number);
create index if not exists idx_customer_subscriptions_customer_id on public.customer_subscriptions (customer_id);
create index if not exists idx_customer_subscriptions_expiry_date on public.customer_subscriptions (expiry_date);
create index if not exists idx_customer_subscriptions_status on public.customer_subscriptions (status);
create index if not exists idx_customer_subscriptions_service_code on public.customer_subscriptions (service_code);
create index if not exists idx_device_assignments_customer_id on public.device_assignments (customer_id);
create index if not exists idx_device_assignments_device_id on public.device_assignments (device_id);
create index if not exists idx_payments_customer_id on public.payments (customer_id);
create index if not exists idx_payments_payment_date on public.payments (payment_date desc);
create index if not exists idx_payments_next_due_date on public.payments (next_due_date);
create index if not exists idx_whatsapp_messages_customer_id on public.whatsapp_messages (customer_id);
create index if not exists idx_whatsapp_messages_status on public.whatsapp_messages (status);
create index if not exists idx_email_messages_customer_id on public.email_messages (customer_id);
create index if not exists idx_email_messages_status on public.email_messages (status);
create index if not exists idx_support_tickets_customer_id on public.support_tickets (customer_id);
create index if not exists idx_activity_logs_user_id on public.activity_logs (user_id);
create index if not exists idx_service_requests_customer_id on public.service_requests (customer_id);
create index if not exists idx_service_requests_status on public.service_requests (status);
create index if not exists idx_admin_notifications_is_read on public.admin_notifications (is_read);
create index if not exists idx_admin_notifications_created_at on public.admin_notifications (created_at desc);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscription_plans_updated_at on public.subscription_plans;
create trigger trg_subscription_plans_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_subscriptions_updated_at on public.customer_subscriptions;
create trigger trg_customer_subscriptions_updated_at
before update on public.customer_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_devices_updated_at on public.devices;
create trigger trg_devices_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

drop trigger if exists trg_device_assignments_updated_at on public.device_assignments;
create trigger trg_device_assignments_updated_at
before update on public.device_assignments
for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists trg_whatsapp_templates_updated_at on public.whatsapp_templates;
create trigger trg_whatsapp_templates_updated_at
before update on public.whatsapp_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_whatsapp_messages_updated_at on public.whatsapp_messages;
create trigger trg_whatsapp_messages_updated_at
before update on public.whatsapp_messages
for each row execute function public.set_updated_at();

drop trigger if exists trg_email_messages_updated_at on public.email_messages;
create trigger trg_email_messages_updated_at
before update on public.email_messages
for each row execute function public.set_updated_at();

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

drop trigger if exists trg_service_requests_updated_at on public.service_requests;
create trigger trg_service_requests_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.devices enable row level security;
alter table public.device_assignments enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.email_messages enable row level security;
alter table public.support_tickets enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "customers_admin_staff_all" on public.customers;
create policy "customers_admin_staff_all"
on public.customers
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
);

drop policy if exists "customers_self_select" on public.customers;
create policy "customers_self_select"
on public.customers
for select
using (auth.uid() = auth_user_id);

drop policy if exists "subscriptions_admin_staff_all" on public.customer_subscriptions;
create policy "subscriptions_admin_staff_all"
on public.customer_subscriptions
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
);

drop policy if exists "subscriptions_customer_select" on public.customer_subscriptions;
create policy "subscriptions_customer_select"
on public.customer_subscriptions
for select
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_subscriptions.customer_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists "payments_admin_staff_all" on public.payments;
create policy "payments_admin_staff_all"
on public.payments
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
);

drop policy if exists "payments_customer_select" on public.payments;
create policy "payments_customer_select"
on public.payments
for select
using (
  exists (
    select 1
    from public.customers c
    where c.id = payments.customer_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists "whatsapp_messages_admin_staff_all" on public.whatsapp_messages;
create policy "whatsapp_messages_admin_staff_all"
on public.whatsapp_messages
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
);

drop policy if exists "email_messages_admin_staff_all" on public.email_messages;
create policy "email_messages_admin_staff_all"
on public.email_messages
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'staff')
  )
);

insert into public.whatsapp_templates (name, message_type, template_body)
values
  ('welcome_message', 'welcome', 'Welcome {{customer_name}}. Your IPTV account is now active.'),
  ('renewal_reminder_3_days', 'reminder', 'Hi {{customer_name}}, your subscription expires on {{expiry_date}}. Please renew soon.'),
  ('payment_due_notice', 'payment_due', 'Hi {{customer_name}}, your payment is due on {{due_date}}. Please pay {{amount_due}} to avoid interruption.')
on conflict (name) do nothing;

insert into public.subscription_plans (plan_code, name, price, duration_days, max_connections, description)
values
  ('IPTV-BAS-001', 'IPTV Basic Package', 30, 365, 1, '100+ channels, HD quality, mobile app access, and DVR recording.'),
  ('IPTV-PRE-001', 'IPTV Premium Package', 60, 365, 2, '300+ channels, 4K quality, sports bundles, and premium content.'),
  ('INT-BAS-001', 'Basic Internet Package', 25, 365, 1, 'Up to 100 Mbps with unlimited data and basic support.'),
  ('INT-PRE-001', 'Premium Internet Package', 50, 365, 2, 'Up to 500 Mbps, unlimited data, priority support, and advanced security.'),
  ('VPN-001', 'VPN Service', 15, 365, 5, 'Global servers, no logs policy, and multi-device coverage.'),
  ('LEGACY-IPTV', 'Legacy IPTV Service', 0, 365, 1, 'Backfilled service plan for existing customer records created before subscription persistence.')
on conflict (plan_code) do update
set
  name = excluded.name,
  price = excluded.price,
  duration_days = excluded.duration_days,
  max_connections = excluded.max_connections,
  description = excluded.description,
  updated_at = timezone('utc', now());

insert into public.customer_subscriptions (
  customer_id,
  plan_id,
  activation_date,
  expiry_date,
  status,
  discount,
  auto_renew,
  service_label,
  service_code,
  transaction_id,
  payment_mode,
  amount,
  device_box,
  device_mac,
  metadata
)
select
  c.id,
  coalesce(inferred_plan.id, legacy_plan.id),
  coalesce(c.start_date, c.payment_date, timezone('utc', now())::date) as activation_date,
  coalesce(
    c.expiry_date,
    (
      coalesce(c.start_date, c.payment_date, timezone('utc', now())::date)
      + make_interval(months => greatest(coalesce(c.service_duration, 12), 1))
    )::date
  ) as expiry_date,
  case
    when c.status = 'suspended' then 'suspended'::subscription_status
    when c.status = 'inactive' then 'expired'::subscription_status
    when c.status = 'pending' then 'draft'::subscription_status
    else 'active'::subscription_status
  end as status,
  0,
  false,
  coalesce(inferred_plan.name, nullif(c.role, ''), 'Legacy IPTV Service') as service_label,
  coalesce(nullif(c.service_id, ''), coalesce(inferred_plan.plan_code, 'LEGACY-IPTV')) as service_code,
  nullif(c.transaction_id, ''),
  c.payment_mode,
  c.amount,
  nullif(c.box, ''),
  nullif(c.mac, ''),
  jsonb_build_object(
    'backfilled', true,
    'customerRole', nullif(c.role, ''),
    'legacyCustomerCode', nullif(c.customer_code, ''),
    'source', 'customers_flat_record'
  )
from public.customers c
left join lateral (
  select sp.id, sp.name, sp.plan_code
  from public.subscription_plans sp
  where sp.plan_code = case
    when c.notes ilike '%IPTV Premium Package%' then 'IPTV-PRE-001'
    when c.notes ilike '%IPTV Basic Package%' then 'IPTV-BAS-001'
    when c.notes ilike '%Premium Internet Package%' then 'INT-PRE-001'
    when c.notes ilike '%Basic Internet Package%' then 'INT-BAS-001'
    when c.notes ilike '%VPN Service%' then 'VPN-001'
    when c.role ilike '%premium%' then 'IPTV-PRE-001'
    when c.role ilike '%basic%' then 'IPTV-BAS-001'
    else null
  end
  limit 1
) inferred_plan on true
join public.subscription_plans legacy_plan
  on legacy_plan.plan_code = 'LEGACY-IPTV'
where not exists (
  select 1
  from public.customer_subscriptions cs
  where cs.customer_id = c.id
);
