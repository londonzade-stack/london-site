import type { Metadata } from "next";

export const SITE_URL = "https://www.londonzade.com";
export const SITE_NAME = "London Zade";
export const SITE_DESCRIPTION = "Pilot, entrepreneur, and builder. Personal site of London Zade.";

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  /** URL path of a 1200x630 MP4 in /public, sent as og:video. iMessage autoplays it; apps that ignore og:video show og:image. */
  video?: string;
}

/**
 * Title, description, canonical URL and share tags for one page.
 * A page's `openGraph`/`twitter` objects replace the root layout's wholesale,
 * so the shared fields are repeated here rather than inherited.
 */
export function pageMetadata({ title, description, path, type = "website", video }: PageMetaInput): Metadata {
  // Next resolves image URLs against metadataBase but not video URLs, so make them absolute here.
  const videoUrl = video && new URL(video, SITE_URL).href;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
      ...(videoUrl && { videos: [{ url: videoUrl, secureUrl: videoUrl, type: "video/mp4", width: 1200, height: 630 }] }),
    },
    twitter: { card: "summary_large_image", title, description, creator: "@londonzade__" },
  };
}
