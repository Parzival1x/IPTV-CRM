import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminNotificationsAPI, serviceRequestsAPI } from "../services/api";

type ServiceRequest = {
  id: string;
  customerId: string;
  requestedPlanCode: string;
  requestedPlanName: string;
  requestedDurationMonths: number;
  requestedAmount: string;
  notes: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  adminResponse: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    customerCode: string;
    serviceId: string;
  } | null;
};

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    customerCode: string;
  } | null;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not set" : parsed.toLocaleString();
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

const getStatusTone = (status: ServiceRequest["status"]) => {
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

export default function ServiceRequestsReview() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [requestsResponse, notificationsResponse] = await Promise.all([
          serviceRequestsAPI.getAll(),
          adminNotificationsAPI.getAll(),
        ]);

        if (!isMounted) {
          return;
        }

        setRequests((requestsResponse as { serviceRequests?: ServiceRequest[] }).serviceRequests || []);
        setNotifications((notificationsResponse as { notifications?: AdminNotification[] }).notifications || []);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load admin queue.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "pending").length,
    [requests]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead),
    [notifications]
  );

  const reviewRequest = async (id: string, status: ServiceRequest["status"]) => {
    setError("");
    setNotice("");

    try {
      const response = (await serviceRequestsAPI.review(id, {
        status,
        adminResponse: responseDrafts[id] || "",
      })) as { success: boolean; serviceRequest: ServiceRequest };

      setRequests((current) =>
        current.map((request) => (request.id === id ? response.serviceRequest : request))
      );
      setNotice(`Request marked ${status}.`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review request.");
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const response = (await adminNotificationsAPI.markRead(id)) as {
        success: boolean;
        notification: AdminNotification;
      };

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? response.notification : notification
        )
      );
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Unable to update notification.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">Loading service requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Admin Queue
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">
              Service requests and notifications
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              New customer service requests appear here for review. Approvals create live service
              subscriptions automatically.
            </p>
          </div>
          <Link
            to="/renewals"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Open renewals
          </Link>
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
          ["Pending requests", pendingCount],
          ["Total requests", requests.length],
          ["Unread notifications", unreadNotifications.length],
          ["Total notifications", notifications.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Open service requests</h3>
          <div className="mt-5 space-y-4">
            {requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No service requests are waiting right now.
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-slate-950">
                        {request.requestedPlanName}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {request.customer?.name || "Customer"} | {request.customer?.customerCode || "No code"}
                      </div>
                      <div className="mt-3 text-sm text-slate-700">
                        Duration: {request.requestedDurationMonths} months
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        Expected amount: {formatCurrency(request.requestedAmount)}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        Submitted: {formatDate(request.createdAt)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  {request.notes ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      {request.notes}
                    </div>
                  ) : null}

                  <textarea
                    value={responseDrafts[request.id] || request.adminResponse || ""}
                    onChange={(event) =>
                      setResponseDrafts((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Optional response for the customer or your internal approval note."
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reviewRequest(request.id, "approved")}
                      className="rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewRequest(request.id, "fulfilled")}
                      className="rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50"
                    >
                      Mark fulfilled
                    </button>
                    <button
                      type="button"
                      onClick={() => reviewRequest(request.id, "rejected")}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50"
                    >
                      Reject
                    </button>
                    {request.customer ? (
                      <Link
                        to={`/customers/${request.customer.id}`}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-white"
                      >
                        View customer
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Admin notifications</h3>
          <div className="mt-5 space-y-3">
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-2xl border px-4 py-4 ${
                    notification.isRead
                      ? "border-slate-200 bg-slate-50"
                      : "border-cyan-200 bg-cyan-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {notification.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{notification.body}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatDate(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.isRead ? (
                      <button
                        type="button"
                        onClick={() => markNotificationRead(notification.id)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-white"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
