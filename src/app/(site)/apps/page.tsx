import { APPS_LINKED, apps } from "@/data/apps";

export const metadata = {
  title: "ZADE — London Zade",
  description: "Things I've built.",
};

export default function AppsPage() {
  return (
    <div>
      <header className="page-head">
        <h1 className="page-title">ZADE</h1>
        <p className="page-sub">Things I&apos;ve built &mdash; {apps.length} apps and counting.</p>
      </header>
      <ul className="panel glass-surface">
        {apps.map((app) => {
          const body = (
            <>
              <span className="list-row-main">
                <span className="list-row-title">{app.name}</span>
                <span className="list-row-desc">{app.description}</span>
              </span>
              {APPS_LINKED && (
                <span className="list-row-arrow" aria-hidden="true">
                  &#8599;
                </span>
              )}
            </>
          );
          return (
            <li key={app.name}>
              {APPS_LINKED ? (
                <a href={app.href} target="_blank" rel="noopener noreferrer" className="list-row">
                  {body}
                </a>
              ) : (
                <div className="list-row">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
