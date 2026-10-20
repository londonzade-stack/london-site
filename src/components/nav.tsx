"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/apps", label: "ZADE" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="site-nav glass-surface">
      <Link href="/" className="site-mark" aria-label="London Zade — home">
        <span className="site-mark-dot" aria-hidden="true" />
        London Zade
      </Link>
      <nav className="site-links" aria-label="Primary">
        {links.map(({ href, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={isActive ? "page" : undefined}>
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
