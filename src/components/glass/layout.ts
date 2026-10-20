/**
 * Pure layout math for the glass home. All coordinates are CSS pixels in
 * document space (x right, y down). The scene maps them 1:1 into world units.
 */

export type ShardId =
  | "nav"
  | "bio"
  | "jobs"
  | "apps"
  | "blog"
  | "companies"
  | "socials";

export type Vec2 = [number, number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShardLayout {
  id: ShardId;
  /** Shard outline (convex, already inset for the gaps). */
  poly: Vec2[];
  /** Box the HTML content occupies, inside the outline. */
  content: Rect;
  /** Fixed-height content that may need to scroll internally. */
  fixedHeight: boolean;
  /** Intro / stagger order. */
  order: number;
}

export type LayoutMode = "desktop" | "stacked";

export interface GlassLayout {
  mode: LayoutMode;
  width: number;
  height: number;
  /** Total scrollable document height. */
  docHeight: number;
  /** Pivot for the whole-composition tilt. */
  center: Vec2;
  shards: ShardLayout[];
}

/** Content cells, in reading order (nav is separate). */
export const CELL_ORDER: Exclude<ShardId, "nav">[] = [
  "bio",
  "jobs",
  "apps",
  "blog",
  "companies",
  "socials",
];

export function pickMode(width: number, height: number): LayoutMode {
  return width >= 1080 && height >= 640 ? "desktop" : "stacked";
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Polygon helpers (convex polygons only)
// ---------------------------------------------------------------------------

function signedArea(poly: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Shrink a convex polygon by `d` px on every edge. */
export function insetPolygon(poly: Vec2[], d: number): Vec2[] {
  const n = poly.length;
  const sign = signedArea(poly) >= 0 ? 1 : -1;
  // Offset line for each edge i (from poly[i] to poly[i+1]).
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = (sign * -dy) / len;
    const ny = (sign * dx) / len;
    return {
      p: [p[0] + nx * d, p[1] + ny * d] as Vec2,
      r: [dx, dy] as Vec2,
    };
  });
  return poly.map((_, i) => {
    const a = lines[(i - 1 + n) % n];
    const b = lines[i];
    const cross = a.r[0] * b.r[1] - a.r[1] * b.r[0];
    if (Math.abs(cross) < 1e-9) return b.p;
    const qpx = b.p[0] - a.p[0];
    const qpy = b.p[1] - a.p[1];
    const t = (qpx * b.r[1] - qpy * b.r[0]) / cross;
    return [a.p[0] + t * a.r[0], a.p[1] + t * a.r[1]] as Vec2;
  });
}

/** Horizontal extent of a convex polygon at height y, or null if outside. */
function sliceX(poly: Vec2[], y: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    if (ay === by) continue;
    if (y < Math.min(ay, by) || y > Math.max(ay, by)) continue;
    const x = ax + ((y - ay) / (by - ay)) * (bx - ax);
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return lo < hi ? [lo, hi] : null;
}

/**
 * Largest axis-aligned rectangle inside a convex polygon (grid search), then
 * shrunk by `pad`. For a convex polygon the slice bounds are extremal at the
 * ends of any y-range, so checking the two ends is exact.
 */
export function inscribedRect(poly: Vec2[], pad: number): Rect {
  const ys = poly.map((p) => p[1]);
  const yMin = Math.min(...ys) + 0.5;
  const yMax = Math.max(...ys) - 0.5;
  const N = 56;
  let best: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let bestArea = -1;
  const slices: ([number, number] | null)[] = [];
  for (let i = 0; i <= N; i++) slices.push(sliceX(poly, yMin + ((yMax - yMin) * i) / N));
  for (let i = 0; i < N; i++) {
    const s1 = slices[i];
    if (!s1) continue;
    for (let j = i + 1; j <= N; j++) {
      const s2 = slices[j];
      if (!s2) continue;
      const xl = Math.max(s1[0], s2[0]);
      const xr = Math.min(s1[1], s2[1]);
      if (xr <= xl) continue;
      const y1 = yMin + ((yMax - yMin) * i) / N;
      const y2 = yMin + ((yMax - yMin) * j) / N;
      const area = (xr - xl) * (y2 - y1);
      if (area > bestArea) {
        bestArea = area;
        best = { x: xl, y: y1, w: xr - xl, h: y2 - y1 };
      }
    }
  }
  return {
    x: best.x + pad,
    y: best.y + pad,
    w: Math.max(0, best.w - pad * 2),
    h: Math.max(0, best.h - pad * 2),
  };
}

export function pointInConvex(poly: Vec2[], x: number, y: number): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c === 0) continue;
    const s = c > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

