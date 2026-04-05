import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ServiceDetailsCard from "../components/common/ServiceDetailsCard";
import ServiceEditorModal from "../components/common/ServiceEditorModal";
import RecordPaymentModal from "../components/common/RecordPaymentModal";
import TwilioWhatsAppMessaging from "../components/common/TwilioWhatsAppMessaging";
import {
  addCustomerService,
  getCustomerById,
  recordCustomerPayment,
  resetCustomerPortalPassword,
  type Customer,
  type CustomerSubscription,
  type CustomerServiceInput,
  updateCustomerService,
} from "../data/customersDB";

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

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

const getCustomerStatusTone = (status: Customer["status"]) => {
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

const getFinancialTone = (
  kind: "credit" | "debt" | "neutral",
  value: string
) => {
  const numeric = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
  const amount = Number.isFinite(numeric) ? numeric : 0;

  if (kind === "credit") {
    return amount > 0
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  }

  if (kind === "debt") {
    if (amount > 0) {
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    }

    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
};

const getRenewalTone = (summary: string) => {
  const normalized = summary.toLowerCase();

  if (normalized.includes("overdue") || normalized.includes("expires today")) {
    return "border-rose-200 bg-rose-50";
  }

  if (normalized.includes("remaining")) {
    const parsed = parseInt(normalized, 10);

    if (Number.isFinite(parsed) && parsed <= 7) {
      return "border-amber-200 bg-amber-50";
    }

    return "border-emerald-200 bg-emerald-50";
  }

  return "border-slate-200 bg-white";
};

const CustomerDetailSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
    {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    <div className="mt-6">{children}</div>
  </section>
);

const DetailRow = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "credit" | "debt";
}) => (
  <div className={`rounded-2xl px-4 py-4 ${getFinancialTone(tone, value)}`}>
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
      {label}
    </div>
    <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
  </div>
);

