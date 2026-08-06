import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listCustomers, type Customer } from "../data/customersDB";
import { reportsAPI } from "../services/api";
import { formatCurrency } from "../utils/currency";

type RevenueRow = {
  month: string;
  currency: string;
  collected: string;
  refunded: string;
  pending: string;
  paymentCount: number;
};

type DashboardSummary = {
  totalCustomers: number;
  byStatus: Record<string, number>;
  expiringSoon: number;
  pendingServiceRequests: number;
  recurringAmount: string;
  dueNow: string;
  overdueAmount: string;
  totalPaid: string;
  availableCredit: string;
  outstandingBalance: string;
};

const EMPTY_SUMMARY: DashboardSummary = {
  totalCustomers: 0,
  byStatus: {},
  expiringSoon: 0,
  pendingServiceRequests: 0,
  recurringAmount: "0",
  dueNow: "0",
  overdueAmount: "0",
  totalPaid: "0",
  availableCredit: "0",
  outstandingBalance: "0",
};

const daysUntil = (dateValue: string) => {
  if (!dateValue) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatusTone = (status: Customer["status"]) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "inactive":
      return "bg-rose-100 text-rose-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getMetricTone = (label: string) => {
  switch (label) {
    case "Available credit":
      return "border-emerald-200 bg-emerald-50";
    case "Due now":
      return "border-amber-200 bg-amber-50";
    case "Outstanding":
    case "Suspended":
      return "border-rose-200 bg-rose-50";
    case "Expiring soon":
      return "border-amber-200 bg-amber-50";
    default:
      return "border-slate-200 bg-white";
  }
};