export function centroid(poly: Vec2[]): Vec2 {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const f = x1 * y2 - x2 * y1;
    x += (x1 + x2) * f;
    y += (y1 + y2) * f;
    a += f;
  }
  if (Math.abs(a) < 1e-9) return poly[0];
  return [x / (3 * a), y / (3 * a)];
}

const rect = (x: number, y: number, w: number, h: number): Vec2[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

// ---------------------------------------------------------------------------
// Desktop: one screen, Voronoi-style shattered pane (like the reference video)
// ---------------------------------------------------------------------------

export function desktopLayout(width: number, height: number): GlassLayout {
  const margin = clamp(width * 0.04, 24, 64);
  const frameW = Math.min(width - margin * 2, 1320);
  const x0 = (width - frameW) / 2;
  const top = clamp(height * 0.03, 16, 28);
  const navH = 54;
  const gap = 12;
  const y0 = top + navH + gap;
  const rh = height - top - y0;

  const P = (u: number, v: number): Vec2 => [x0 + u * frameW, y0 + v * rh];
  const A = P(0, 0);
  const B = P(0.31, 0);
  const E = P(0.6, 0);
  const J = P(1, 0);
  const Hh = P(0.31 - 0.04 * 0.6, 0.6); // on segment B→C
  const G = P(0.585, 0.55);
  const L = P(1, 0.5);
  const N = P(0.8, 0.58);
  const D = P(0, 1);
  const C = P(0.27, 1);
  const I = P(0.57, 1);
  const O = P(0.785, 1);
  const K = P(1, 1);

  const cells: Record<Exclude<ShardId, "nav">, Vec2[]> = {
    bio: [A, B, C, D],
    jobs: [B, E, G, Hh],
    apps: [E, J, L, N, G],
    blog: [Hh, G, I, C],
    companies: [G, N, O, I],
    socials: [N, L, K, O],
  };

  const shards: ShardLayout[] = [
    {
      id: "nav",
      poly: rect(x0, top, frameW, navH),
      content: { x: x0 + 18, y: top + 7, w: frameW - 36, h: navH - 14 },
      fixedHeight: true,
      order: 0,
    },
  ];
  CELL_ORDER.forEach((id, i) => {
    const poly = insetPolygon(cells[id], gap / 2);
    shards.push({
      id,
      poly,
      content: inscribedRect(poly, 20),
      fixedHeight: true,
      order: i + 1,
    });
  });

  return {
    mode: "desktop",
    width,
    height,
    docHeight: height,
    center: [x0 + frameW / 2, top + (height - top * 2) / 2],
    shards,
  };
}

// ---------------------------------------------------------------------------
// Stacked: phones / small windows — a vertical strip of slanted panes
// ---------------------------------------------------------------------------

export function stackedLayout(
  width: number,
  height: number,
  measure: (id: ShardId, contentWidth: number) => number,
): GlassLayout {
  const colW = Math.min(width - 24, 620);
  const x0 = (width - colW) / 2;
  const top = 12;
  const navH = 52;
  const gap = 10;
  const pad = 20;
  const slant = 14;

  const shards: ShardLayout[] = [
    {
      id: "nav",
      poly: rect(x0, top, colW, navH),
      content: { x: x0 + 12, y: top + 6, w: colW - 24, h: navH - 12 },
      fixedHeight: true,
      order: 0,
    },
  ];

  const boundaries = CELL_ORDER.length;
  const s = (k: number) =>
    k === 0 || k === boundaries ? 0 : k % 2 ? slant : -slant;

  let Y = top + navH + gap;
  CELL_ORDER.forEach((id, i) => {
    const cw = colW - gap - pad * 2;
    const ch = Math.ceil(measure(id, cw));
    const sTop = s(i);
    const sBot = s(i + 1);
    const h = ch + pad * 2 + Math.abs(sTop) + Math.abs(sBot) + gap;
    const raw: Vec2[] = [
      [x0, Y + sTop],
      [x0 + colW, Y - sTop],
      [x0 + colW, Y + h - sBot],
      [x0, Y + h + sBot],
    ];
    shards.push({
      id,
      poly: insetPolygon(raw, gap / 2),
      content: {
        x: x0 + gap / 2 + pad,
        y: Y + Math.abs(sTop) + gap / 2 + pad,
        w: cw,
        h: ch,
      },
      fixedHeight: false,
      order: i + 1,
    });
    Y += h;
  });

  return {
    mode: "stacked",
    width,
    height,
    docHeight: Math.max(height, Y + 24),
    center: [width / 2, height / 2],
    shards,
  };
}
