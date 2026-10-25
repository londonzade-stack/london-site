import type { Metadata } from "next";

export const SITE_NAME = "London Zade";
export const SITE_DESCRIPTION = "Pilot, entrepreneur, and builder. Personal site of London Zade.";

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}

/**
 * Title, description, canonical URL and share tags for one page.
 * A page's `openGraph`/`twitter` objects replace the root layout's wholesale,
 * so the shared fields are repeated here rather than inherited.
 */
export function pageMetadata({ title, description, path, type = "website" }: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: SITE_NAME, type, locale: "en_US" },
    twitter: { card: "summary_large_image", title, description, creator: "@londonzade__" },
  };
}
