import { Link } from "react-router-dom";

const accessCards = [
  {
    title: "Admin Console",
    description:
      "Manage customers, approve service requests, monitor renewals, reset portal passwords, and run day-to-day IPTV operations.",
    bullets: [
      "Customer directory and CRM actions",
      "Renewals, payment review, and admin queue",
      "Portal access resets and temporary credential export",
    ],
    ctaTo: "/signin",
    tone: "border-cyan-200 bg-cyan-50 text-cyan-900",
    accent:
      "group-hover:border-cyan-400/40 group-hover:bg-cyan-400/10 group-hover:shadow-cyan-950/20",
  },
  {
    title: "Customer Portal",
    description:
      "Review active services, check expiry dates, request a new plan, and update portal credentials without contacting the admin team for every small action.",
    bullets: [
      "See current IPTV and bundled services",
      "Request upgrades or additional services",
      "Track request history and change portal password",
    ],
    ctaTo: "/portal/signin",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    accent:
      "group-hover:border-emerald-400/40 group-hover:bg-emerald-400/10 group-hover:shadow-emerald-950/20",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] p-8 shadow-2xl lg:p-10">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
              StreamOps IPTV
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-white lg:text-6xl">
              Choose how you want to access the platform.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 lg:text-lg">
              The admin console is built for operations and support, while the customer portal is
              designed for subscribers who want to review services, request changes, and keep their
              account current.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {accessCards.map((card) => (
            <Link
              key={card.title}
              to={card.ctaTo}
              className={`group block rounded-[2rem] border border-slate-800 bg-slate-900 p-8 shadow-xl transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-cyan-400/20 ${card.accent}`}
            >
              <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${card.tone}`}>
                {card.title}
              </div>
              <p className="mt-5 text-base leading-7 text-slate-300">{card.description}</p>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-400">
                {card.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 transition group-hover:border-slate-700 group-hover:bg-slate-950/80"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex items-center justify-between gap-4 border-t border-slate-800 pt-5">
                <span className="text-sm font-medium text-slate-400 transition group-hover:text-slate-200">
                  Select this workspace
                </span>
                <span className="text-base text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                  →
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
