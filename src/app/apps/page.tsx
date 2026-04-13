export const metadata = {
  title: "Apps — London Zade",
  description: "Things I've built.",
};

interface AppItem {
  name: string;
  description: string;
  href: string;
}

// Add your apps here
const apps: AppItem[] = [
  // Example:
  // {
  //   name: "App Name",
  //   description: "A short description of what it does.",
  //   href: "https://example.com",
  // },
];

export default function AppsPage() {
  if (apps.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Apps</h1>
        <p className="text-muted">Apps coming soon.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-8">Apps</h1>
      <div className="space-y-1">
        {apps.map((app) => (
          <a
            key={app.name}
            href={app.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start justify-between gap-4 py-3 border-b border-border group"
          >
            <div>
              <p className="font-medium text-sm group-hover:text-muted transition-colors">
                {app.name}
              </p>
              <p className="text-sm text-muted">{app.description}</p>
            </div>
            <span className="text-sm text-muted shrink-0">&rarr;</span>
          </a>
        ))}
      </div>
    </div>
  );
}
