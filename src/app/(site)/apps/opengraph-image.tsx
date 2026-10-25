import { apps } from "@/data/apps";
import { ogContentType, ogSize, renderOgCard } from "@/lib/og";

export const alt = `London Zade — ZADE. ${apps.length} products, shipped and counting.`;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgCard({
    eyebrow: "ZADE",
    title: `${apps.length} products, shipped and counting.`,
    description: "Apps for aviation, AI, and everyday life.",
    path: "/apps",
  });
}
