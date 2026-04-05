import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { healthAPI } from "../../services/api";
import { authService } from "../../services/auth";

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDevelopment = import.meta.env.DEV;
  const [formData, setFormData] = useState({
    email: isDevelopment ? "admin@example.com" : "",
    password: isDevelopment ? "admin123" : "",
    rememberMe: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">(
    "checking"
  );

  const checkBackendStatus = async () => {
    try {
      await healthAPI.check();
      setBackendStatus("online");
    } catch {
      setBackendStatus("offline");
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  useEffect(() => {
    authService.validateSession().then((isValid) => {
      if (isValid) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await authService.signIn(
      formData.email,
      formData.password,
      formData.rememberMe
    );

    if (result.success) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
      setIsLoading(false);
      return;
    }

    setError(result.error || "Sign in failed.");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 shadow-2xl lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hidden border-r border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_40%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-lg font-semibold text-cyan-300">
                SC
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">IPTV CRM</p>
                <h1 className="text-3xl font-semibold text-white">StreamOps Console</h1>
              </div>
            </div>

            <div className="mt-14 max-w-xl">
              <h2 className="text-5xl font-semibold leading-tight text-white">
                Run subscriptions, renewals, and customer support from one place.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Sign in to manage active lines, expired accounts, payment follow-ups,
                and customer records without the leftover template clutter.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Customers", "Track subscriber records and device details."],
              ["Renewals", "Keep expiring services visible every day."],
              ["Ops", "Give staff a clean, production-ready admin surface."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center bg-white px-6 py-10 text-slate-900 sm:px-10">
          <div className="w-full max-w-md">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                Admin sign in
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Access the IPTV operations workspace
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Use your administrator credentials to continue.
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">
                Switching Roles?
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                This screen is only for administrators and staff. Customers should use the
                customer portal sign-in instead.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/portal/signin"
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Go To Customer Login
                </Link>
                <Link
                  to="/"
                  className="rounded-2xl border border-cyan-200 px-4 py-3 text-sm font-medium text-cyan-700 transition hover:bg-white"
                >
                  Back To Home
                </Link>
              </div>
            </div>

            <div
              className={`mt-8 rounded-2xl border p-4 text-sm ${
                backendStatus === "online"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : backendStatus === "offline"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {backendStatus === "checking" ? "Checking backend availability..." : null}
              {backendStatus === "online"
                ? "Backend online. You can sign in with your administrator account."
                : null}
              {backendStatus === "offline"
                ? "Backend offline. Start the API server before attempting to sign in."
                : null}
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  placeholder="admin@yourcompany.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  placeholder="Enter your password"
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                Keep this session signed in on this device
              </label>

              <button
                type="submit"
                disabled={isLoading || backendStatus === "offline"}
                className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-500">
              <p>Need access? Ask an administrator to create your account.</p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  to="/"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-50"
                >
                  Home
                </Link>
                <button
                  type="button"
                  onClick={checkBackendStatus}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-50"
                >
                  Recheck backend
                </button>
              </div>
            </div>

            {isDevelopment ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Development helper: default admin credentials are pre-filled for local work.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SignIn;
