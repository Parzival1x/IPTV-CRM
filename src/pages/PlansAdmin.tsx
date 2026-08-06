import { useCallback, useEffect, useMemo, useState } from "react";
import { plansAPI } from "../services/api";
import { formatCurrency } from "../utils/currency";

// Plans could not be managed from the application at all: the API was
// read-only, so a plan only came into existence as a side effect of adding a
// service to a customer, and there was no way to reprice or retire one.

export type Plan = {
  id: string;
  planCode: string;
  name: string;
  price: string;
  currency: string;
  durationDays: number;
  durationMonths: number;
  maxConnections: number;
  description: string;
  isActive: boolean;
};

type Notice = { type: "success" | "error"; text: string } | null;

type PlanFormState = {
  planCode: string;
  name: string;
  price: string;
  currency: string;
  durationMonths: string;
  maxConnections: string;
  description: string;
  isActive: boolean;
};

const emptyForm: PlanFormState = {
  planCode: "",
  name: "",
  price: "",
  currency: "USD",
  durationMonths: "12",
  maxConnections: "1",
  description: "",
  isActive: true,
};

const toForm = (plan: Plan): PlanFormState => ({
  planCode: plan.planCode,
  name: plan.name,
  price: plan.price,
  currency: plan.currency,
  durationMonths: String(plan.durationMonths ?? 12),
  maxConnections: String(plan.maxConnections ?? 1),
  description: plan.description,
  isActive: plan.isActive,
});

const inputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100";

export default function PlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [showRetired, setShowRetired] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);

    try {
      const response = (await plansAPI.getAll()) as { plans?: Plan[] };
      setPlans(response.plans || []);
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to load plans.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const visiblePlans = useMemo(
    () => (showRetired ? plans : plans.filter((plan) => plan.isActive)),
    [plans, showRetired]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? (event.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);

    const payload = {
      planCode: form.planCode.trim(),
      name: form.name.trim(),
      price: Number(form.price || 0),
      currency: form.currency.trim().toUpperCase(),
      durationMonths: Number(form.durationMonths || 12),
      maxConnections: Number(form.maxConnections || 1),
      description: form.description.trim(),
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await plansAPI.update(editingId, payload);
        setNotice({
          type: "success",
          text: `"${payload.name}" was updated. Existing subscribers keep their current price until they renew.`,
        });
      } else {
        await plansAPI.create(payload);
        setNotice({ type: "success", text: `"${payload.name}" was created.` });
      }

      resetForm();
      await loadPlans();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to save the plan.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async (plan: Plan) => {
    const confirmed = window.confirm(
      `Retire "${plan.name}"?\n\n` +
        "It stops being offered to new customers and disappears from the portal " +
        "catalogue. Customers already on it keep running until their service expires."
    );

    if (!confirmed) {
      return;
    }

    setNotice(null);

    try {
      const response = (await plansAPI.retire(plan.id)) as { message?: string };
      setNotice({ type: "success", text: response.message || "Plan retired." });
      await loadPlans();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to retire the plan.",
      });
    }
  };

  const handleReactivate = async (plan: Plan) => {
    setNotice(null);

    try {
      await plansAPI.update(plan.id, { isActive: true });
      setNotice({ type: "success", text: `"${plan.name}" is on sale again.` });
      await loadPlans();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to reactivate the plan.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Catalogue
        </p>
        <h3 className="mt-3 text-3xl font-semibold text-slate-950">Subscription plans</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Plans are shared across every customer. A customer's negotiated price lives on their
          own service, so changing a price here affects new subscriptions and renewals rather
          than rewriting what anyone is currently paying.
        </p>
      </section>

      {notice ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
            <h4 className="text-xl font-semibold text-slate-950">
              {visiblePlans.length} plan{visiblePlans.length === 1 ? "" : "s"}
            </h4>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(event) => setShowRetired(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show retired plans
            </label>
          </div>

          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-600" />
            </div>
          ) : visiblePlans.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              No plans yet. Create one with the form beside this list.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {visiblePlans.map((plan) => (
                <li key={plan.id} className="px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-950">{plan.name}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {plan.planCode}
                        </span>
                        {!plan.isActive ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            retired
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatCurrency(plan.price, plan.currency)} every {plan.durationMonths}{" "}
                        month{plan.durationMonths === 1 ? "" : "s"} • up to {plan.maxConnections}{" "}
                        connection{plan.maxConnections === 1 ? "" : "s"}
                      </p>
                      {plan.description ? (
                        <p className="mt-2 max-w-xl text-sm text-slate-500">{plan.description}</p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(plan.id);
                          setForm(toForm(plan));
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50"
                      >
                        Edit
                      </button>
                      {plan.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleRetire(plan)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
                        >
                          Retire
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReactivate(plan)}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h4 className="text-xl font-semibold text-slate-950">
            {editingId ? "Edit plan" : "New plan"}
          </h4>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Plan code</label>
              <input
                name="planCode"
                value={form.planCode}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={60}
                placeholder="IPTV-PRE-001"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                The stable identifier services reference. Changing it does not move existing
                subscriptions.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={160}
                placeholder="IPTV Premium Package"
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Price</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Currency</label>
                <input
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  maxLength={3}
                  minLength={3}
                  className={`${inputClass} uppercase`}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Billing cycle (months)
                </label>
                <input
                  name="durationMonths"
                  type="number"
                  min="1"
                  max="36"
                  value={form.durationMonths}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Max connections
                </label>
                <input
                  name="maxConnections"
                  type="number"
                  min="1"
                  max="20"
                  value={form.maxConnections}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={2000}
                placeholder="What the customer gets on this plan."
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300"
              />
              Offer this plan to new customers
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create plan"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Managing plans requires the admin role.
          </p>
        </form>
      </section>
    </div>
  );
}
