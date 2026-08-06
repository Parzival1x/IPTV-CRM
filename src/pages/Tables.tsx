import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteCustomer,
  listCustomers,
  restoreCustomer,
  type Customer,
} from "../data/customersDB";
import { notificationsAPI, reportsAPI, type Pagination } from "../services/api";
import { formatCurrency } from "../utils/currency";

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

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "CU";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getAccountSummary = (customer: Customer) =>
  `${safeText(customer.customerCode, "No customer code")} • ${safeText(
    customer.serviceId,
    "No service ID"
  )}`;

type BroadcastResult = {
  sent: number;
  failed: number;
  skipped: number;
  failures: { customerId: string; name: string; reason: string }[];
};

const BroadcastDialog = ({
  customerIds,
  onClose,
  onDone,
}: {
  customerIds: string[];
  onClose: () => void;
  onDone: (summary: BroadcastResult) => void;
}) => {
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (channel: string) =>
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((entry) => entry !== channel)
        : [...current, channel]
    );

  const handleSend = async () => {
    if (channels.length === 0) {
      setError("Choose at least one channel.");
      return;
    }

    if (message.trim().length < 2) {
      setError("Write a message to send.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = (await notificationsAPI.broadcast({
        customerIds,
        channels,
        templateName: "custom",
        subject: subject.trim() || undefined,
        metadata: { message: message.trim() },
      })) as { summary: BroadcastResult };

      onDone(response.summary);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Unable to send the broadcast."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-slate-950">
          Message {customerIds.length} customer{customerIds.length === 1 ? "" : "s"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Customers who have opted out of a channel are skipped automatically.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <div className="flex gap-2">
            {["email", "whatsapp"].map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium capitalize transition ${
                  channels.includes(channel)
                    ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {channel}
              </button>
            ))}
          </div>

          {channels.includes("email") ? (
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              placeholder="Email subject (optional)"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />
          ) : null}

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="Your message to these customers."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomerActions = ({
  customer,
  onDelete,
}: {
  customer: Customer;
  onDelete: (customerId: string, customerName: string) => void;
}) => {
  const navigate = useNavigate();
  const stopRowNavigation = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={(event) => {
          stopRowNavigation(event);
          navigate(`/customers/${customer.id}`);
        }}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        View
      </button>
      <button
        type="button"
        onClick={(event) => {
          stopRowNavigation(event);
          navigate(`/customers/${customer.id}`, {
            state: { openNotifications: true },
          });
        }}
        className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50"
      >
        Notify
      </button>
      <button
        type="button"
        onClick={(event) => {
          stopRowNavigation(event);
          navigate(`/customers/${customer.id}/edit`);
        }}
        className="rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={(event) => {
          stopRowNavigation(event);
          onDelete(customer.id, customer.name);
        }}
        className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
      >
        Delete
      </button>
    </div>
  );
};

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Customer["status"]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [notice, setNotice] = useState<Notice>(null);
  // Soft-deleted customers were invisible with no route back, which made the
  // restore endpoint unreachable.
  const [showRemoved, setShowRemoved] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Every keystroke used to re-filter an in-memory array. Now it is a request,
  // so it waits for the typing to stop.
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Guards against an earlier, slower request landing after a later one and
  // painting stale rows.
  const requestRef = useRef(0);

  const loadCustomers = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    setLoading(true);
    setNotice(null);

    try {
      const result = await listCustomers({
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        pageSize: itemsPerPage,
        deleted: showRemoved,
      });

      if (requestRef.current !== requestId) {
        return;
      }

      setCustomers(result.customers);
      setPagination(result.pagination);
    } catch (error) {
      if (requestRef.current !== requestId) {
        return;
      }

      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to load customer records.",
      });
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [searchTerm, statusFilter, currentPage, itemsPerPage, showRemoved]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // A filter change means the current page number no longer refers to
  // anything meaningful.
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm, statusFilter, itemsPerPage, showRemoved]);

  const handleRestore = async (customer: Customer) => {
    setRestoringId(customer.id);
    setNotice(null);

    try {
      await restoreCustomer(customer.id);
      await loadCustomers();
      setNotice({ type: "success", text: `${customer.name} was restored.` });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to restore this customer.",
      });
    } finally {
      setRestoringId(null);
    }
  };

  const toggleSelected = (customerId: string) =>
    setSelectedIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId]
    );

  const allOnPageSelected =
    customers.length > 0 && customers.every((customer) => selectedIds.includes(customer.id));

  const toggleSelectPage = () =>
    setSelectedIds((current) =>
      allOnPageSelected
        ? current.filter((id) => !customers.some((customer) => customer.id === id))
        : Array.from(new Set([...current, ...customers.map((customer) => customer.id)]))
    );

  const handleBroadcastDone = (summary: BroadcastResult) => {
    setIsBroadcastOpen(false);
    setSelectedIds([]);
    setNotice({
      type: summary.failed > 0 ? "error" : "success",
      text:
        `Sent to ${summary.sent} customer${summary.sent === 1 ? "" : "s"}.` +
        (summary.skipped > 0 ? ` ${summary.skipped} skipped (opted out or unreachable).` : "") +
        (summary.failed > 0 ? ` ${summary.failed} failed.` : ""),
    });
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      await reportsAPI.downloadCsv("customers", {
        search: searchTerm,
        status: statusFilter,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to export customers.",
      });
    } finally {
      setExporting(false);
    }
  };

  const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.total);

  const visibleCustomers = customers;

  const handleDelete = async (customerId: string, customerName: string) => {
    const confirmed = window.confirm(
      `Remove customer "${customerName}"? Their payment history is kept and the record can be restored.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer(customerId);
      await loadCustomers();
      setNotice({
        type: "success",
        text: `${customerName} was removed. Their payment history is retained.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to delete the selected customer.",
      });
    }
  };

  const openCustomer = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLTableRowElement | HTMLDivElement>,
    customerId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCustomer(customerId);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Customer Operations
            </p>
            <h3 className="mt-3 text-3xl font-semibold text-slate-950">Customer directory</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Search subscriber accounts, check renewal status, and jump into the same view,
              edit, and notification flows used everywhere else in the CRM.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {selectedIds.length > 0 && !showRemoved ? (
              <button
                type="button"
                onClick={() => setIsBroadcastOpen(true)}
                className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-cyan-700"
              >
                Message {selectedIds.length} selected
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowRemoved((current) => !current)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                showRemoved
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {showRemoved ? "Back to active" : "Removed customers"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            <button
              type="button"
              onClick={loadCustomers}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Refresh directory
            </button>
            <Link
              to="/customers/new"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Add customer
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Matching customers", String(pagination.total), "Across the current filters"],
          [
            "Showing",
            pagination.total === 0 ? "0" : `${rangeStart}-${rangeEnd}`,
            "Rows on this page",
          ],
          ["Status filter", statusFilter === "all" ? "All" : statusFilter, "Applied server side"],
          ["Page", `${pagination.page} of ${pagination.totalPages}`, "Use the pager below"],
        ].map(([label, value, helper]) => (
          <div
            key={String(label)}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold capitalize text-slate-950">{value}</div>
            <div className="mt-2 text-sm text-slate-500">{helper}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-6">
          {notice ? (
            <div
              className={`mb-5 rounded-2xl border p-4 text-sm ${
                notice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {notice.text}
            </div>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-[1fr_220px_180px]">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, email, phone, box, MAC, or service ID"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | Customer["status"])
              }
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={itemsPerPage}
              onChange={(event) => setItemsPerPage(Number(event.target.value))}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>
              {pagination.total} result{pagination.total === 1 ? "" : "s"} found
            </p>
            <p>
              Search and actions stay consistent with the dashboard and customer profile pages.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center px-6 py-10">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-cyan-600" />
              <p className="mt-4 text-sm text-slate-500">Loading customer records...</p>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h4 className="text-lg font-semibold text-slate-900">
              {showRemoved ? "No removed customers" : "No customers found"}
            </h4>
            <p className="mt-2 text-sm text-slate-500">
              Adjust the filters or create a new customer record.
            </p>
            <div className="mt-6">
              <Link
                to="/customers/new"
                className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Add customer
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-12 px-6 py-4">
                      {!showRemoved ? (
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectPage}
                          aria-label="Select every customer on this page"
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      ) : null}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Account
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Billing
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Expiry
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      tabIndex={0}
                      role="link"
                      onClick={() => openCustomer(customer.id)}
                      onKeyDown={(event) => handleRowKeyDown(event, customer.id)}
                      className="cursor-pointer transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    >
                      <td className="px-6 py-4" onClick={(event) => event.stopPropagation()}>
                        {!showRemoved ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(customer.id)}
                            onChange={() => toggleSelected(customer.id)}
                            aria-label={`Select ${customer.name}`}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                            {getInitials(customer.name)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-950">
                              {safeText(customer.name, "Unnamed customer")}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {safeText(customer.email, "No email")} •{" "}
                              {safeText(customer.phone, "No phone")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div>{safeText(customer.role, "Customer")}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {getAccountSummary(customer)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div>{formatCurrency(customer.amount, customer.currency)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {safeText(customer.paymentMode, "No payment mode")}
                        </div>
                        {parseFloat(customer.paymentSummary?.outstandingBalance || "0") > 0 ? (
                          <div className="mt-1 text-xs font-medium text-amber-700">
                            {formatCurrency(
                              customer.paymentSummary?.outstandingBalance,
                              customer.currency
                            )}{" "}
                            outstanding
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(customer.expiryDate)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                            customer.status
                          )}`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {showRemoved ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRestore(customer);
                            }}
                            disabled={restoringId === customer.id}
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {restoringId === customer.id ? "Restoring..." : "Restore"}
                          </button>
                        ) : (
                          <CustomerActions customer={customer} onDelete={handleDelete} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 px-6 py-6 xl:hidden">
              {visibleCustomers.map((customer) => (
                <div
                  key={customer.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => openCustomer(customer.id)}
                  onKeyDown={(event) => handleRowKeyDown(event, customer.id)}
                  className="cursor-pointer rounded-3xl border border-slate-200 p-5 shadow-sm transition hover:border-cyan-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {getInitials(customer.name)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {safeText(customer.name, "Unnamed customer")}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {safeText(customer.email, "No email")}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                        customer.status
                      )}`}
                    >
                      {customer.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Contact
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {safeText(customer.phone, "No phone")}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Account
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {getAccountSummary(customer)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Billing
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {formatCurrency(customer.amount, customer.currency)} •{" "}
                        {safeText(customer.paymentMode, "No payment mode")}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Expiry
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {formatDate(customer.expiryDate)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    {showRemoved ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRestore(customer);
                        }}
                        disabled={restoringId === customer.id}
                        className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {restoringId === customer.id ? "Restoring..." : "Restore"}
                      </button>
                    ) : (
                      <CustomerActions customer={customer} onDelete={handleDelete} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 ? (
              <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                <p>
                  Showing {rangeStart} to {rangeEnd} of {pagination.total} customers
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={pagination.page <= 1 || loading}
                    className="rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))
                    }
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {isBroadcastOpen ? (
        <BroadcastDialog
          customerIds={selectedIds}
          onClose={() => setIsBroadcastOpen(false)}
          onDone={handleBroadcastDone}
        />
      ) : null}
    </div>
  );
}
