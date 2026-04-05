import { useEffect, useMemo, useState } from "react";
import type {
  CustomerPaymentInput,
  CustomerPaymentSummary,
  CustomerSubscription,
} from "../../data/customersDB";

const parseCurrency = (value: string | number) =>
  parseFloat(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(typeof value === "number" ? value : parseCurrency(value));

const formatDate = (value: string) => {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not set" : parsed.toLocaleDateString();
};

const getAmountTone = (
  kind: "credit" | "debt" | "neutral",
  value: string | number
) => {
  const amount = typeof value === "number" ? value : parseCurrency(value);

  if (kind === "credit") {
    return amount > 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-white text-slate-700";
  }

  if (kind === "debt") {
    return amount > 0
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-white text-slate-700";
};

const getServiceTone = (status: string, selected: boolean) => {
  if (selected) {
    return "border-cyan-200 bg-cyan-50/40";
  }

  if (status === "expired" || status === "suspended") {
    return "border-rose-200 bg-rose-50/50";
  }

  if (status === "active") {
    return "border-emerald-200 bg-emerald-50/35";
  }

  return "border-slate-200 bg-white";
};

const getServiceBadgeTone = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "expired":
    case "suspended":
      return "bg-rose-100 text-rose-700";
    case "pending":
    case "draft":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

type RecordPaymentModalProps = {
  isOpen: boolean;
  customerName: string;
  services: CustomerSubscription[];
  paymentSummary?: CustomerPaymentSummary;
  onClose: () => void;
  onSave: (payload: CustomerPaymentInput) => Promise<void>;
};

const defaultTransactionId = () =>
  `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

export default function RecordPaymentModal({
  isOpen,
  customerName,
  services,
  paymentSummary,
  onClose,
  onSave,
}: RecordPaymentModalProps) {
  const billableServices = useMemo(
    () => services.filter((service) => !["cancelled", "draft"].includes(service.status)),
    [services]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState(defaultTransactionId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const defaultIds = billableServices
      .filter((service) => ["expired", "suspended"].includes(service.status))
      .map((service) => service.id);
    const resolvedIds = defaultIds.length > 0 ? defaultIds : billableServices.slice(0, 1).map((service) => service.id);
    const selectedTotal = billableServices
      .filter((service) => resolvedIds.includes(service.id))
      .reduce((sum, service) => sum + parseCurrency(service.amount), 0);

    setSelectedIds(resolvedIds);
    setPaymentMode("Cash");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAmount(selectedTotal ? selectedTotal.toFixed(2) : "");
    setTransactionId(defaultTransactionId());
    setError("");
  }, [billableServices, isOpen]);

  const selectedServices = useMemo(
    () => billableServices.filter((service) => selectedIds.includes(service.id)),
    [billableServices, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedServices.reduce((sum, service) => sum + parseCurrency(service.amount), 0),
    [selectedServices]
  );

  const enteredAmount = parseCurrency(amount);
  const extraCredit = Math.max(enteredAmount - selectedTotal, 0);
  const remainingOnSelection = Math.max(selectedTotal - enteredAmount, 0);

  const toggleService = (serviceId: string) => {
    setSelectedIds((current) => {
      const next = current.includes(serviceId)
        ? current.filter((value) => value !== serviceId)
        : [...current, serviceId];

      const nextTotal = billableServices
        .filter((service) => next.includes(service.id))
        .reduce((sum, service) => sum + parseCurrency(service.amount), 0);

      setAmount(nextTotal ? nextTotal.toFixed(2) : "");
      return next;
    });
  };

  const handleSave = async () => {
    setError("");

    if (selectedIds.length === 0) {
      setError("Select at least one service for this payment.");
      return;
    }

    if (enteredAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        subscriptionIds: selectedIds,
        amount: enteredAmount.toFixed(2),
        paymentMode,
        paymentDate,
        transactionId,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to record the payment.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
              Payment center
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              Record payment for {customerName}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Select one or more services in the same payment. Fully covered services renew in the
              same action, and any extra amount is retained as customer credit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-semibold text-slate-950">Select services</h4>
              <p className="mt-2 text-sm text-slate-500">
                Pick every service the customer is paying for in this transaction.
              </p>
              <div className="mt-4 space-y-3">
                {billableServices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                    No billable services are available for this customer yet.
                  </div>
                ) : (
                  billableServices.map((service) => (
                    <label
                      key={service.id}
                      className={`flex cursor-pointer items-start gap-4 rounded-2xl border px-4 py-4 transition hover:border-cyan-200 hover:bg-cyan-50/40 ${getServiceTone(
                        service.status,
                        selectedIds.includes(service.id)
                      )}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h5 className="text-sm font-semibold text-slate-950">
                            {service.serviceLabel || service.planName}
                          </h5>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getServiceBadgeTone(service.status)}`}>
                            {service.status}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 text-sm text-slate-500 sm:grid-cols-3">
                          <span>Amount: {formatCurrency(service.amount)}</span>
                          <span>Expiry: {formatDate(service.expiryDate)}</span>
                          <span>Code: {service.serviceCode || "Not assigned"}</span>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-semibold text-slate-950">Payment details</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Payment amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                  <span className="mt-2 block text-xs font-medium text-slate-500">
                    You can enter more than the selected service total. Any extra amount is saved as
                    customer credit for future dues.
                  </span>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Payment mode</span>
                  <select
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Payment date</span>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Transaction ID</span>
                  <input
                    value={transactionId}
                    onChange={(event) => setTransactionId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-semibold text-slate-950">Payment preview</h4>
              <div className="mt-4 space-y-4">
                {[
                  ["Selected services", String(selectedServices.length)],
                  ["Selected total", formatCurrency(selectedTotal)],
                  ["Entered amount", formatCurrency(enteredAmount)],
                  ["Extra credit after payment", formatCurrency(extraCredit)],
                  ["Still due on selected services", formatCurrency(remainingOnSelection)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-2xl px-4 py-4 ring-1 ${
                      label === "Extra credit after payment"
                        ? getAmountTone("credit", value)
                        : label === "Still due on selected services"
                          ? getAmountTone("debt", value)
                          : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
              {extraCredit > 0 ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                  This payment is higher than the selected service total. The extra{" "}
                  <span className="font-semibold">{formatCurrency(extraCredit)}</span> will be kept as
                  available credit on the customer account.
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-lg font-semibold text-slate-950">Customer balance snapshot</h4>
              <div className="mt-4 space-y-4">
                {[
                  ["Recurring services total", formatCurrency(paymentSummary?.recurringAmount || "0")],
                  ["Due now", formatCurrency(paymentSummary?.dueNow || "0")],
                  ["Outstanding balance", formatCurrency(paymentSummary?.outstandingBalance || "0")],
                  ["Available credit", formatCurrency(paymentSummary?.availableCredit || "0")],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-2xl px-4 py-4 ring-1 ${
                      label === "Available credit"
                        ? getAmountTone("credit", value)
                        : label === "Due now" || label === "Outstanding balance"
                          ? getAmountTone("debt", value)
                          : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            A single payment can cover multiple services. Fully covered services renew right away.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || billableServices.length === 0}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Recording payment..." : "Record payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
