import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllCustomers, type Customer } from "../data/customersDB";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const parseAmount = (value: string) =>
  parseFloat(String(value).replace(/[^0-9.-]/g, "")) || 0;

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const records = await getAllCustomers();

        if (isMounted) {
          setCustomers(records);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load dashboard data."
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

  const metrics = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter((customer) => customer.status === "active").length;
    const suspendedCustomers = customers.filter(
      (customer) => customer.status === "inactive"
    ).length;
    const expiringSoon = customers.filter((customer) => {
      const remainingDays = daysUntil(customer.expiryDate);
      return remainingDays >= 0 && remainingDays <= 7;
    }).length;
    const monthlyRevenue = customers
      .filter((customer) => customer.status === "active")
      .reduce((sum, customer) => sum + parseAmount(customer.amount), 0);
    const availableCredit = customers.reduce(
      (sum, customer) => sum + parseAmount(customer.paymentSummary?.availableCredit || "0"),
      0
    );
    const dueNow = customers.reduce(
      (sum, customer) => sum + parseAmount(customer.paymentSummary?.dueNow || "0"),
      0
    );
    const outstanding = customers.reduce(
      (sum, customer) =>
        sum + parseAmount(customer.paymentSummary?.outstandingBalance || "0"),
      0
    );
    const overdueBalance = customers.reduce(
      (sum, customer) => sum + parseAmount(customer.paymentSummary?.overdueAmount || "0"),
      0
    );

    return {
      totalCustomers,
      activeCustomers,
      suspendedCustomers,
      expiringSoon,
      monthlyRevenue,
      availableCredit,
      dueNow,
      outstanding,
      overdueBalance,
    };
  }, [customers]);

  const renewalQueue = useMemo(
    () =>
      [...customers]
        .filter((customer) => Number.isFinite(daysUntil(customer.expiryDate)))
        .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate))
        .slice(0, 5),
    [customers]
  );

  const recentCustomers = useMemo(() => [...customers].slice(0, 5), [customers]);
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
    ["Total customers", metrics.totalCustomers, "All subscriber records"],
    ["Active services", metrics.activeCustomers, "Currently active accounts"],
    ["Suspended", metrics.suspendedCustomers, "Inactive or blocked customers"],
    ["Expiring soon", metrics.expiringSoon, "Renewals due in 7 days"],
    [
      "Monthly revenue",
      currencyFormatter.format(metrics.monthlyRevenue),
      "Active customer recurring value",
    ],
    [
      "Available credit",
      currencyFormatter.format(metrics.availableCredit),
      "Prepaid balance ready for future dues",
    ],
    ["Due now", currencyFormatter.format(metrics.dueNow), "Amounts that need collection soon"],
    [
      "Outstanding",
      currencyFormatter.format(metrics.outstanding),
      "Balances still uncovered after credit",
    ],
    [
      "Overdue balance",
      currencyFormatter.format(metrics.overdueBalance),
      "Already overdue across all customers",
    ],
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
