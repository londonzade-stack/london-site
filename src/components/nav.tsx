"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/apps", label: "ZADE" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="mb-14 sm:mb-16">
      <div className="flex items-center gap-5 sm:gap-7">
        {/* Mark */}
        <Link
          href="/"
          aria-label="Home"
          className="group flex items-center gap-2 font-display text-sm font-bold tracking-[0.2em]"
        >
          <span className="block h-2 w-2 bg-accent shadow-[0_0_10px_var(--accent-glow)] transition-transform group-hover:scale-125" />
          LZ
        </Link>

        {/* Links */}
        <div className="flex items-center gap-4 sm:gap-6">
          {links.map(({ href, label }, i) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex items-baseline gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`text-[9px] ${
                    isActive ? "text-accent" : "text-muted/60"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {label}
                <span
                  className={`absolute -bottom-1.5 left-0 h-px bg-accent transition-all duration-200 ${
                    isActive ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        <ThemeToggle />
      </div>
      <div className="mt-5 h-px w-full bg-border" />
    </nav>
  );
}
