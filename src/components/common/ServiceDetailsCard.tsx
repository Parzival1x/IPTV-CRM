import type { CustomerSubscription } from "../../data/customersDB";

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

const getSubscriptionTone = (status: CustomerSubscription["status"]) => {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "expired":
      return "bg-rose-100 text-rose-700";
    case "suspended":
      return "bg-orange-100 text-orange-700";
    case "draft":
      return "bg-amber-100 text-amber-700";
    case "cancelled":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
      {label}
    </div>
    <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
  </div>
);

type ServiceDetailsCardProps = {
  service: CustomerSubscription;
  mode?: "admin" | "portal";
  onEdit?: (service: CustomerSubscription) => void;
};

export default function ServiceDetailsCard({
  service,
  mode = "portal",
  onEdit,
}: ServiceDetailsCardProps) {
  const renewalWindow = daysUntil(service.expiryDate);

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h4 className="text-lg font-semibold text-slate-950">
              {safeText(service.serviceLabel || service.planName, "Service")}
            </h4>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionTone(
                service.status
              )}`}
            >
              {service.status}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {safeText(service.description, "No service description has been saved yet.")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Renewal
          </div>
          <div className="mt-2 font-medium text-slate-900">
            {renewalWindow === null
              ? "Expiry not set"
              : renewalWindow < 0
                ? `${Math.abs(renewalWindow)} days overdue`
                : renewalWindow === 0
                  ? "Expires today"
                  : `${renewalWindow} days remaining`}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailRow label="Plan" value={safeText(service.planName, "Plan not linked")} />
        <DetailRow label="Service code" value={safeText(service.serviceCode, "Not assigned")} />
        <DetailRow label="Amount" value={formatCurrency(service.amount)} />
        <DetailRow label="Payment mode" value={safeText(service.paymentMode, "Not set")} />
        <DetailRow label="Activation date" value={formatDate(service.activationDate)} />
        <DetailRow label="Expiry date" value={formatDate(service.expiryDate)} />
        <DetailRow
          label="Connections"
          value={safeText(String(service.maxConnections || ""), "1")}
        />
        <DetailRow
          label="Transaction ID"
          value={safeText(service.transactionId, "Not assigned")}
        />
      </div>

      {(service.deviceBox || service.deviceMac) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <DetailRow label="Assigned box" value={safeText(service.deviceBox, "Not assigned")} />
          <DetailRow label="Assigned MAC" value={safeText(service.deviceMac, "Not assigned")} />
        </div>
      )}

      {service.features.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {service.features.map((feature) => (
            <span
              key={feature}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
            >
              {feature}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {service.portalUrl ? (
          <a
            href={service.portalUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-cyan-200 px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
          >
            Open service portal
          </a>
        ) : null}
        {service.billingUrl ? (
          <a
            href={service.billingUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Open billing portal
          </a>
        ) : null}
        {mode === "admin" && onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(service)}
            className="rounded-2xl border border-cyan-200 px-4 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
          >
            Edit service
          </button>
        ) : null}
      </div>
    </article>
  );
}
