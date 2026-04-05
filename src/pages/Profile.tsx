import { useEffect, useState } from "react";
import { authService, type AdminUser } from "../services/auth";

type Notice = {
  type: "success" | "error";
  text: string;
} | null;

const formatDateTime = (value?: Date | string) => {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
};

export default function Profile() {
  const [user, setUser] = useState<AdminUser | null>(authService.getCurrentUser());
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setProfileForm({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
    });
  }, []);

  const handleProfileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileNotice(null);
    setIsSavingProfile(true);

    const result = await authService.updateProfile({
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
    });

    if (!result.success || !result.user) {
      setProfileNotice({
        type: "error",
        text: result.error || "Unable to save profile changes.",
      });
      setIsSavingProfile(false);
      return;
    }

    setUser(result.user);
    setProfileForm({
      name: result.user.name,
      email: result.user.email,
    });
    setProfileNotice({
      type: "success",
      text: "Account profile updated successfully.",
    });
    setIsSavingProfile(false);
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordNotice(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordNotice({
        type: "error",
        text: "New password must be at least 6 characters long.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordNotice({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    setIsSavingPassword(true);
    const result = await authService.changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword
    );

    if (!result.success) {
      setPasswordNotice({
        type: "error",
        text: result.error || "Unable to change password.",
      });
      setIsSavingPassword(false);
      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordNotice({
      type: "success",
      text: "Password updated successfully.",
    });
    setIsSavingPassword(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Account profile
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">
            Administrator details
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Keep your contact information accurate so audit trails and notifications stay useful.
          </p>

          {profileNotice ? (
            <div
              className={`mt-6 rounded-2xl border p-4 text-sm ${
                profileNotice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {profileNotice.text}
            </div>
          ) : null}

          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="name">
                Full name
              </label>
              <input
                id="name"
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Security
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">Change password</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use a unique password for the admin console and rotate it when staff access changes.
          </p>

          {passwordNotice ? (
            <div
              className={`mt-6 rounded-2xl border p-4 text-sm ${
                passwordNotice.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {passwordNotice.text}
            </div>
          ) : null}

          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-5">
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="currentPassword"
              >
                Current password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                required
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="newPassword"
              >
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                required
              />
            </div>

            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="confirmPassword"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
            >
              {isSavingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            Session
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">Current access</h3>
          <dl className="mt-6 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <dt className="text-sm text-slate-500">Role</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {user?.role || "Administrator"}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <dt className="text-sm text-slate-500">Last login</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateTime(user?.lastLogin)}
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <dt className="text-sm text-slate-500">Account created</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateTime(user?.createdAt)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Operational checklist</h3>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
            <li>Review expiring subscriptions from the dashboard every morning.</li>
            <li>Rotate admin passwords when staff access changes.</li>
            <li>Keep admin contact emails current for alerts and invoices.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
