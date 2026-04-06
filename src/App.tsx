import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import CustomerProtectedRoute from "./components/CustomerProtectedRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import SignIn from "./pages/AuthPages/SignIn";
import CustomerDetail from "./pages/CustomerDetail";
import CustomerPortalDashboard from "./pages/CustomerPortalDashboard";
import Dashboard from "./pages/Dashboard";
import EditCustomer from "./pages/EditCustomer";
import AddCustomer from "./pages/Forms";
import HomePage from "./pages/HomePage";
import PaymentStatusReview from "./pages/PaymentStatusReview";
import PortalAccessAdmin from "./pages/PortalAccessAdmin";
import PortalSignIn from "./pages/PortalSignIn";
import Profile from "./pages/Profile";
import ServiceRequestsReview from "./pages/ServiceRequestsReview";
import Customers from "./pages/Tables";
import { authService, type AdminUser } from "./services/auth";

type NavigationItem = {
  label: string;
  to: string;
  description: string;
  shortLabel: string;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    description: "Track subscribers, revenue, and renewals.",
    shortLabel: "DB",
  },
  {
    label: "Customers",
    to: "/customers",
    description: "Browse and manage subscriber accounts.",
    shortLabel: "CU",
  },
  {
    label: "Renewals",
    to: "/renewals",
    description: "Review payment status, due dates, and expiry risk.",
    shortLabel: "RN",
  },
  {
    label: "Requests",
    to: "/service-requests",
    description: "Approve customer service requests and track admin alerts.",
    shortLabel: "RQ",
  },
  {
    label: "Portal Access",
    to: "/portal-access",
    description: "Reset customer portal passwords and export temporary credentials.",
    shortLabel: "PA",
  },
  {
    label: "Add Customer",
    to: "/customers/new",
    description: "Create new IPTV customer records.",
    shortLabel: "AC",
  },
  {
    label: "Account",
    to: "/profile",
    description: "Update your admin profile and security.",
    shortLabel: "ME",
  },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 0) {
    return "A";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getAvatarTone = (seed: string) => {
  const tones = [
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
  ];

  return tones[seed.charCodeAt(0) % tones.length];
};

const getPageTitle = (pathname: string) => {
  if (pathname === "/dashboard") {
    return "Operations Dashboard";
  }

  if (pathname === "/customers") {
    return "Customer Directory";
  }

  if (pathname === "/customers/new") {
    return "New Customer";
  }

  if (pathname === "/renewals") {
    return "Renewals And Payments";
  }

  if (pathname === "/service-requests") {
    return "Service Requests";
  }

  if (pathname === "/portal-access") {
    return "Portal Access";
  }

  if (pathname.startsWith("/customers/") && pathname.endsWith("/edit")) {
    return "Edit Customer";
  }

  if (pathname.startsWith("/customers/")) {
    return "Customer Profile";
  }

  if (pathname === "/profile") {
    return "Admin Account";
  }

  return "IPTV CRM";
};

const SIDEBAR_STORAGE_KEY = "streamops_sidebar_collapsed";

const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(
    authService.getCurrentUser()
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    const syncCurrentUser = () => {
      setCurrentUser(authService.getCurrentUser());
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    syncCurrentUser();
    window.addEventListener("storage", syncCurrentUser);
    window.addEventListener("auth:changed", syncCurrentUser);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("storage", syncCurrentUser);
      window.removeEventListener("auth:changed", syncCurrentUser);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        isSidebarCollapsed ? "true" : "false"
      );
    }
  }, [isSidebarCollapsed]);

  const activeItem = useMemo(
    () =>
      navigationItems.find((item) =>
        location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
      ),
    [location.pathname]
  );

  const handleSignOut = () => {
    authService.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={`border-b border-slate-200 bg-slate-950 text-slate-100 transition-all duration-300 lg:border-b-0 lg:border-r lg:border-slate-800 ${
            isSidebarCollapsed ? "lg:w-28" : "lg:w-80"
          }`}
        >
          <div className="flex h-full flex-col">
            <div
              className={`border-b border-slate-800 ${
                isSidebarCollapsed ? "px-4 py-6" : "px-6 py-6"
              }`}
            >
              <div
                className={`flex ${isSidebarCollapsed ? "justify-center" : "items-start gap-3"}`}
              >
                <Link to="/dashboard" className="block min-w-0 flex-1">
                  <div
                    className={`flex ${isSidebarCollapsed ? "justify-center" : "items-center gap-3"}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-lg font-semibold text-cyan-300">
                      SC
                    </div>
                    {!isSidebarCollapsed ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          IPTV CRM
                        </p>
                        <h1 className="text-xl font-semibold text-white">
                          StreamOps Console
                        </h1>
                      </div>
                    ) : null}
                  </div>
                  {!isSidebarCollapsed ? (
                    <p className="mt-4 text-sm leading-6 text-slate-400">
                      One place to manage subscriptions, renewals, and customer support.
                    </p>
                  ) : null}
                </Link>
              </div>
            </div>

            <nav className={`flex-1 ${isSidebarCollapsed ? "px-3 py-6" : "px-4 py-6"}`}>
              {!isSidebarCollapsed ? (
                <p className="px-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Workspace
                </p>
              ) : null}
              <div className="mt-4 space-y-2">
                {navigationItems.map((item) => {
                  const isActive =
                    location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`block rounded-2xl border transition ${
                        isActive
                          ? "border-cyan-400/30 bg-cyan-400/10 text-white"
                          : "border-transparent bg-slate-900/70 text-slate-300 hover:border-slate-800 hover:bg-slate-900"
                      } ${isSidebarCollapsed ? "px-3 py-3 text-center" : "px-4 py-4"}`}
                    >
                      {isSidebarCollapsed ? (
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-800/80 text-xs font-semibold tracking-[0.18em] text-slate-200">
                          {item.shortLabel}
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-semibold">{item.label}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {item.description}
                          </div>
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {!isSidebarCollapsed ? (
              <div className="border-t border-slate-800 px-6 py-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <p className="text-sm font-semibold text-white">Operations priorities</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-400">
                    <li>Keep expiring accounts visible every day.</li>
                    <li>Resolve failed payments before suspension.</li>
                    <li>Make customer records clean and searchable.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-800 px-3 py-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Focus
                </div>
              </div>
            )}

            <div className={`${isSidebarCollapsed ? "px-3 pb-5" : "px-6 pb-5"}`}>
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                className={`hidden w-full items-center rounded-2xl border border-slate-800 bg-slate-900/80 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 lg:flex ${
                  isSidebarCollapsed
                    ? "justify-center px-3 py-3"
                    : "justify-between px-4 py-3"
                }`}
                aria-label={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
                title={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
              >
                {isSidebarCollapsed ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                    Expand
                  </span>
                ) : (
                  <>
                    <span>Collapse navigation</span>
                    <span aria-hidden="true">←</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    {activeItem?.label ?? "Workspace"}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                    {getPageTitle(location.pathname)}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {activeItem?.description ??
                      "Manage customers, plans, renewals, and internal administration."}
                  </p>
                </div>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
                      getAvatarTone(currentUser?.name || "Admin")
                    }`}
                  >
                    {getInitials(currentUser?.name || "Admin User")}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {currentUser?.name || "Administrator"}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {currentUser?.email || "No session email"}
                    </div>
                  </div>
                </button>

                {isDropdownOpen ? (
                  <div className="absolute right-0 z-50 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    <Link
                      to="/profile"
                      className="block rounded-xl px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Manage account
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full rounded-xl px-4 py-3 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

const LegacyCustomerRedirect = ({ edit = false }: { edit?: boolean }) => {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/customers" replace />;
  }

  return <Navigate to={edit ? `/customers/${id}/edit` : `/customers/${id}`} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/portal/signin" element={<PortalSignIn />} />
        <Route
          path="/portal"
          element={
            <CustomerProtectedRoute>
              <CustomerPortalDashboard />
            </CustomerProtectedRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<AddCustomer />} />
          <Route path="/renewals" element={<PaymentStatusReview />} />
          <Route path="/service-requests" element={<ServiceRequestsReview />} />
          <Route path="/portal-access" element={<PortalAccessAdmin />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/customers/:id/edit" element={<EditCustomer />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="/forms" element={<Navigate to="/customers/new" replace />} />
          <Route path="/tables" element={<Navigate to="/customers" replace />} />
          <Route path="/settings" element={<Navigate to="/profile" replace />} />
          <Route path="/customer/:id" element={<LegacyCustomerRedirect />} />
          <Route path="/customer/:id/edit" element={<LegacyCustomerRedirect edit />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
