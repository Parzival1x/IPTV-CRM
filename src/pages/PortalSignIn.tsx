import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { customerPortalAuthService } from "../services/customerPortalAuth";

export default function PortalSignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await customerPortalAuthService.signIn(email, password, rememberMe);

    if (!result.success) {
      setError(result.error || "Unable to sign in to the customer portal.");
      setIsSubmitting(false);
      return;
    }

    const destination =
      (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/portal";
    navigate(destination, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-slate-200 bg-slate-950 px-8 py-10 text-white lg:rounded-l-[2rem] lg:border-b-0 lg:border-r lg:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
              Customer Portal
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Manage your IPTV account in one place.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Review your active services, check expiry dates, request new plans, and keep your
              portal access secure.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Active Services", "See exactly which services are live on your account."],
                ["Expiry Tracking", "Know what is due soon and avoid service interruption."],
                ["Service Requests", "Request upgrades or new services directly from the portal."],
                ["Admin Follow-up", "Your requests land in the admin queue automatically."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-8 py-10">
            <div className="mx-auto max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Secure Sign In
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                    Customer access
                  </h2>
                </div>
                <Link
                  to="/signin"
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Admin login
                </Link>
              </div>

              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">
                  Switching Roles?
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  This screen is for customers only. If you manage accounts, renewals, or service
                  requests, switch to the admin workspace.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/signin"
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Go To Admin Login
                  </Link>
                  <Link
                    to="/"
                    className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-white"
                  >
                    Back To Home
                  </Link>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  Keep me signed in on this device
                </label>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSubmitting ? "Signing in..." : "Open customer portal"}
                </button>
              </form>

              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                Customers receive portal access from the admin team. If you do not have login
                credentials yet, contact support or request a portal reset from the operator.
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/"
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
