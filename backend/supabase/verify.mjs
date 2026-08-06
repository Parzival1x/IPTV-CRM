// Applies install.sql to a throwaway Postgres (PGlite) and exercises the money
// paths the way backend/repositories call them.
//
// install.sql is the only schema file in the project, so this is the only
// thing standing between a change to it and a broken production database.
//
// The payment logic lives in plpgsql precisely so that recording a payment is
// atomic, which means it cannot be covered from JavaScript. This is how it
// gets tested.
//
//   cd backend && npm test
//
// Needs no Supabase project and no Docker. Exits non-zero if any check fails.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));

let failures = 0;

const money = (value) => Number(value ?? 0).toFixed(2);
// Postgres `date` comes back as a Date object at UTC midnight. Comparing it to
// a 'YYYY-MM-DD' literal without this compares against a full locale string
// and silently never matches.
const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

// PGlite does not ship pgcrypto. It is only there for gen_random_uuid(), core
// Postgres since 13, so dropping the line changes nothing about what is being
// tested. Supabase has the extension, so the real files keep it.
const load = (path) =>
  readFileSync(path, 'utf8').replace(/create extension if not exists "pgcrypto";/g, '');

const newDatabase = async () => {
  const db = await new PGlite();
  // Supabase provides these. The schema references auth.uid() from its RLS
  // policies and the files revoke from anon/authenticated. auth.uid() returning
  // null matches production: this app never signs anyone into Supabase Auth,
  // it authenticates with its own JWTs and reaches the database as service_role.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema if not exists auth;
    create table auth.users (id uuid primary key default gen_random_uuid());
    create function auth.uid() returns uuid language sql stable as $fn$ select null::uuid $fn$;
  `);
  return db;
};

// ---------------------------------------------------------------------------
// The suite
// ---------------------------------------------------------------------------

const runChecks = async (db) => {
  const check = (label, condition, detail = '') => {
    if (condition) {
      console.log(`  PASS  ${label}${detail ? ` (${detail})` : ''}`);
    } else {
      failures += 1;
      console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
    }
  };

  const one = async (sql, params) => (await db.query(sql, params)).rows[0];

  const rejects = async (label, sql, params) => {
    try {
      await db.query(sql, params);
      check(label, false, 'was accepted');
    } catch {
      check(label, true);
    }
  };

  console.log('\n--- Fixtures ---');

  const plan = await one(`
    insert into public.subscription_plans (plan_code, name, price, duration_days, duration_months, max_connections)
    values ('TEST-12M', 'Test Annual', 120, 365, 12, 2)
    returning id, duration_months
  `);
  check('plan created with duration_months', plan?.duration_months === 12, String(plan?.duration_months));

  const seeded = await one(`
    select duration_days, duration_months from public.subscription_plans where plan_code = 'IPTV-BAS-001'
  `);
  check(
    'starter plans carry a months-based billing cycle',
    seeded?.duration_months === 12,
    `${seeded?.duration_days} days -> ${seeded?.duration_months} months`
  );

  // Every function that moves money must be unreachable through PostgREST's
  // RPC endpoint with the key that ships to browsers.
  const rpcGrants = await one(`
    select count(*)::int as n from information_schema.role_routine_grants
    where specific_schema = 'public' and grantee in ('anon', 'authenticated')
  `);
  check('no function is callable with the anon key', rpcGrants.n === 0, `grants=${rpcGrants.n}`);

  const customer = await one(`
    insert into public.customers (name, phone, email, status)
    values ('Ada Lovelace', '+441234567890', 'ada@example.com', 'active') returning id
  `);

  const makeSubscription = (amount, discount, expiry) =>
    one(
      `insert into public.customer_subscriptions
         (customer_id, plan_id, activation_date, expiry_date, status, amount, discount, service_label)
       values ($1, $2, current_date, $3::date, 'active', $4, $5, 'Test service')
       returning id, expiry_date, cycle_paid_amount`,
      [customer.id, plan.id, expiry, amount, discount]
    );

  const pay = (customerId, ids, amount, txn) =>
    db.query(
      `select public.record_customer_payment($1, $2::uuid[], $3, 'cash'::payment_mode, $4, now(), 0, 0, 'USD', null)`,
      [customerId, ids, amount, txn]
    );

  console.log('\n--- Full payment ---');

  const subA = await makeSubscription(120, 0, '2026-09-01');
  await pay(customer.id, [subA.id], 120, 'TXN-1');

  const afterFull = await one(
    'select expiry_date, status, cycle_paid_amount from public.customer_subscriptions where id = $1',
    [subA.id]
  );
  check(
    'full payment renews by 12 calendar months, not 360 days',
    day(afterFull.expiry_date) === '2027-09-01',
    day(afterFull.expiry_date)
  );
  check('cycle progress reset after renewal', money(afterFull.cycle_paid_amount) === '0.00');
  check('status active after renewal', afterFull.status === 'active', afterFull.status);

  const allocA = await one(
    `select count(*)::int as n, bool_and(pa.renewed) as renewed
     from public.payment_allocations pa join public.payments p on p.id = pa.payment_id
     where p.customer_id = $1`,
    [customer.id]
  );
  check('one allocation recorded', allocA.n === 1, `n=${allocA.n}`);
  check('allocation marked as a renewal', allocA.renewed === true);

  console.log('\n--- Partial payments ---');

  const subB = await makeSubscription(100, 0, '2026-09-01');

  await pay(customer.id, [subB.id], 40, 'TXN-2');
  let partial = await one(
    'select expiry_date, cycle_paid_amount from public.customer_subscriptions where id = $1',
    [subB.id]
  );
  check('partial payment is remembered on the subscription', money(partial.cycle_paid_amount) === '40.00');
  check('partial payment does not renew', day(partial.expiry_date) === '2026-09-01');

  await pay(customer.id, [subB.id], 35, 'TXN-3');
  partial = await one('select cycle_paid_amount from public.customer_subscriptions where id = $1', [subB.id]);
  check('second partial payment accumulates', money(partial.cycle_paid_amount) === '75.00');

  await pay(customer.id, [subB.id], 25, 'TXN-4');
  partial = await one(
    'select expiry_date, cycle_paid_amount from public.customer_subscriptions where id = $1',
    [subB.id]
  );
  check('third partial completes the cycle and renews', day(partial.expiry_date) === '2027-09-01');
  check('no surplus carried when payment lands exactly', money(partial.cycle_paid_amount) === '0.00');

  console.log('\n--- Discount ---');

  const subC = await makeSubscription(100, 30, '2026-09-01');
  await pay(customer.id, [subC.id], 70, 'TXN-5');
  const discounted = await one('select expiry_date from public.customer_subscriptions where id = $1', [subC.id]);
  check('a 30 discount means 70 settles a 100 service', day(discounted.expiry_date) === '2027-09-01');

  console.log('\n--- Overpayment and credit ---');

  const subD = await makeSubscription(50, 0, '2026-09-01');
  await pay(customer.id, [subD.id], 80, 'TXN-6');
  const over = await one(
    'select expiry_date, cycle_paid_amount from public.customer_subscriptions where id = $1',
    [subD.id]
  );
  check('overpayment settles the cycle exactly', money(over.cycle_paid_amount) === '0.00');
  check('overpayment renews', day(over.expiry_date) === '2027-09-01');

  const overCredit = await one(
    'select available_credit from public.customer_financials where customer_id = $1',
    [customer.id]
  );
  check('the 30 surplus becomes available credit', money(overCredit.available_credit) === '30.00');

  const subD2 = await makeSubscription(50, 0, '2026-09-01');
  await pay(customer.id, [subD2.id], 20, 'TXN-6B');
  const spent = await one('select expiry_date from public.customer_subscriptions where id = $1', [subD2.id]);
  check(
    'a later payment draws the credit down to settle a cycle',
    day(spent.expiry_date) === '2027-09-01',
    '20 paid + 30 credit against a 50 service'
  );
  const creditAfter = await one(
    'select available_credit from public.customer_financials where customer_id = $1',
    [customer.id]
  );
  check('credit is not still available once spent', money(creditAfter.available_credit) === '0.00');

  console.log('\n--- Split across services ---');

  const splitCustomer = await one(`
    insert into public.customers (name, phone, email, status)
    values ('Grace Hopper', '+441234567891', 'grace@example.com', 'active') returning id
  `);
  const mk = (amount, label) =>
    one(
      `insert into public.customer_subscriptions (customer_id, plan_id, activation_date, expiry_date, status, amount, service_label)
       values ($1, $2, current_date, '2026-09-01', 'active', $3, $4) returning id`,
      [splitCustomer.id, plan.id, amount, label]
    );
  const subE = await mk(60, 'Service E');
  const subF = await mk(40, 'Service F');

  await pay(splitCustomer.id, [subE.id, subF.id], 100, 'TXN-7');
  const splitRows = await db.query(
    `select pa.amount, pa.renewed from public.payment_allocations pa
     join public.payments p on p.id = pa.payment_id where p.transaction_id = 'TXN-7'`
  );
  check('one payment produced two allocations', splitRows.rows.length === 2);
  check(
    'allocations sum to the payment',
    money(splitRows.rows.reduce((s, r) => s + Number(r.amount), 0)) === '100.00'
  );
  check('both services renewed', splitRows.rows.every((r) => r.renewed === true));
  const paymentRowCount = await one(
    `select count(*)::int as n from public.payments where transaction_id = 'TXN-7'`
  );
  check('a split payment is one payment event, not two', paymentRowCount.n === 1);

  await pay(splitCustomer.id, [subE.id], 200, 'TXN-8');
  const leftover = await one(
    `select coalesce(sum(pa.amount), 0) as total from public.payment_allocations pa
     join public.payments p on p.id = pa.payment_id
     where p.transaction_id = 'TXN-8' and pa.subscription_id is null`
  );
  check('surplus beyond one cycle becomes unapplied credit', Number(leftover.total) > 0, money(leftover.total));

  console.log('\n--- Rejections ---');

  await rejects(
    "paying another customer's subscription is rejected",
    `select public.record_customer_payment($1, $2::uuid[], 10, 'cash'::payment_mode, 'X', now(), 0, 0, 'USD', null)`,
    [customer.id, [subE.id]]
  );
  await rejects(
    'zero-amount payment is rejected',
    `select public.record_customer_payment($1, $2::uuid[], 0, 'cash'::payment_mode, 'X', now(), 0, 0, 'USD', null)`,
    [customer.id, [subA.id]]
  );
  await rejects(
    'empty service list is rejected',
    `select public.record_customer_payment($1, $2::uuid[], 10, 'cash'::payment_mode, 'X', now(), 0, 0, 'USD', null)`,
    [customer.id, []]
  );
  await rejects(
    'negative subscription amount is rejected',
    `insert into public.customer_subscriptions (customer_id, plan_id, activation_date, expiry_date, status, amount)
     values ($1, $2, current_date, current_date, 'active', -5)`,
    [customer.id, plan.id]
  );
  await rejects(
    'hard-deleting a customer with payments is refused',
    'delete from public.customers where id = $1',
    [customer.id]
  );

  console.log('\n--- Refund ---');

  const refundCustomer = await one(`
    insert into public.customers (name, phone, email, status)
    values ('Alan Turing', '+441234567892', 'alan@example.com', 'active') returning id
  `);
  const subG = await one(
    `insert into public.customer_subscriptions (customer_id, plan_id, activation_date, expiry_date, status, amount, service_label)
     values ($1, $2, current_date, '2026-09-01', 'active', 120, 'Service G') returning id`,
    [refundCustomer.id, plan.id]
  );
  const paymentId = await one(
    `select public.record_customer_payment($1, $2::uuid[], 120, 'cash'::payment_mode, 'TXN-9', now(), 0, 0, 'USD', null) as id`,
    [refundCustomer.id, [subG.id]]
  );
  await db.query('select public.refund_customer_payment($1, $2)', [paymentId.id, 'test refund']);
  const afterRefund = await one('select expiry_date from public.customer_subscriptions where id = $1', [subG.id]);
  check('refund rolls the renewal back', day(afterRefund.expiry_date) === '2026-09-01');
  const refundedPayment = await one('select status from public.payments where id = $1', [paymentId.id]);
  check('refunded payment is marked refunded', refundedPayment.status === 'refunded');
  const refundFin = await one(
    'select total_paid from public.customer_financials where customer_id = $1',
    [refundCustomer.id]
  );
  check('refund nets off total paid', money(refundFin.total_paid) === '0.00');

  console.log('\n--- Expiry sweep ---');

  const lapsedCustomer = await one(`
    insert into public.customers (name, phone, email, status)
    values ('Katherine Johnson', '+441234567893', 'kj@example.com', 'active') returning id
  `);
  await db.query(
    `insert into public.customer_subscriptions (customer_id, plan_id, activation_date, expiry_date, status, amount)
     values ($1, $2, current_date - 400, current_date - 1, 'active', 30)`,
    [lapsedCustomer.id, plan.id]
  );
  const sweep = await one('select public.expire_lapsed_subscriptions() as n');
  check('sweep expires lapsed subscriptions', Number(sweep.n) >= 1, `n=${sweep.n}`);
  const lapsedStatus = await one('select status from public.customers where id = $1', [lapsedCustomer.id]);
  check('customer with no live service becomes inactive', lapsedStatus.status === 'inactive');
  const stillActive = await one('select status from public.customer_subscriptions where id = $1', [subE.id]);
  check('a live subscription is untouched by the sweep', stillActive.status === 'active');

  console.log('\n--- Soft delete ---');

  await db.query('update public.customers set deleted_at = now() where id = $1', [lapsedCustomer.id]);
  const hidden = await one(
    'select count(*)::int as n from public.customer_financials where customer_id = $1',
    [lapsedCustomer.id]
  );
  check('soft-deleted customer drops out of customer_financials', hidden.n === 0);
  const paymentsSurvive = await one('select count(*)::int as n from public.payments where customer_id = $1', [
    customer.id
  ]);
  check('payment history survives soft delete', paymentsSurvive.n > 0, `n=${paymentsSurvive.n}`);
  const reuse = await one(
    `insert into public.customers (name, phone, email, status)
     values ('Katherine Johnson II', '+441234567893', 'kj@example.com', 'active') returning id`
  );
  check('a soft-deleted customer does not reserve their phone and email forever', Boolean(reuse.id));

  console.log('\n--- Reminder dedupe ---');

  await db.query(
    `insert into public.subscription_reminders (subscription_id, customer_id, reminder_kind, expiry_date, channels)
     values ($1, $2, 'expiring_7_days', '2026-09-01', '{email}')`,
    [subE.id, splitCustomer.id]
  );
  await rejects(
    'the same reminder cannot be sent twice for the same expiry date',
    `insert into public.subscription_reminders (subscription_id, customer_id, reminder_kind, expiry_date, channels)
     values ($1, $2, 'expiring_7_days', '2026-09-01', '{email}')`,
    [subE.id, splitCustomer.id]
  );
  const reEligible = await db.query(
    `insert into public.subscription_reminders (subscription_id, customer_id, reminder_kind, expiry_date, channels)
     values ($1, $2, 'expiring_7_days', '2027-09-01', '{email}') returning id`,
    [subE.id, splitCustomer.id]
  );
  check('a new expiry date makes the reminder eligible again', reEligible.rows.length === 1);

  console.log('\n--- Views, schema surface and access ---');

  const renewalRows = await db.query('select * from public.renewal_overview where customer_id = $1', [
    splitCustomer.id
  ]);
  check('renewal_overview returns the customer services', renewalRows.rows.length >= 1);
  check(
    'renewal_overview computes days_until_expiry',
    renewalRows.rows.every((r) => Number.isInteger(Number(r.days_until_expiry)))
  );

  const revenue = await db.query('select * from public.revenue_by_month');
  check('revenue_by_month returns rows', revenue.rows.length >= 1);

  // Everything the application actually queries must exist, in both variants.
  const required = await one(`
    select
      count(*) filter (where table_name = 'admin_users') as admin_users,
      count(*) filter (where table_name = 'customers') as customers,
      count(*) filter (where table_name = 'subscription_plans') as subscription_plans,
      count(*) filter (where table_name = 'customer_subscriptions') as customer_subscriptions,
      count(*) filter (where table_name = 'payments') as payments,
      count(*) filter (where table_name = 'payment_allocations') as payment_allocations,
      count(*) filter (where table_name = 'service_requests') as service_requests,
      count(*) filter (where table_name = 'admin_notifications') as admin_notifications,
      count(*) filter (where table_name = 'email_messages') as email_messages,
      count(*) filter (where table_name = 'whatsapp_messages') as whatsapp_messages,
      count(*) filter (where table_name = 'subscription_reminders') as subscription_reminders,
      count(*) filter (where table_name = 'activity_logs') as activity_logs
    from information_schema.tables where table_schema = 'public'
  `);
  const missing = Object.entries(required)
    .filter(([, present]) => Number(present) === 0)
    .map(([name]) => name);
  check('every table the application queries exists', missing.length === 0, missing.join(', '));

  // activity_logs.user_id must reference admin_users. It originally pointed at
  // `profiles`, a table nothing ever inserted into, so every audit row that
  // named an actor either violated the key or stored null.
  const auditFk = await one(`
    select ccu.table_name as target
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
    where tc.table_name = 'activity_logs' and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'user_id'
  `);
  check('activity_logs.user_id references admin_users', auditFk?.target === 'admin_users', auditFk?.target);

  const unprotected = await one(`
    select coalesce(string_agg(c.relname, ', ' order by c.relname), '') as names
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  `);
  check('every table has row level security enabled', unprotected.names === '', unprotected.names);

  const anonGrants = await one(`
    select count(*)::int as n from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated') and table_schema = 'public'
  `);
  check('nothing in public is reachable with the anon key', anonGrants.n === 0, `grants=${anonGrants.n}`);

};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log('===========================================================');
console.log(' install.sql');
console.log('===========================================================');

const db = await newDatabase();

// Applied twice: the file has to be safe to re-run, because that is how a
// schema change reaches a database that already exists.
for (const pass of ['applied', 're-applied (idempotency)']) {
  try {
    await db.exec(load(join(DIR, 'install.sql')));
    console.log(`  PASS  install.sql ${pass}`);
  } catch (error) {
    console.log(`  FAIL  install.sql ${pass}\n        ${error.message}`);
    process.exit(1);
  }
}

await runChecks(db);

console.log('\n===========================================================');
console.log(failures === 0 ? ' All checks passed.' : ` ${failures} check(s) failed.`);
console.log('===========================================================');
process.exit(failures === 0 ? 0 : 1);
