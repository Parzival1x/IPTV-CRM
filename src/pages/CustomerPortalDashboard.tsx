import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ServiceDetailsModal from "../components/common/ServiceDetailsModal";
import type { CustomerSubscription } from "../data/customersDB";
import { customerPortalAuthService } from "../services/customerPortalAuth";
import { plansAPI, portalAPI } from "../services/api";

type PortalPlan = {
  id: string;
  planCode: string;
  name: string;
  price: string;
  durationDays: number;
  maxConnections: number;
  description: string;
};

type PortalServiceRequest = {
  id: string;
  requestedPlanName: string;
  requestedDurationMonths: number;
  requestedAmount: string;
  notes: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  createdAt: string;
  adminResponse: string;
};

type PortalResponse = {
  success: boolean;
  customer: ReturnType<typeof customerPortalAuthService.getCurrentCustomer>;
  serviceRequests: PortalServiceRequest[];
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not set" : parsed.toLocaleDateString();
};

const formatCurrency = (value: string) => {
  const numeric = parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
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

const daysUntil = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(value);
  target.setHours(0, 0, 0, 0);

  if (Number.isNaN(target.getTime())) {
    return null;
  }

  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatusTone = (status: PortalServiceRequest["status"]) => {
  switch (status) {
    case "approved":
    case "fulfilled":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

const getSubscriptionTone = (status: string) => {
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

const getBalanceTone = (kind: "credit" | "debt" | "neutral", value: string) => {
  const numeric = parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
  const amount = Number.isFinite(numeric) ? numeric : 0;

  if (kind === "credit") {
    return amount > 0
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-white";
  }

  if (kind === "debt") {
    return amount > 0
      ? "border-rose-200 bg-rose-50"
      : "border-emerald-200 bg-emerald-50";
  }

  return "border-slate-200 bg-white";
};

const getBalancePanelTone = (kind: "credit" | "debt" | "neutral", value: string) => {
  const numeric = parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
  const amount = Number.isFinite(numeric) ? numeric : 0;

  if (kind === "credit") {
    return amount > 0 ? "bg-emerald-50 ring-emerald-200" : "bg-slate-50 ring-slate-200";
  }

  if (kind === "debt") {
    return amount > 0 ? "bg-rose-50 ring-rose-200" : "bg-emerald-50 ring-emerald-200";
  }

  return "bg-slate-50 ring-slate-200";
};

export default function CustomerPortalDashboard() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(customerPortalAuthService.getCurrentCustomer());
  const [serviceRequests, setServiceRequests] = useState<PortalServiceRequest[]>([]);
  const [plans, setPlans] = useState<PortalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "catalog" | "requests" | "security"
  >("overview");
  const [selectedService, setSelectedService] = useState<CustomerSubscription | null>(null);
  const [requestForm, setRequestForm] = useState({
    planId: "",
    requestedPlanCode: "",
    requestedPlanName: "",
    requestedDurationMonths: "12",
    requestedAmount: "",
    notes: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadPortal = async () => {
      setLoading(true);
      setError("");

      try {
        const [dashboardResponse, plansResponse] = await Promise.all([
          portalAPI.getDashboard(),
          plansAPI.getPortalPlans(),
        ]);

        if (!isMounted) {
          return;
        }

        const dashboard = dashboardResponse as PortalResponse;
        const availablePlans = (plansResponse as { plans?: PortalPlan[] }).plans || [];

        setCustomer(dashboard.customer || null);
        setServiceRequests(dashboard.serviceRequests || []);
        setPlans(availablePlans);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load customer portal."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPortal();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeSubscriptions = useMemo(
    () => customer?.subscriptions?.filter((subscription) => subscription.status === "active") || [],
    [customer]
  );

  const subscribedPlanCodes = useMemo(
    () =>
      new Set(
        (customer?.subscriptions || [])
          .map((subscription) => subscription.planCode || subscription.serviceCode)
          .filter(Boolean)
      ),
    [customer]
  );

  const availablePlans = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        alreadySubscribed: subscribedPlanCodes.has(plan.planCode),
      })),
    [plans, subscribedPlanCodes]
  );

  const handleRequestPlanChange = (planId: string) => {
    const selectedPlan = plans.find((plan) => plan.id === planId);
    setRequestForm((current) => ({
      ...current,
      planId,
      requestedPlanCode: selectedPlan?.planCode || "",
      requestedPlanName: selectedPlan?.name || "",
      requestedAmount: selectedPlan?.price || "",
      requestedDurationMonths: selectedPlan
        ? String(Math.max(Math.round(selectedPlan.durationDays / 30), 1))
        : current.requestedDurationMonths,
    }));
  };

  const handleRequestFromCatalog = (planId: string) => {
    handleRequestPlanChange(planId);
    setActiveTab("requests");
    setNotice("The selected plan has been added to the request form below.");
    setError("");
  };

  const openServiceDetails = (service: CustomerSubscription) => {
    setSelectedService(service);
  };

  const submitServiceRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = (await portalAPI.createServiceRequest({
        ...requestForm,
        requestedDurationMonths: Number(requestForm.requestedDurationMonths),
        requestedAmount: Number(requestForm.requestedAmount || 0),
      })) as { success: boolean; serviceRequest: PortalServiceRequest };

      setServiceRequests((current) => [response.serviceRequest, ...current]);
      setNotice("Service request submitted. The admin team has been notified.");
      setRequestForm({
        planId: "",
        requestedPlanCode: "",
        requestedPlanName: "",
        requestedDurationMonths: "12",
        requestedAmount: "",
        notes: "",
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the service request."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice("");
    setError("");

    if (passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("The new password confirmation does not match.");
      return;
    }

    const result = await customerPortalAuthService.changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    );

    if (!result.success) {
      setError(result.error || "Unable to change portal password.");
      return;
    }

    setCustomer(customerPortalAuthService.getCurrentCustomer());
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setNotice("Portal password updated successfully.");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">Loading customer portal...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="max-w-lg rounded-3xl border border-rose-200 bg-rose-50 px-8 py-8 text-rose-700">
          <h2 className="text-xl font-semibold">Portal unavailable</h2>
          <p className="mt-2 text-sm">{error || "Customer session could not be loaded."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Customer Portal
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">
                Welcome back, {customer.name}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Review your active services, request upgrades or new plans, and keep your
                portal access up to date.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                customerPortalAuthService.signOut();
                navigate("/", { replace: true });
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </section>

        {notice ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Customer code", customer.customerCode || "Not assigned"],
            ["Primary account", customer.serviceId || "Not assigned"],
            ["Active services", String(activeSubscriptions.length)],
            ["Due now", formatCurrency(customer.paymentSummary?.dueNow || "0")],
            ["Outstanding", formatCurrency(customer.paymentSummary?.outstandingBalance || "0")],
            ["Available credit", formatCurrency(customer.paymentSummary?.availableCredit || "0")],
            ["Portal reset", customer.portalResetRequired ? "Required" : "Completed"],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`rounded-3xl border p-5 shadow-sm ${
                label === "Due now" || label === "Outstanding"
                  ? getBalanceTone("debt", String(value))
                  : label === "Available credit"
                    ? getBalanceTone("credit", String(value))
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="text-sm font-medium text-slate-500">{label}</div>
              <div className="mt-3 text-xl font-semibold text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {[
              ["overview", "Overview"],
              ["catalog", "Available services"],
              ["requests", "Requests"],
              ["security", "Security"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setActiveTab(
                    value as "overview" | "catalog" | "requests" | "security"
                  )
                }
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  activeTab === value
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "overview" ? (
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">Active services</h2>
                <p className="mt-2 text-sm text-slate-500">
                  A quick view of the services that are currently running on your account.
                </p>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {activeSubscriptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 xl:col-span-2">
                      No active services are visible in your portal yet.
                    </div>
                  ) : (
                    activeSubscriptions.map((subscription) => {
                      const remainingDays = daysUntil(subscription.expiryDate);

                      return (
                        <article
                          key={subscription.id}
                          className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-950">
                                {subscription.serviceLabel || subscription.planName}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {subscription.serviceCode || subscription.planCode || "Service code pending"}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionTone(
                                subscription.status
                              )}`}
                            >
                              {subscription.status}
                            </span>
                          </div>

                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Amount
                              </div>
                              <div className="mt-2 text-sm font-medium text-slate-900">
                                {formatCurrency(subscription.amount)}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Expiry
                              </div>
                              <div className="mt-2 text-sm font-medium text-slate-900">
                                {formatDate(subscription.expiryDate)}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Payment mode
                              </div>
                              <div className="mt-2 text-sm font-medium text-slate-900">
                                {subscription.paymentMode || "Not set"}
                              </div>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Renewal
                              </div>
                              <div className="mt-2 text-sm font-medium text-slate-900">
                                {remainingDays === null
                                  ? "Not set"
                                  : remainingDays < 0
                                    ? `${Math.abs(remainingDays)} days overdue`
                                    : remainingDays === 0
                                      ? "Expires today"
                                      : `${remainingDays} days left`}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => openServiceDetails(subscription)}
                              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
                            >
                              View full details
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">Request a new service</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Submit a request and the admin team will review it from their operations queue.
                </p>

                <form onSubmit={submitServiceRequest} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Plan</label>
                    <select
                      value={requestForm.planId}
                      onChange={(event) => handleRequestPlanChange(event.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    >
                      <option value="">Select a service plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - {formatCurrency(plan.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Duration (months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        value={requestForm.requestedDurationMonths}
                        onChange={(event) =>
                          setRequestForm((current) => ({
                            ...current,
                            requestedDurationMonths: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Expected amount
                      </label>
                      <input
                        type="text"
                        value={requestForm.requestedAmount}
                        onChange={(event) =>
                          setRequestForm((current) => ({
                            ...current,
                            requestedAmount: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
                    <textarea
                      value={requestForm.notes}
                      onChange={(event) =>
                        setRequestForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      rows={4}
                      placeholder="Tell the admin team what you want, for example extra connections, upgrade timing, or device needs."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSubmitting ? "Submitting..." : "Submit service request"}
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">Billing snapshot</h2>
                <p className="mt-2 text-sm text-slate-500">
                  A simple view of what is currently due on your account and any prepaid credit already on file.
                </p>
                <div className="mt-5 grid gap-4">
                  {[
                    ["Recurring services total", formatCurrency(customer.paymentSummary?.recurringAmount || "0")],
                    ["Due now", formatCurrency(customer.paymentSummary?.dueNow || "0")],
                    ["Overdue amount", formatCurrency(customer.paymentSummary?.overdueAmount || "0")],
                    ["Available credit", formatCurrency(customer.paymentSummary?.availableCredit || "0")],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className={`rounded-2xl px-4 py-4 ring-1 ${
                        label === "Available credit"
                          ? getBalancePanelTone("credit", String(value))
                          : label === "Due now" || label === "Overdue amount"
                            ? getBalancePanelTone("debt", String(value))
                            : getBalancePanelTone("neutral", String(value))
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
                      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">Request history</h2>
                <div className="mt-5 space-y-3">
                  {serviceRequests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                      You have not submitted any service requests yet.
                    </div>
                  ) : (
                    serviceRequests.slice(0, 3).map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">
                              {request.requestedPlanName}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              Requested on {formatDate(request.createdAt)}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-950">Security</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Use the security tab when you need to update your portal password.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className="mt-5 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Open security settings
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "catalog" ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Available services</h2>
            <p className="mt-2 text-sm text-slate-500">
              Browse the full service catalog your admin team currently offers. This shows the
              services you already have and the ones you can still request.
            </p>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {availablePlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500 xl:col-span-2">
                  No service plans are currently published in the portal.
                </div>
              ) : (
                availablePlans.map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">{plan.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {plan.planCode || "Plan code pending"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.alreadySubscribed
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {plan.alreadySubscribed ? "Already subscribed" : "Available"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      {plan.description || "No detailed description is available for this plan yet."}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Price
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {formatCurrency(plan.price)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Duration
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {Math.max(Math.round(plan.durationDays / 30), 1)} months
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Connections
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {plan.maxConnections}
                        </div>
                      </div>
                    </div>

                    {plan.description ? (
                      <div className="mt-5 rounded-2xl bg-white px-4 py-4 ring-1 ring-slate-200">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Highlights
                        </div>
                        <div className="mt-2 text-sm leading-7 text-slate-600">
                          {plan.description}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleRequestFromCatalog(plan.id)}
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        {plan.alreadySubscribed ? "Request another line or upgrade" : "Request this service"}
                      </button>
                      {plan.alreadySubscribed ? (
                        <span className="inline-flex items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                          Already active on your account
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "requests" ? (
          <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Request a new service</h2>
              <p className="mt-2 text-sm text-slate-500">
                Submit a service or upgrade request for admin review.
              </p>

              <form onSubmit={submitServiceRequest} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Plan</label>
                  <select
                    value={requestForm.planId}
                    onChange={(event) => handleRequestPlanChange(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="">Select a service plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Duration (months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="36"
                      value={requestForm.requestedDurationMonths}
                      onChange={(event) =>
                        setRequestForm((current) => ({
                          ...current,
                          requestedDurationMonths: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Expected amount
                    </label>
                    <input
                      type="text"
                      value={requestForm.requestedAmount}
                      onChange={(event) =>
                        setRequestForm((current) => ({
                          ...current,
                          requestedAmount: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    value={requestForm.notes}
                    onChange={(event) =>
                      setRequestForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    rows={4}
                    placeholder="Tell the admin team what you want, for example extra connections, upgrade timing, or device needs."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? "Submitting..." : "Submit service request"}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Request history</h2>
              <div className="mt-5 space-y-3">
                {serviceRequests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    You have not submitted any service requests yet.
                  </div>
                ) : (
                  serviceRequests.map((request) => (
                    <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {request.requestedPlanName}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            Requested on {formatDate(request.createdAt)}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-slate-700">
                        Duration: {request.requestedDurationMonths} months
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        Expected amount: {formatCurrency(request.requestedAmount)}
                      </div>
                      {request.notes ? (
                        <div className="mt-3 text-sm text-slate-600">{request.notes}</div>
                      ) : null}
                      {request.adminResponse ? (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          Admin response: {request.adminResponse}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "security" ? (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Portal access</h2>
              <p className="mt-2 text-sm text-slate-500">
                Your services stay read-only in this portal. Use this section to keep your login
                secure.
              </p>
              <div className="mt-5 space-y-3">
                {[
                  ["Portal email", customer.email || "Not set"],
                  ["Portal reset required", customer.portalResetRequired ? "Yes" : "No"],
                  ["Last portal login", formatDate(customer.portalLastLogin)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Security</h2>
              <p className="mt-2 text-sm text-slate-500">
                Update your portal password after the first login and whenever support resets it.
              </p>
              <form onSubmit={submitPasswordChange} className="mt-5 space-y-4">
                <input
                  type="password"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                />
                <button
                  type="submit"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Update portal password
                </button>
              </form>
            </div>
          </section>
        ) : null}

        <ServiceDetailsModal
          isOpen={Boolean(selectedService)}
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      </div>
    </div>
  );
}
