import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAllCustomers,
  resetCustomerPortalPassword,
  type Customer,
} from "../data/customersDB";

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

type ResetCredential = {
  customerId: string;
  customerName: string;
  email: string;
  customerCode: string;
  temporaryPassword: string;
};

const safeText = (value: unknown, fallback = "Not available") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Never";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Never" : parsed.toLocaleString();
};

const buildCredentialsText = (credentials: ResetCredential[]) =>
  credentials
    .map(
      (item) =>
        `${item.customerName} | ${item.email} | ${item.customerCode} | ${item.temporaryPassword}`
    )
    .join("\n");

const downloadCredentialsCsv = (credentials: ResetCredential[]) => {
  if (credentials.length === 0) {
    return;
  }

  const rows = [
    ["Customer Name", "Email", "Customer Code", "Temporary Password"],
    ...credentials.map((item) => [
      item.customerName,
      item.email,
      item.customerCode,
      item.temporaryPassword,
    ]),
  ];

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "portal-access-reset-credentials.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function PortalAccessAdmin() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [latestCredentials, setLatestCredentials] = useState<ResetCredential[]>([]);
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
  const stopRowNavigation = (
    event: MouseEvent<HTMLInputElement | HTMLButtonElement | HTMLAnchorElement>
  ) => {
    event.stopPropagation();
  };

  const loadCustomers = async () => {
    setLoading(true);
    setNotice(null);

    try {
      const records = await getAllCustomers();
      setCustomers(records);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to load customer portal access records.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.name, customer.email, customer.customerCode, customer.serviceId]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(query))
    );
  }, [customers, searchTerm]);

  const selectedCustomers = useMemo(
    () => customers.filter((customer) => selectedIds.includes(customer.id)),
    [customers, selectedIds]
  );

  const portalEnabledCount = useMemo(
    () => customers.filter((customer) => customer.portalAccessEnabled !== false).length,
    [customers]
  );

  const resetRequiredCount = useMemo(
    () => customers.filter((customer) => customer.portalResetRequired !== false).length,
    [customers]
  );

  const handleSelect = (customerId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...current, customerId] : current.filter((id) => id !== customerId)
    );
  };

  const handleSelectVisible = (checked: boolean) => {
    if (checked) {
      const visibleIds = filteredCustomers.map((customer) => customer.id);
      setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
      return;
    }

    const visibleIdSet = new Set(filteredCustomers.map((customer) => customer.id));
    setSelectedIds((current) => current.filter((id) => !visibleIdSet.has(id)));
  };

  const handleSingleReset = async (customer: Customer) => {
    setNotice(null);
    setProcessingIds((current) => [...current, customer.id]);

    try {
      const updatedCustomer = await resetCustomerPortalPassword(customer.id);

      if (!updatedCustomer?.portalSetup?.temporaryPassword) {
        throw new Error("Temporary password was not returned for this reset.");
      }

      setCustomers((current) =>
        current.map((item) => (item.id === customer.id ? updatedCustomer : item))
      );
      setLatestCredentials([
        {
          customerId: customer.id,
          customerName: customer.name,
          email: customer.email,
          customerCode: customer.customerCode,
          temporaryPassword: updatedCustomer.portalSetup.temporaryPassword,
        },
      ]);
      setNotice({
        type: "success",
        text: `Portal password reset for ${customer.name}.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to reset the selected customer portal password.",
      });
    } finally {
      setProcessingIds((current) => current.filter((id) => id !== customer.id));
    }
  };

  const handleBulkReset = async () => {
    if (selectedCustomers.length === 0) {
      setNotice({
        type: "error",
        text: "Select at least one customer before running a bulk reset.",
      });
      return;
    }

    setNotice(null);
    setBulkProcessing(true);
    const nextCredentials: ResetCredential[] = [];

    try {
      for (const customer of selectedCustomers) {
        const updatedCustomer = await resetCustomerPortalPassword(customer.id);

        if (!updatedCustomer?.portalSetup?.temporaryPassword) {
          throw new Error(`Temporary password was not returned for ${customer.name}.`);
        }

        nextCredentials.push({
          customerId: customer.id,
          customerName: customer.name,
          email: customer.email,
          customerCode: customer.customerCode,
          temporaryPassword: updatedCustomer.portalSetup.temporaryPassword,
        });

        setCustomers((current) =>
          current.map((item) => (item.id === customer.id ? updatedCustomer : item))
        );
      }

      setLatestCredentials(nextCredentials);
      setNotice({
        type: "success",
        text: `${nextCredentials.length} customer portal password(s) reset successfully.`,
      });
      setSelectedIds([]);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Bulk portal password reset failed.",
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const copyLatestCredentials = async () => {
    if (latestCredentials.length === 0) {
      return;
    }

    await navigator.clipboard.writeText(buildCredentialsText(latestCredentials));
    setNotice({
      type: "success",
      text: "Latest temporary portal credentials copied to the clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Portal Access
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">
              Customer portal credentials
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review portal status, last login visibility, and issue new temporary passwords
              for customers. Existing passwords cannot be recovered because only hashes are
              stored, so this page shows newly issued resets only.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadCustomers}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleBulkReset}
              disabled={bulkProcessing || selectedCustomers.length === 0}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {bulkProcessing
                ? "Resetting selected..."
                : `Reset selected (${selectedCustomers.length})`}
            </button>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm ${
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
          ["Portal enabled", portalEnabledCount],
          ["Reset required", resetRequiredCount],
          ["Selected", selectedCustomers.length],
          ["Latest resets", latestCredentials.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      {latestCredentials.length > 0 ? (
        <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-950">
                Latest temporary portal credentials
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Save or share these now. They cannot be retrieved again later without another reset.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyLatestCredentials}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => downloadCredentialsCsv(latestCredentials)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-cyan-100 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Customer code</th>
                  <th className="px-4 py-3 font-semibold">Temporary password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {latestCredentials.map((credential) => (
                  <tr key={credential.customerId}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {credential.customerName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{credential.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {credential.customerCode}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                      {credential.temporaryPassword}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, customer code, or service ID"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={
                  filteredCustomers.length > 0 &&
                  filteredCustomers.every((customer) => selectedIds.includes(customer.id))
                }
                onChange={(event) => handleSelectVisible(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              Select visible
            </label>
            <Link
              to="/customers"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Open directory
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center px-6 py-10">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-600" />
              <p className="mt-4 text-sm text-slate-500">Loading portal access records...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-6 py-4 font-semibold">Select</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Portal status</th>
                  <th className="px-6 py-4 font-semibold">Reset required</th>
                  <th className="px-6 py-4 font-semibold">Last login</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredCustomers.map((customer) => {
                  const isProcessing = processingIds.includes(customer.id);

                  return (
                    <tr
                      key={customer.id}
                      tabIndex={0}
                      role="link"
                      onClick={() => openCustomer(customer.id)}
                      onKeyDown={(event) => handleOpenKeyDown(event, customer.id)}
                      className="cursor-pointer transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(customer.id)}
                          onClick={stopRowNavigation}
                          onChange={(event) => handleSelect(customer.id, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-950">{customer.name}</div>
                        <div className="mt-1 text-sm text-slate-500">
                          {safeText(customer.email, "No email")}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {safeText(customer.customerCode, "No customer code")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {customer.portalAccessEnabled ? "Enabled" : "Disabled"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {customer.portalResetRequired ? "Yes" : "No"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDateTime(customer.portalLastLogin)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              stopRowNavigation(event);
                              handleSingleReset(customer);
                            }}
                            disabled={isProcessing || bulkProcessing}
                            className="rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isProcessing ? "Resetting..." : "Reset password"}
                          </button>
                          <Link
                            to={`/customers/${customer.id}`}
                            onClick={stopRowNavigation}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            View customer
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
