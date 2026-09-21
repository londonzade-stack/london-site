"use client";

import { useTheme } from "next-themes";

/**
 * Icon visibility is driven purely by the `.dark` class on <html> (via the
 * `dark:` variant), so there's no mounted-state effect and no hydration flash.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="ml-auto flex h-8 w-8 items-center justify-center border border-border text-muted transition-all hover:border-accent hover:text-accent hover:shadow-[0_0_12px_var(--accent-glow)]"
    >
      {/* Sun icon — shown in dark mode */}
      <svg
        className="hidden h-4 w-4 dark:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        />
      </svg>
      {/* Moon icon — shown in light mode */}
      <svg
        className="block h-4 w-4 dark:hidden"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        />
      </svg>
    </button>
  );
}
