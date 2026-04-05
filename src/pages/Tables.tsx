import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteCustomer, getAllCustomers, type Customer } from "../data/customersDB";

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

const asSearchableText = (value: unknown) => String(value ?? "").toLowerCase();

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Customer["status"]>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [notice, setNotice] = useState<Notice>(null);

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
            : "Unable to load customer records.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        asSearchableText(customer.name).includes(query) ||
        asSearchableText(customer.email).includes(query) ||
        asSearchableText(customer.phone).includes(query) ||
        asSearchableText(customer.whatsappNumber).includes(query) ||
        asSearchableText(customer.box).includes(query) ||
        asSearchableText(customer.mac).includes(query) ||
        asSearchableText(customer.customerCode).includes(query) ||
        asSearchableText(customer.serviceId).includes(query);

      const matchesStatus =
        statusFilter === "all" ? true : customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const totalPages =
    itemsPerPage === 0 ? 1 : Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const startIndex = itemsPerPage === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const visibleCustomers =
    itemsPerPage === 0
      ? filteredCustomers
      : filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const stats = useMemo(
    () => ({
      total: customers.length,
      active: customers.filter((customer) => customer.status === "active").length,
      pending: customers.filter((customer) => customer.status === "pending").length,
      inactive: customers.filter((customer) => customer.status === "inactive").length,
    }),
    [customers]
  );

  const handleDelete = async (customerId: string, customerName: string) => {
    const confirmed = window.confirm(
      `Delete customer "${customerName}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer(customerId);
      setCustomers((current) => current.filter((customer) => customer.id !== customerId));
      setNotice({
        type: "success",
        text: `${customerName} was removed successfully.`,
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
          ["Total customers", stats.total, "All subscriber records"],
          ["Active services", stats.active, "Customers currently running"],
          ["Pending setup", stats.pending, "Accounts awaiting payment or install"],
          ["Inactive", stats.inactive, "Suspended or closed accounts"],
        ].map(([label, value, helper]) => (
          <div
            key={String(label)}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
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
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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
              <option value="0">Show all</option>
            </select>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>
              {filteredCustomers.length} result{filteredCustomers.length === 1 ? "" : "s"} found
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
        ) : filteredCustomers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h4 className="text-lg font-semibold text-slate-900">No customers found</h4>
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
                        <div>{safeText(customer.amount, "Not set")}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {safeText(customer.paymentMode, "No payment mode")}
                        </div>
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
                        <CustomerActions customer={customer} onDelete={handleDelete} />
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
                        {safeText(customer.amount, "Not set")} •{" "}
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
                    <CustomerActions customer={customer} onDelete={handleDelete} />
                  </div>
                </div>
              ))}
            </div>

            {itemsPerPage !== 0 && totalPages > 1 ? (
              <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                <p>
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of{" "}
                  {filteredCustomers.length} customers
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
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
    </div>
  );
}
