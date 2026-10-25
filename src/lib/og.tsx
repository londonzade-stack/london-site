import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Shared link-preview card for inner pages: charcoal + wireframe jet, matching the homepage card. */

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

const assets = join(process.cwd(), "src/assets/og");

interface OgCardInput {
  eyebrow: string;
  title: string;
  description?: string;
  path: string;
}

function Node({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: "#fff",
        boxShadow: "0 0 0 3px rgba(166, 243, 195, 0.18), 0 0 16px rgba(166, 243, 195, 0.75)",
      }}
    />
  );
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export async function renderOgCard({ eyebrow, title, description, path }: OgCardInput) {
  const [background, regular, semibold] = await Promise.all([
    readFile(join(assets, "background.png"), "base64"),
    readFile(join(assets, "geist-regular.ttf")),
    readFile(join(assets, "geist-semibold.ttf")),
  ]);
  const titleSize = title.length <= 20 ? 96 : title.length <= 44 ? 72 : 60;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#121314",
          color: "#f3f4f2",
          fontFamily: "Geist",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${background}`}
          width={ogSize.width}
          height={ogSize.height}
          alt=""
          style={{ position: "absolute", left: 0, top: 0 }}
        />
        <div
          style={{
            position: "absolute",
            left: 76,
            top: 64,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          <Node size={9} />
          London Zade
        </div>
        <div style={{ position: "absolute", left: 76, top: 172, display: "flex", flexDirection: "column", width: 780 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26, fontSize: 21, color: "#8d9196" }}>
            <Node size={7} />
            {eyebrow}
          </div>
          <div style={{ fontSize: titleSize, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.05em" }}>
            {clip(title, 70)}
          </div>
          {description && (
            <div style={{ marginTop: 28, maxWidth: 580, fontSize: 27, lineHeight: 1.4, color: "#9fa3a8" }}>
              {clip(description, 110)}
            </div>
          )}
        </div>
        {/* backed with the page colour so no background glyph touches the address */}
        <div
          style={{
            position: "absolute",
            left: 68,
            bottom: 56,
            padding: "4px 8px",
            borderRadius: 6,
            background: "#121314",
            fontSize: 21,
            color: "#8d9196",
            letterSpacing: "-0.01em",
          }}
        >
          {`londonzade.com${path}`}
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
