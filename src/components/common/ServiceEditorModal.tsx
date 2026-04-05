import { useEffect, useMemo, useState } from "react";
import type { CustomerServiceInput, CustomerSubscription } from "../../data/customersDB";
import { plansAPI } from "../../services/api";

type PlanOption = {
  id: string;
  planCode: string;
  name: string;
  price: string;
  durationDays: number;
  maxConnections: number;
  description: string;
};

type ServiceEditorModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  service?: CustomerSubscription | null;
  onClose: () => void;
  onSave: (payload: CustomerServiceInput) => Promise<void>;
};

type ServiceFormState = {
  planCode: string;
  name: string;
  description: string;
  paymentMode: string;
  amount: string;
  durationMonths: string;
  startDate: string;
  expiryDate: string;
  box: string;
  mac: string;
  portalUrl: string;
  billingUrl: string;
  maxConnections: string;
  transactionId: string;
  serviceCode: string;
  autoRenew: boolean;
  status: CustomerSubscription["status"];
  features: string;
};

const emptyFormState: ServiceFormState = {
  planCode: "",
  name: "",
  description: "",
  paymentMode: "Cash",
  amount: "",
  durationMonths: "12",
  startDate: "",
  expiryDate: "",
  box: "",
  mac: "",
  portalUrl: "",
  billingUrl: "",
  maxConnections: "1",
  transactionId: "",
  serviceCode: "",
  autoRenew: false,
  status: "active",
  features: "",
};

const buildFormState = (service?: CustomerSubscription | null): ServiceFormState => {
  if (!service) {
    return emptyFormState;
  }

  const activationDate = service.activationDate || "";
  const expiryDate = service.expiryDate || "";
  const durationMonths =
    activationDate && expiryDate
      ? String(
          Math.max(
            1,
            Math.round(
              (new Date(expiryDate).getTime() - new Date(activationDate).getTime()) /
                (1000 * 60 * 60 * 24 * 30)
            )
          )
        )
      : "12";

  return {
    planCode: service.planCode || "",
    name: service.planName || service.serviceLabel || "",
    description: service.description || "",
    paymentMode: service.paymentMode || "Cash",
    amount: service.amount || "",
    durationMonths,
    startDate: activationDate,
    expiryDate,
    box: service.deviceBox || "",
    mac: service.deviceMac || "",
    portalUrl: service.portalUrl || "",
    billingUrl: service.billingUrl || "",
    maxConnections: String(service.maxConnections || 1),
    transactionId: service.transactionId || "",
    serviceCode: service.serviceCode || "",
    autoRenew: service.autoRenew,
    status: service.status,
    features: service.features.join(", "),
  };
};

const buildExpiryDate = (startDate: string, durationMonths: string) => {
  if (!startDate || !durationMonths) {
    return "";
  }

  const baseDate = new Date(startDate);
  if (Number.isNaN(baseDate.getTime())) {
    return "";
  }

  baseDate.setMonth(baseDate.getMonth() + Math.max(Number(durationMonths) || 12, 1));
  return baseDate.toISOString().slice(0, 10);
};

export default function ServiceEditorModal({
  isOpen,
  mode,
  service,
  onClose,
  onSave,
}: ServiceEditorModalProps) {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<ServiceFormState>(buildFormState(service));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormData(buildFormState(service));
    setError("");
  }, [isOpen, service]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadPlans = async () => {
      setLoadingPlans(true);

      try {
        const response = (await plansAPI.getAll()) as { plans?: PlanOption[] };

        if (isMounted) {
          setPlans(response.plans || []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load service plans."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingPlans(false);
        }
      }
    };

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!formData.startDate || !formData.durationMonths) {
      return;
    }

    const nextExpiryDate = buildExpiryDate(formData.startDate, formData.durationMonths);
    if (nextExpiryDate && nextExpiryDate !== formData.expiryDate) {
      setFormData((current) => ({
        ...current,
        expiryDate: nextExpiryDate,
      }));
    }
  }, [formData.startDate, formData.durationMonths, formData.expiryDate]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.planCode === formData.planCode),
    [plans, formData.planCode]
  );

  if (!isOpen) {
    return null;
  }

  const handlePlanChange = (planCode: string) => {
    const plan = plans.find((item) => item.planCode === planCode);

    setFormData((current) => ({
      ...current,
      planCode,
      name: plan?.name || current.name,
      description: plan?.description || current.description,
      amount: plan?.price || current.amount,
      durationMonths: plan ? String(Math.max(Math.round(plan.durationDays / 30), 1)) : current.durationMonths,
      maxConnections: plan ? String(plan.maxConnections) : current.maxConnections,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.planCode || !formData.name || !formData.startDate || !formData.expiryDate) {
      setError("Plan, service name, activation date, and expiry date are required.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        planCode: formData.planCode,
        name: formData.name,
        description: formData.description,
        paymentMode: formData.paymentMode,
        amount: formData.amount,
        durationMonths: formData.durationMonths,
        startDate: formData.startDate,
        paymentDate: formData.startDate,
        expiryDate: formData.expiryDate,
        box: formData.box,
        mac: formData.mac,
        portalUrl: formData.portalUrl,
        billingUrl: formData.billingUrl,
        maxConnections: Number(formData.maxConnections) || 1,
        transactionId: formData.transactionId,
        serviceCode: formData.serviceCode,
        autoRenew: formData.autoRenew,
        status: formData.status,
        features: formData.features
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save service.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Service management
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                {mode === "create" ? "Add service" : "Edit service"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Plan</label>
                <select
                  value={formData.planCode}
                  onChange={(event) => handlePlanChange(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="">Select a plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.planCode}>
                      {plan.name}
                    </option>
                  ))}
                </select>
                {loadingPlans ? (
                  <p className="mt-2 text-xs text-slate-500">Loading plans...</p>
                ) : selectedPlan ? (
                  <p className="mt-2 text-xs text-slate-500">
                    {selectedPlan.description || "No plan description available."}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Service name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, name: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Features
                </label>
                <textarea
                  rows={3}
                  value={formData.features}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, features: event.target.value }))
                  }
                  placeholder="Comma-separated features"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        status: event.target.value as CustomerSubscription["status"],
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Payment mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        paymentMode: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Amount</label>
                  <input
                    type="text"
                    value={formData.amount}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, amount: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Connections
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxConnections}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        maxConnections: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Activation date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, startDate: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Duration (months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={formData.durationMonths}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        durationMonths: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Expiry date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, expiryDate: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.autoRenew}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        autoRenew: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  Enable auto renew
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Service code
                  </label>
                  <input
                    type="text"
                    value={formData.serviceCode}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        serviceCode: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        transactionId: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Box ID</label>
                  <input
                    type="text"
                    value={formData.box}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, box: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    MAC address
                  </label>
                  <input
                    type="text"
                    value={formData.mac}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, mac: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Portal URL
                  </label>
                  <input
                    type="url"
                    value={formData.portalUrl}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        portalUrl: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Billing URL
                  </label>
                  <input
                    type="url"
                    value={formData.billingUrl}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        billingUrl: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Saving..." : mode === "create" ? "Add service" : "Save service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
