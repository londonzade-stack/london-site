// Renders the animated homepage share card (scripts/og/anim.html) into:
//   public/og/home.mp4            — og:video (6s, 1200x630, 60fps, silent H.264)
//   src/app/opengraph-image.png   — og:image, the clip's final frame
//
// One-off tooling, deliberately not in package.json:
//   npm i --no-save puppeteer-core ffmpeg-static && node scripts/og/render.mjs
// Needs Google Chrome (override the path with CHROME_PATH).

import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, copyFileSync, cpSync, mkdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import puppeteer from "puppeteer-core";
import ffmpeg from "ffmpeg-static";

const ROOT = process.cwd();
const FPS = 60, SECONDS = 6, W = 1200, H = 630;
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf" };
const KEEP = process.env.KEEP_FRAMES; // optional: a NEW directory to copy the PNG frames into, for QA
if (KEEP && existsSync(KEEP)) throw new Error(`KEEP_FRAMES target already exists: ${KEEP}`);

// anim.html from scripts/og, fonts from src/assets/og, everything else (kit, three.js) from public/
const server = createServer((req, res) => {
  let path;
  try { path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, ""); } catch { return res.writeHead(400).end(); }
  const file = path === "/anim.html" ? join(ROOT, "scripts/og/anim.html")
    : path.startsWith("/fonts/") ? join(ROOT, "src/assets/og", path.slice(7))
    : join(ROOT, "public", path);
  if (!existsSync(file) || !statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(readFileSync(file));
}).listen(0, "127.0.0.1");
const port = await new Promise((r) => server.on("listening", () => r(server.address().port)));

const frames = mkdtempSync(join(tmpdir(), "og-frames-"));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--use-angle=metal", "--enable-gpu", "--force-color-profile=srgb"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]); // the kit skips its draw intro otherwise
  // Virtual clock: rAF callbacks and performance.now only advance when we step a frame.
  await page.evaluateOnNewDocument(() => {
    let now = 0;
    const queue = [];
    window.requestAnimationFrame = (cb) => queue.push(cb);
    window.cancelAnimationFrame = () => {};
    performance.now = () => now;
    window.__frame = (t, stepMs) => {
      window.__render(t);
      now += stepMs;
      for (const cb of queue.splice(0)) cb(now);
      window.__afterTick(t);
    };
  });
  await page.goto(`http://127.0.0.1:${port}/anim.html`, { waitUntil: "networkidle0" });
  // interval polling: the default rAF polling would wait on the virtual clock forever
  await page.waitForFunction(() => window.__ready === true, { timeout: 30000, polling: 50 });
  await new Promise((r) => setTimeout(r, 400)); // let the kit's IntersectionObserver mark its stages visible

  const total = FPS * SECONDS;
  for (let f = 0; f < total; f++) {
    await page.evaluate((t, step) => window.__frame(t, step), f / FPS, 1000 / FPS);
    await page.screenshot({ path: join(frames, `f${String(f).padStart(4, "0")}.png`) });
  }

  mkdirSync(join(ROOT, "public/og"), { recursive: true });
  execFileSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(FPS), "-i", join(frames, "f%04d.png"),
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-preset", "veryslow", "-crf", "20", "-tune", "animation",
    "-profile:v", "high", "-level:v", "4.0",
    "-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-colorspace", "bt709", // sRGB transfer, like the captured frames
    "-movflags", "+faststart", "-an",
    join(ROOT, "public/og/home.mp4"),
  ]);
  copyFileSync(join(frames, `f${String(total - 1).padStart(4, "0")}.png`), join(ROOT, "src/app/opengraph-image.png"));
  if (KEEP) cpSync(frames, KEEP, { recursive: true });
  console.log(`Rendered ${total} frames → public/og/home.mp4 + src/app/opengraph-image.png`);
} finally {
  await browser.close();
  server.close();
  rmSync(frames, { recursive: true, force: true });
}
