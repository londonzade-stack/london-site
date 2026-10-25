import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = "London Zade — Blog. Notes from the cockpit and the build.";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgCard({
    eyebrow: "Blog",
    title: "Notes from the cockpit and the build.",
    description: "Thoughts on flying, building, and everything in between.",
    path: "/blog",
  });
}