export default function CustomerDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isResettingPortal, setIsResettingPortal] = useState(false);
  const [isServiceEditorOpen, setIsServiceEditorOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [serviceEditorMode, setServiceEditorMode] = useState<"create" | "edit">("create");
  const [selectedService, setSelectedService] = useState<CustomerSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCustomer = async () => {
      if (!id) {
        if (isMounted) {
          setNotice({
            type: "error",
            text: "Customer ID is missing from the route.",
          });
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setNotice(null);

      try {
        const record = await getCustomerById(id);

        if (!isMounted) {
          return;
        }

        if (!record) {
          setCustomer(null);
          setNotice({
            type: "error",
            text: "The selected customer could not be found.",
          });
          setLoading(false);
          return;
        }

        setCustomer(record);
      } catch (error) {
        if (isMounted) {
          setNotice({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load customer details.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if ((location.state as { openNotifications?: boolean } | null)?.openNotifications) {
      setShowNotificationModal(true);
    }

    const portalSetup = (location.state as { portalSetup?: Customer["portalSetup"] } | null)
      ?.portalSetup;

    if (portalSetup?.temporaryPassword) {
      setNotice({
        type: "success",
        text: `Temporary portal password: ${portalSetup.temporaryPassword}`,
      });
    }
  }, [location.state]);

  const serviceSummary = useMemo(() => {
    if (!customer) {
      return {
        active: [],
        other: [],
        total: 0,
      };
    }

    const active = customer.subscriptions.filter((service) => service.status === "active");
    const other = customer.subscriptions.filter((service) => service.status !== "active");

    return {
      active,
      other,
      total: customer.subscriptions.length,
    };
  }, [customer]);

  const renewalSummary = useMemo(() => {
    if (!customer) {
      return "Not available";
    }

    const serviceToWatch =
      serviceSummary.active[0] || customer.subscriptions[0] || null;
    const remainingDays = daysUntil(serviceToWatch?.expiryDate || customer.expiryDate);

    if (remainingDays === null) {
      return "Expiry not set";
    }

    if (remainingDays < 0) {
      return `${Math.abs(remainingDays)} days overdue`;
    }

    if (remainingDays === 0) {
      return "Expires today";
    }

    return `${remainingDays} days remaining`;
  }, [customer, serviceSummary.active]);

  const creditSummary = useMemo(() => {
    if (!customer) {
      return [];
    }

    return [
      ["Total paid", formatCurrency(customer.totalCredit), "neutral"],
      ["Recurring services total", formatCurrency(customer.alreadyGiven), "neutral"],
      ["Available credit", formatCurrency(customer.remainingCredits), "credit"],
      ["Due now", formatCurrency(customer.paymentSummary?.dueNow || "0"), "debt"],
      [
        "Outstanding balance",
        formatCurrency(customer.paymentSummary?.outstandingBalance || "0"),
        "debt",
      ],
    ] as const;
  }, [customer]);

  const handleNotificationSuccess = () => {
    setNotice({
      type: "success",
      text: "Customer notification sent successfully.",
    });
  };

  const handleNotificationError = (error: string) => {
    setNotice({
      type: "error",
      text: error,
    });
  };

  const handlePortalReset = async () => {
    if (!customer) {
      return;
    }

    setIsResettingPortal(true);
    setNotice(null);

    try {
      const updatedCustomer = await resetCustomerPortalPassword(customer.id);

      if (!updatedCustomer) {
        throw new Error("Unable to reset portal password for this customer.");
      }

      setCustomer(updatedCustomer);
      setNotice({
        type: "success",
        text: updatedCustomer.portalSetup?.temporaryPassword
          ? `Portal password reset. Temporary password: ${updatedCustomer.portalSetup.temporaryPassword}`
          : "Portal password reset successfully.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to reset the customer portal password.",
      });
    } finally {
      setIsResettingPortal(false);
    }
  };

  const handleOpenAddService = () => {
    setServiceEditorMode("create");
    setSelectedService(null);
    setIsServiceEditorOpen(true);
  };

  const handleOpenEditService = (service: CustomerSubscription) => {
    setServiceEditorMode("edit");
    setSelectedService(service);
    setIsServiceEditorOpen(true);
  };

  const handleSaveService = async (payload: CustomerServiceInput) => {
    if (!customer) {
      throw new Error("Customer details are unavailable.");
    }

    const updatedCustomer =
      serviceEditorMode === "create"
        ? await addCustomerService(customer.id, payload)
        : selectedService
          ? await updateCustomerService(customer.id, selectedService.id, payload)
          : null;

    if (!updatedCustomer) {
      throw new Error(
        serviceEditorMode === "create"
          ? "Unable to add the service to this customer."
          : "Unable to update the selected service."
      );
    }

    setCustomer(updatedCustomer);
    setNotice({
      type: "success",
      text:
        serviceEditorMode === "create"
          ? "New service added successfully."
          : "Service details updated successfully.",
    });
  };

  const handleRecordPayment = async (payload: Parameters<typeof recordCustomerPayment>[1]) => {
    if (!customer) {
      throw new Error("Customer details are unavailable.");
    }

    const updatedCustomer = await recordCustomerPayment(customer.id, payload);

    if (!updatedCustomer) {
      throw new Error("Unable to record this payment.");
    }

    setCustomer(updatedCustomer);
    setNotice({
      type: "success",
      text: "Payment recorded successfully and selected services were updated.",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <h3 className="text-lg font-semibold">Customer unavailable</h3>
        <p className="mt-2 text-sm">
          {notice?.text || "The selected customer could not be loaded."}
        </p>
        <div className="mt-5">
          <Link
            to="/customers"
            className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Back to customer directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/customers"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </Link>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCustomerStatusTone(
                  customer.status
                )}`}
              >
                {customer.status}
              </span>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Customer Profile
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">
              {safeText(customer.name, "Unnamed customer")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              View subscriber identity, active services, devices, billing, and renewal status
              from one CRM profile.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="rounded-2xl border border-amber-200 px-4 py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
            >
              Record payment
            </button>
            <button
              type="button"
              onClick={handleOpenAddService}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Add service
            </button>
            <Link
              to="/portal/signin"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Customer portal
            </Link>
            <button
              type="button"
              onClick={() => setShowNotificationModal(true)}
              className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              Notify customer
            </button>
            <button
              type="button"
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              className="rounded-2xl border border-cyan-200 px-4 py-3 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
            >
              Edit customer
            </button>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-3xl border p-4 text-sm ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Customer code", safeText(customer.customerCode, "No customer code")],
          ["Primary account ID", safeText(customer.serviceId, "No service ID")],
          ["Transaction ID", safeText(customer.transactionId, "No transaction ID")],
          ["Renewal status", renewalSummary],
          ["Active services", String(serviceSummary.active.length)],
          ["Total services", String(serviceSummary.total)],
          ["Customer phone", safeText(customer.phone, "No phone")],
          ["WhatsApp", safeText(customer.whatsappNumber, "Uses phone number")],
        ].map(([label, value]) => (
          <div
            key={label}
            className={`rounded-3xl border p-5 shadow-sm ${
              label === "Renewal status"
                ? getRenewalTone(String(value))
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-lg font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <CustomerDetailSection
        title="Services"
        description="All current and historical services live here, while payments can cover one or many of the billable services together."
      >
        {serviceSummary.total === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
            No active services have been saved yet for this customer.
          </div>
        ) : (
          <div className="space-y-4">
            {serviceSummary.active.map((service) => (
              <ServiceDetailsCard
                key={service.id}
                service={service}
                mode="admin"
                onEdit={handleOpenEditService}
              />
            ))}

            {serviceSummary.active.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                This customer has service history, but nothing is currently marked active.
              </div>
            ) : null}

            {serviceSummary.other.length > 0 ? (
              <details className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  View inactive or historical services ({serviceSummary.other.length})
                </summary>
                <div className="mt-4 space-y-4">
                  {serviceSummary.other.map((service) => (
                    <ServiceDetailsCard
                      key={service.id}
                      service={service}
                      mode="admin"
                      onEdit={handleOpenEditService}
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        )}
      </CustomerDetailSection>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <CustomerDetailSection
            title="Contact and identity"
            description="Core customer information used across support, billing, and notifications."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Email" value={safeText(customer.email, "No email")} />
              <DetailRow label="Phone" value={safeText(customer.phone, "No phone")} />
              <DetailRow
                label="WhatsApp"
                value={safeText(customer.whatsappNumber, "Uses phone number")}
              />
              <DetailRow label="Customer type" value={safeText(customer.role, "Customer")} />
              <DetailRow label="City" value={safeText(customer.city, "Not set")} />
              <DetailRow label="Country" value={safeText(customer.country, "Not set")} />
              <div className="md:col-span-2">
                <DetailRow label="Address" value={safeText(customer.address, "Not set")} />
              </div>
            </div>
          </CustomerDetailSection>

          <CustomerDetailSection
            title="Account billing"
            description="Primary account-level billing information plus the current due position for this customer."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Start date" value={formatDate(customer.startDate)} />
              <DetailRow label="Expiry date" value={formatDate(customer.expiryDate)} />
              <DetailRow label="Payment date" value={formatDate(customer.paymentDate)} />
              <DetailRow
                label="Payment mode"
                value={safeText(customer.paymentMode, "Not set")}
              />
              <DetailRow label="Amount" value={formatCurrency(customer.amount)} />
              <DetailRow
                label="Service duration"
                value={safeText(
                  customer.serviceDuration ? `${customer.serviceDuration} months` : "",
                  "Not set"
                )}
              />
              <DetailRow
                label="Due now"
                value={formatCurrency(customer.paymentSummary?.dueNow || "0")}
                tone="debt"
              />
              <DetailRow
                label="Outstanding balance"
                value={formatCurrency(customer.paymentSummary?.outstandingBalance || "0")}
                tone="debt"
              />
            </div>
          </CustomerDetailSection>

          <CustomerDetailSection
            title="Portal access"
            description="Customer-facing login details and reset status for the self-service portal."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow
                label="Portal enabled"
                value={customer.portalAccessEnabled ? "Enabled" : "Disabled"}
              />
              <DetailRow
                label="Password reset required"
                value={customer.portalResetRequired ? "Yes" : "No"}
              />
              <DetailRow
                label="Portal email"
                value={safeText(customer.email, "Customer email required")}
              />
              <DetailRow
                label="Last portal login"
                value={formatDate(customer.portalLastLogin || "")}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePortalReset}
                disabled={isResettingPortal}
                className="rounded-2xl border border-cyan-200 px-4 py-3 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResettingPortal ? "Resetting..." : "Reset portal password"}
              </button>
              <Link
                to="/portal/signin"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Open portal sign-in
              </Link>
            </div>
          </CustomerDetailSection>
        </div>

        <div className="space-y-6">
          <CustomerDetailSection
            title="Device and access"
            description="Hardware references used by operations and support."
          >
            <div className="grid gap-4">
              <DetailRow label="Primary box ID" value={safeText(customer.box, "Not assigned")} />
              <DetailRow label="Primary MAC address" value={safeText(customer.mac, "Not assigned")} />
            </div>
          </CustomerDetailSection>

          <CustomerDetailSection
            title="Credit summary"
            description="A live summary of paid amount, current service load, available credit, and due balance."
          >
            <div className="grid gap-4">
              {creditSummary.map(([label, value, tone]) => (
                <DetailRow key={label} label={label} value={value} tone={tone} />
              ))}
            </div>
          </CustomerDetailSection>

          <CustomerDetailSection
            title="Payment history"
            description="Recent payment activity, including grouped transactions across multiple services."
          >
            {!customer.payments || customer.payments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No payments have been recorded for this customer yet.
              </div>
            ) : (
              <div className="space-y-3">
                {customer.payments.slice(0, 6).map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {safeText(payment.serviceLabel, "Service payment")}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {formatDate(payment.paymentDate)} • {safeText(payment.transactionId, "No transaction ID")}
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {payment.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <DetailRow
                        label={payment.subscriptionId ? "Service charge" : "Credit added"}
                        value={formatCurrency(payment.amount)}
                        tone={payment.subscriptionId ? "neutral" : "credit"}
                      />
                      <DetailRow
                        label="Applied in this payment"
                        value={formatCurrency(payment.finalAmount)}
                        tone={payment.status === "paid" ? "credit" : "debt"}
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <DetailRow
                        label="Payment mode"
                        value={safeText(payment.paymentMode, "Not set")}
                        tone="neutral"
                      />
                      <DetailRow
                        label="Next due date"
                        value={formatDate(payment.nextDueDate)}
                        tone={payment.nextDueDate ? "neutral" : payment.subscriptionId ? "debt" : "credit"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CustomerDetailSection>

          <CustomerDetailSection
            title="Internal notes"
            description="Operational context kept with the customer record."
          >
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              {safeText(customer.note, "No notes recorded yet.")}
            </div>
          </CustomerDetailSection>
        </div>
      </section>

      {showNotificationModal ? (
        <TwilioWhatsAppMessaging
          isOpen={showNotificationModal}
          customer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            whatsappNumber: customer.whatsappNumber,
            email: customer.email,
          }}
          onClose={() => setShowNotificationModal(false)}
          onSuccess={handleNotificationSuccess}
          onError={handleNotificationError}
        />
      ) : null}

      <ServiceEditorModal
        isOpen={isServiceEditorOpen}
        mode={serviceEditorMode}
        service={selectedService}
        onClose={() => setIsServiceEditorOpen(false)}
        onSave={handleSaveService}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        customerName={customer.name}
        services={customer.subscriptions}
        paymentSummary={customer.paymentSummary}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleRecordPayment}
      />
    </div>
  );
}
