export const metadata = {
  title: "Apps — London Zade",
  description: "Things I've built.",
};

interface AppItem {
  name: string;
  description: string;
  href: string;
}

const apps: AppItem[] = [
  {
    name: "Emailligence.ai",
    description: "AI-powered email intelligence and automation.",
    href: "https://emalligence.ai/",
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
      <h1 className="text-3xl font-bold tracking-tight mb-8">Apps</h1>
      <div>
        {apps.map((app) => (
          <a
            key={app.name}
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block py-4 border-b border-neutral-200 first:border-t transition-colors hover:opacity-70"
          >
            <p className="text-sm font-medium">{app.name}</p>
            <p className="text-sm text-muted mt-0.5">{app.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
