export const metadata = {
  title: "ZADE — London Zade",
  description: "Things I've built.",
};

interface AppItem {
  name: string;
  description: string;
  href: string;
}

const apps: AppItem[] = [
  {
    name: "3D Brick Builder",
    description:
      "AI that turns any prompt into a buildable LEGO-compatible model with a parts list and step-by-step instructions.",
    href: "https://3dbrickbuilder.com/",
  },
  {
    name: "Fly Zade",
    description:
      "Owner-first aircraft management under Part 91 — maintenance oversight, crew coordination, hangar and records.",
    href: "https://flyzade.com/",
  },
  {
    name: "Zade's UAV",
    description:
      "FAA Part 107 drone photography and 4K video for roof, building, and property inspections.",
    href: "https://zadesuav.com/",
  },
  {
    name: "Perfect Barndo",
    description:
      "Custom home, barndo, and garage builder — describe your building and get a concept model in seconds.",
    href: "https://perfectbarndo.com/",
  },
  {
    name: "Emailligence.ai",
    description:
      "AI-powered email management — search, draft, organize, and analyze your inbox.",
    href: "https://emailligence.ai/",
  },
  {
    name: "Fly Listings",
    description:
      "Aircraft sales marketplace with free listings and full-service brokerage.",
    href: "https://flylistings.com/",
  },
  {
    name: "Zade Aviation",
    description:
      "Contract pilots, aircraft management, and flight instruction nationwide.",
    href: "https://www.zadeaviation.co/",
  },
  {
    name: "Crossing Map",
    description:
      "Interactive map to explore over 200,000 railroad grade crossings across America.",
    href: "https://www.crossingmap.com/",
  },
  {
    name: "Vinnnn",
    description:
      "Rapid vehicle identification and parts compatibility lookup from any VIN.",
    href: "https://vinnnn.com/",
  },
  {
    name: "Notivated",
    description:
      "Unified workspace for managing notes, tasks, and calendar events.",
    href: "https://notivated.com/",
  },
  {
    name: "Demography Pro",
    description:
      "Demographic, economic, and local data for Florida counties using Census data.",
    href: "https://demographypro.com/",
  },
  {
    name: "AI Budget Killer",
    description:
      "AI financial coach that helps manage debts, savings, and expenses.",
    href: "https://aibudgetkiller.com/",
  },
  {
    name: "Due Dates",
    description:
      "Minimalist tracker for flight renewals, medicals, and certifications.",
    href: "https://v0-due-date-website.vercel.app/",
  },
  {
    name: "Stockyyy",
    description: "Analyze stock market data with contextual intelligence.",
    href: "https://stockyyy.com/",
  },
  {
    name: "Budgyyy",
    description:
      "Interactive budget tracker — input income and expenses across 12 months.",
    href: "https://budgyyy.com/budget",
  },
  {
    name: "wheretheparkingat",
    description:
      "Discover and compare parking spots near you with real-time availability and pricing.",
    href: "https://parknear-xi.vercel.app/search",
  },
];

export default function AppsPage() {
  return (
    <div>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="label mb-3">
            <span className="text-accent">//</span> Index
          </p>
          <h1 className="font-display text-5xl sm:text-6xl font-bold uppercase tracking-tight leading-[0.95]">
            ZADE
          </h1>
        </div>
        <span className="font-mono text-[11px] tracking-[0.18em] text-muted pb-1">
          {String(apps.length).padStart(2, "0")} ENTRIES
        </span>
      </div>
      <div className="border-t border-border">
        {apps.map((app, i) => (
          <a
            key={app.name}
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-start gap-4 sm:gap-5 py-5 border-b border-border transition-colors hover:bg-highlight -mx-4 px-4 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-accent before:origin-top before:scale-y-0 before:transition-transform before:duration-200 hover:before:scale-y-100"
          >
            <span className="w-6 shrink-0 pt-0.5 font-mono text-[11px] tracking-[0.14em] text-muted/60 group-hover:text-accent transition-colors">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium tracking-tight">
                {app.name}
              </p>
              <p className="text-sm text-muted mt-1">{app.description}</p>
            </div>
            <span className="shrink-0 pt-0.5 text-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
              &#8599;
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
