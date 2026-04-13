export const metadata = {
  title: "Apps — London Zade",
  description: "Things I've built.",
};

interface AppItem {
  name: string;
  description: string;
  href: string;
  tag: string;
}

const apps: AppItem[] = [
  {
    name: "Zade Aviation",
    description:
      "Contract pilots, aircraft management, and flight instruction nationwide.",
    href: "https://www.zadeaviation.co/",
    tag: "Aviation",
  },
  {
    name: "Crossing Map",
    description:
      "Interactive map to explore over 200,000 railroad grade crossings across America.",
    href: "https://www.crossingmap.com/",
    tag: "Maps",
  },
  {
    name: "Vinnnn",
    description:
      "Rapid vehicle identification and parts compatibility lookup from any VIN.",
    href: "https://vinnnn.com/",
    tag: "Auto",
  },
  {
    name: "Notivated",
    description:
      "Unified workspace for managing notes, tasks, and calendar events.",
    href: "https://notivated.com/",
    tag: "Productivity",
  },
  {
    name: "Demography Pro",
    description:
      "Demographic, economic, and local data for Florida counties using Census data.",
    href: "https://demographypro.com/",
    tag: "Data",
  },
  {
    name: "AI Budget Killer",
    description:
      "AI financial coach that helps manage debts, savings, and expenses.",
    href: "https://aibudgetkiller.com/",
    tag: "Finance",
  },
  {
    name: "Due Dates",
    description:
      "Minimalist tracker for flight renewals, medicals, and certifications.",
    href: "https://v0-due-date-website.vercel.app/",
    tag: "Aviation",
  },
  {
    name: "Stockyyy",
    description: "Analyze stock market data with contextual intelligence.",
    href: "https://stockyyy.com/",
    tag: "Finance",
  },
  {
    name: "Budgyyy",
    description:
      "Interactive budget tracker — input income and expenses across 12 months.",
    href: "https://budgyyy.com/budget",
    tag: "Finance",
  },
];

export default function AppsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Apps</h1>
      <p className="text-muted mb-8">Things I&apos;ve built.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {apps.map((app) => (
          <a
            key={app.name}
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 transition-all hover:bg-neutral-100/80 hover:border-neutral-300 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold group-hover:text-foreground">
                  {app.name}
                </h2>
                <span className="text-[11px] font-medium text-muted bg-white border border-neutral-200 rounded-full px-2 py-0.5">
                  {app.tag}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                {app.description}
              </p>
            </div>
            <div className="mt-3 flex items-center text-xs font-medium text-muted group-hover:text-foreground transition-colors">
              Visit
              <svg
                className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                />
              </svg>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