const safeText = (value: unknown, fallback = "Not available") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [renewalQueue, setRenewalQueue] = useState<Customer[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // This screen used to download every customer with every subscription and
    // every payment, then add the totals up in the browser. The aggregates are
    // now one query against the customer_financials view, and the two lists
    // ask for the five rows they actually render.
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, renewals, recent, revenueResponse] = await Promise.all([
          reportsAPI.getSummary() as Promise<{ summary: DashboardSummary }>,
          listCustomers({ pageSize: 5, sortBy: "expiry_date", sortDirection: "asc" }),
          listCustomers({ pageSize: 5, sortBy: "created_at", sortDirection: "desc" }),
          reportsAPI.getRevenue(6) as Promise<{ revenue: RevenueRow[] }>,
        ]);

        if (!isMounted) {
          return;
        }

        setSummary(summaryResponse.summary ?? EMPTY_SUMMARY);
        setRenewalQueue(renewals.customers);
        setRecentCustomers(recent.customers);
        setRevenue(revenueResponse.revenue ?? []);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load dashboard data."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const openCustomer = (customerId: string) => navigate(`/customers/${customerId}`);
  const handleOpenKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    customerId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCustomer(customerId);
    }
  };
  const stopCardNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };
  const metricCards = [
    ["Total customers", String(summary.totalCustomers), "All subscriber records"],
    ["Active services", String(summary.byStatus.active ?? 0), "Currently active accounts"],
    ["Suspended", String(summary.byStatus.inactive ?? 0), "Inactive or blocked customers"],
    ["Expiring soon", String(summary.expiringSoon), "Renewals due in 7 days"],
    ["Recurring value", formatCurrency(summary.recurringAmount, undefined, { compact: true }), "Billed per cycle across active services"],
    ["Collected to date", formatCurrency(summary.totalPaid, undefined, { compact: true }), "Payments received, net of refunds"],
    ["Available credit", formatCurrency(summary.availableCredit, undefined, { compact: true }), "Prepaid balance ready for future dues"],
    ["Due now", formatCurrency(summary.dueNow, undefined, { compact: true }), "Amounts that need collection soon"],
    ["Outstanding", formatCurrency(summary.outstandingBalance, undefined, { compact: true }), "Balances still uncovered after credit"],
    ["Overdue balance", formatCurrency(summary.overdueAmount, undefined, { compact: true }), "Already overdue across all customers"],
    ["Open requests", String(summary.pendingServiceRequests), "Customer requests awaiting review"],
  ] as const;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">Loading IPTV operations data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h3 className="text-lg font-semibold">Dashboard unavailable</h3>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, value, helper]) => (
          <div
            key={label}
            className={`rounded-3xl border p-5 shadow-sm ${getMetricTone(label)}`}
          >
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {value}
            </p>
            <p className="mt-2 text-sm text-slate-500">{helper}</p>
          </div>
        ))}
      </section>

      {/* There was no revenue reporting of any kind. The only money figure on
          this screen was the sum of the amount field across active customers,
          which is a price list rather than anything that was collected. */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-950">Revenue</h3>
        <p className="mt-1 text-sm text-slate-500">
          Payments actually received, by the month the money came in. Refunds are reported
          separately and are already excluded from what was collected.
        </p>

        {revenue.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
            No payments have been recorded yet.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="py-3 pr-6 font-semibold">Month</th>
                  <th className="py-3 pr-6 text-right font-semibold">Collected</th>
                  <th className="py-3 pr-6 text-right font-semibold">Refunded</th>
                  <th className="py-3 pr-6 text-right font-semibold">Payments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revenue.map((row) => (
                  <tr key={`${row.month}-${row.currency}`}>
                    <td className="py-3 pr-6 font-medium text-slate-900">
                      {new Date(`${row.month}-01T00:00:00Z`).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="py-3 pr-6 text-right text-slate-900">
                      {formatCurrency(row.collected, row.currency)}
                    </td>
                    <td className="py-3 pr-6 text-right text-slate-500">
                      {parseFloat(row.refunded) > 0
                        ? formatCurrency(row.refunded, row.currency)
                        : "—"}
                    </td>
                    <td className="py-3 pr-6 text-right text-slate-500">{row.paymentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">Renewal queue</h3>
              <p className="mt-1 text-sm text-slate-500">
                Focus this list first to reduce churn and payment gaps.
              </p>
            </div>
            <Link
              to="/renewals"
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Open review
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {renewalQueue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No renewal dates are recorded yet.
              </div>
            ) : (
              renewalQueue.map((customer) => {
                const remainingDays = daysUntil(customer.expiryDate);

                return (
                  <div
                    key={customer.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => openCustomer(customer.id)}
                    onKeyDown={(event) => handleOpenKeyDown(event, customer.id)}
                    className="cursor-pointer rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{customer.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {safeText(customer.email, "No email")} • {safeText(customer.phone, "No phone")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                            customer.status
                          )}`}
                        >
                          {customer.status}
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-700">
                          {remainingDays < 0
                            ? `${Math.abs(remainingDays)} days overdue`
                            : `${remainingDays} days left`}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/customers/${customer.id}`}
                        onClick={stopCardNavigation}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        View
                      </Link>
                      <Link
                        to={`/customers/${customer.id}/edit`}
                        onClick={stopCardNavigation}
                        className="rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/customers/${customer.id}`}
                        state={{ openNotifications: true }}
                        onClick={stopCardNavigation}
                        className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50"
                      >
                        Notify
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Next actions</h3>
            <div className="mt-5 space-y-3">
              <Link
                to="/customers/new"
                className="block rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-4 text-sm text-cyan-900 transition hover:border-cyan-300"
              >
                Create a new customer record
              </Link>
              <Link
                to="/renewals"
                className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:border-slate-300"
              >
                Review payment statuses and expiry dates
              </Link>
              <Link
                to="/service-requests"
                className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:border-slate-300"
              >
                Review customer service requests and admin alerts
              </Link>
              <Link
                to="/portal-access"
                className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:border-slate-300"
              >
                Reset portal passwords and export new temporary credentials
              </Link>
              <Link
                to="/profile"
                className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:border-slate-300"
              >
                Update admin contact and password settings
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">Recently loaded customers</h3>
            <div className="mt-5 space-y-3">
              {recentCustomers.map((customer) => (
                <div
                  key={customer.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => openCustomer(customer.id)}
                  onKeyDown={(event) => handleOpenKeyDown(event, customer.id)}
                  className="cursor-pointer rounded-2xl border border-slate-200 px-4 py-4 transition hover:border-cyan-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {customer.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">{safeText(customer.role, "Customer")}</div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                        customer.status
                      )}`}
                    >
                      {customer.status}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      to={`/customers/${customer.id}`}
                      onClick={stopCardNavigation}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      View
                    </Link>
                    <Link
                      to={`/customers/${customer.id}/edit`}
                      onClick={stopCardNavigation}
                      className="rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
