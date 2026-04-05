import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAllCustomers, type Customer } from "../data/customersDB";

const safeText = (value: unknown, fallback = "Not available") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const formatDate = (value: string) => {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not set" : parsed.toLocaleDateString();
};

const formatCurrency = (value: string) => {
  const numeric = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(numeric)) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const daysUntil = (dateValue: string) => {
  if (!dateValue) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getPaymentStatus = (customer: Customer) => {
  const remainingDays = daysUntil(customer.expiryDate);

  if (customer.status === "inactive") {
    return {
      label: "Suspended",
      tone: "bg-rose-100 text-rose-700",
      summary: "Account is inactive or blocked",
    };
  }

  if (customer.status === "pending") {
    return {
      label: "Pending",
      tone: "bg-amber-100 text-amber-700",
      summary: "Needs activation or payment confirmation",
    };
  }

  if (remainingDays === null) {
    return {
      label: "Unscheduled",
      tone: "bg-slate-100 text-slate-700",
      summary: "Expiry date is missing",
    };
  }

  if (remainingDays < 0) {
    return {
      label: "Overdue",
      tone: "bg-rose-100 text-rose-700",
      summary: `${Math.abs(remainingDays)} days overdue`,
    };
  }

  if (remainingDays <= 7) {
    return {
      label: "Due soon",
      tone: "bg-amber-100 text-amber-700",
      summary: `${remainingDays} days remaining`,
    };
  }

  return {
    label: "Current",
    tone: "bg-emerald-100 text-emerald-700",
    summary: `${remainingDays} days remaining`,
  };
};

const getSummaryCardTone = (label: string) => {
  switch (label) {
    case "Overdue":
      return "border-rose-200 bg-rose-50";
    case "Due soon":
      return "border-amber-200 bg-amber-50";
    case "Current":
      return "border-emerald-200 bg-emerald-50";
    default:
      return "border-slate-200 bg-white";
  }
};

export default function PaymentStatusReview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "overdue" | "due-soon" | "current" | "missing-dates"
  >("all");

  useEffect(() => {
    let isMounted = true;

    const loadCustomers = async () => {
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
              : "Unable to load payment review data."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCustomers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const filterParam = searchParams.get("filter");
    const nextFilter =
      filterParam === "overdue" ||
      filterParam === "due-soon" ||
      filterParam === "current" ||
      filterParam === "missing-dates"
        ? filterParam
        : "all";

    setReviewFilter((current) => (current === nextFilter ? current : nextFilter));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (reviewFilter === "all") {
      nextParams.delete("filter");
    } else {
      nextParams.set("filter", reviewFilter);
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [reviewFilter, searchParams, setSearchParams]);

  const reviewRows = useMemo(
    () =>
      [...customers]
        .map((customer) => ({
          customer,
          remainingDays: daysUntil(customer.expiryDate),
          paymentStatus: getPaymentStatus(customer),
        }))
        .filter((row) => {
          if (reviewFilter === "all") {
            return true;
          }

          if (reviewFilter === "due-soon") {
            return row.paymentStatus.label === "Due soon";
          }

          if (reviewFilter === "missing-dates") {
            return row.paymentStatus.label === "Unscheduled";
          }

          return row.paymentStatus.label.toLowerCase() === reviewFilter;
        })
        .sort((left, right) => {
          const leftDays = left.remainingDays ?? Number.POSITIVE_INFINITY;
          const rightDays = right.remainingDays ?? Number.POSITIVE_INFINITY;
          return leftDays - rightDays;
        }),
    [customers, reviewFilter]
  );

  const summary = useMemo(() => {
    const overdue = reviewRows.filter((row) => row.paymentStatus.label === "Overdue").length;
    const dueSoon = reviewRows.filter((row) => row.paymentStatus.label === "Due soon").length;
    const current = reviewRows.filter((row) => row.paymentStatus.label === "Current").length;
    const missingDates = reviewRows.filter((row) => row.paymentStatus.label === "Unscheduled").length;

    return { overdue, dueSoon, current, missingDates };
  }, [reviewRows]);
  const openCustomer = (customerId: string) => navigate(`/customers/${customerId}`);
  const handleOpenKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement>,
    customerId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCustomer(customerId);
    }
  };
  const stopRowNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">Loading payment review data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h3 className="text-lg font-semibold">Payment review unavailable</h3>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Renewals And Payments
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">
              Review payment statuses and expiry dates
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              This view is focused on who is current, who is due soon, who is overdue,
              and which accounts are missing expiry planning.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/customers/new"
              className="rounded-2xl border border-cyan-200 px-4 py-3 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
            >
              Add customer
            </Link>
            <Link
              to="/customers"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Open full directory
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Overdue", summary.overdue, "Needs follow-up now"],
          ["Due soon", summary.dueSoon, "Renew within 7 days"],
          ["Current", summary.current, "No immediate action needed"],
          ["Missing dates", summary.missingDates, "Records missing expiry planning"],
        ].map(([label, value, helper]) => (
          <div
            key={String(label)}
            className={`rounded-3xl border p-5 shadow-sm ${getSummaryCardTone(String(label))}`}
          >
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
            <div className="mt-2 text-sm text-slate-500">{helper}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["overdue", "Overdue"],
            ["due-soon", "Due soon"],
            ["current", "Current"],
            ["missing-dates", "Missing dates"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setReviewFilter(
                  value as "all" | "overdue" | "due-soon" | "current" | "missing-dates"
                )
              }
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                reviewFilter === value
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-semibold text-slate-950">Customer payment review</h3>
          <p className="mt-1 text-sm text-slate-500">
            Each row shows current payment health, last known payment timing, and expiry visibility.
          </p>
        </div>

        {reviewRows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">No customers found yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Payment status</th>
                  <th className="px-6 py-4 font-semibold">Payment date</th>
                  <th className="px-6 py-4 font-semibold">Expiry date</th>
                  <th className="px-6 py-4 font-semibold">Days left</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Mode</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {reviewRows.map(({ customer, remainingDays, paymentStatus }) => (
                  <tr
                    key={customer.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => openCustomer(customer.id)}
                    onKeyDown={(event) => handleOpenKeyDown(event, customer.id)}
                    className="cursor-pointer align-top transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    <td className="px-6 py-5">
                      <div className="text-sm font-semibold text-slate-950">{customer.name}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {safeText(customer.customerCode, "No customer code")}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentStatus.tone}`}
                      >
                        {paymentStatus.label}
                      </span>
                      <div className="mt-2 text-sm text-slate-500">{paymentStatus.summary}</div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {formatDate(customer.paymentDate)}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {formatDate(customer.expiryDate)}
                    </td>
                    <td
                      className={`px-6 py-5 text-sm font-medium ${
                        paymentStatus.label === "Overdue"
                          ? "text-rose-700"
                          : paymentStatus.label === "Due soon"
                            ? "text-amber-700"
                            : "text-slate-700"
                      }`}
                    >
                      {remainingDays === null
                        ? "Not set"
                        : remainingDays < 0
                          ? `${Math.abs(remainingDays)} overdue`
                          : `${remainingDays} remaining`}
                    </td>
                    <td
                      className={`px-6 py-5 text-sm font-semibold ${
                        parseFloat(String(customer.paymentSummary?.outstandingBalance || "0")) > 0
                          ? "text-rose-700"
                          : parseFloat(String(customer.paymentSummary?.availableCredit || "0")) > 0
                            ? "text-emerald-700"
                            : "text-slate-700"
                      }`}
                    >
                      {formatCurrency(customer.amount)}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-700">
                      {safeText(customer.paymentMode, "Not set")}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/customers/${customer.id}`}
                          onClick={stopRowNavigation}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </Link>
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          onClick={stopRowNavigation}
                          className="rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/customers/${customer.id}`}
                          state={{ openNotifications: true }}
                          onClick={stopRowNavigation}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Notify
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
