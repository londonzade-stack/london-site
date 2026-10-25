"use client";

import { useEffect } from "react";

type Anchor = { x: number; y: number; alpha?: number } | null;
type Layer = {
  setProgress: (p: number) => Layer;
  destroy: () => void;
  anchor?: (name: string, offset?: [number, number]) => () => Anchor;
};
type ScrollHandle = { destroy: () => void };
type TechBioAPI = {
  wireframe: (el: string | Element, o: object) => Layer;
  glyphField: (el: string | Element, o: object) => Layer;
  strands: (el: string | Element, o: object) => Layer;
  scroll: (el: string | Element, cb: (p: number) => void, o?: object) => ScrollHandle;
};

declare global {
  interface Window {
    TechBio?: TechBioAPI;
    TECHBIO_THREE_URL?: string;
  }
}

let kitPromise: Promise<TechBioAPI> | null = null;

/** Loads the self-hosted visual kit (and, through it, self-hosted three.js r160). */
function loadKit(): Promise<TechBioAPI> {
  if (window.TechBio) return Promise.resolve(window.TechBio);
  if (!kitPromise) {
    kitPromise = new Promise((resolve, reject) => {
      window.TECHBIO_THREE_URL = "/vendor/three-0.160.0.module.min.js";
      const s = document.createElement("script");
      s.src = "/techbio-kit.js";
      s.async = true;
      s.onload = () => (window.TechBio ? resolve(window.TechBio) : reject(new Error("kit missing")));
      s.onerror = () => {
        kitPromise = null;
        reject(new Error("kit failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return kitPromise;
}

const CALLOUTS: [string, string, [number, number]][] = [
  ["tb-c1", "cockpit", [26, -54]],
  ["tb-c2", "tail", [-250, -40]],
  ["tb-c3", "wingtipL", [-250, 64]],
];

export function HomeEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tb");
    if (!root) return;
    root.classList.add("tb-js");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const cleanups: (() => void)[] = [];
    const layers: Layer[] = [];
    const scrolls: ScrollHandle[] = [];
    let cancelled = false;
    let raf = 0;

    // Nav gets a backdrop once you scroll.
    const nav = root.querySelector(".tb-nav");
    const onNav = () => nav?.classList.toggle("scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onNav, { passive: true });
    onNav();
    cleanups.push(() => window.removeEventListener("scroll", onNav));

    // Sections lift in as they enter (content is fully visible without JS).
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // Experience: the route line fills and waypoints light up as you scroll.
    const route = root.querySelector<HTMLElement>(".route");
    const fill = root.querySelector<HTMLElement>(".route-line i");
    const stops = route ? Array.from(route.querySelectorAll<HTMLElement>(".stop")) : [];
    const onRoute = () => {
      if (!route || !fill) return;
      const r = route.getBoundingClientRect();
      const line = window.innerHeight * 0.62;
      const p = Math.max(0, Math.min(1, (line - r.top) / r.height));
      fill.style.setProperty("--p", `${(p * 100).toFixed(2)}%`);
      stops.forEach((s) => {
        const b = s.getBoundingClientRect();
        s.classList.toggle("hit", b.top + b.height / 2 < line);
      });
    };
    window.addEventListener("scroll", onRoute, { passive: true });
    window.addEventListener("resize", onRoute);
    onRoute();
    cleanups.push(() => {
      window.removeEventListener("scroll", onRoute);
      window.removeEventListener("resize", onRoute);
    });

    loadKit()
      .then((TB) => {
        if (cancelled) return;
        const intro = (name: string) => (reduce ? "none" : name);
        const hero = root.querySelector<HTMLElement>(".hero");

        const jet = TB.wireframe("#tb-jet", {
          model: "jet",
          x: mobile ? 0.5 : 0.66,
          y: mobile ? 0.8 : 0.5,
          size: mobile ? 1.05 : 0.98,
          drift: 1,
          parallax: 1,
          intro: intro("draw"),
          introDuration: 2.8,
          progressRotation: [0.18, -0.6, 0.12],
          progressOffset: [0.12, -0.32],
          progressScale: 1.12,
        });
        layers.push(jet);
        layers.push(TB.glyphField("#tb-glyphs", { shape: "sphere", x: 0.3, y: 0.9, size: 1.6, opacity: 0.6, intro: intro("fade") }));
        if (!mobile) {
          layers.push(TB.strands("#tb-spine", { kind: "spine", from: "right", size: 1.05, opacity: 0.55, intro: intro("grow") }));
        }
        if (hero) scrolls.push(TB.scroll(hero, (p) => jet.setProgress(p), { mode: "exit" }));

        // Role callouts pinned to points on the jet.
        if (!mobile && hero && jet.anchor) {
          const pins = CALLOUTS.map(([id, name, off]) => ({ el: document.getElementById(id), at: jet.anchor!(name, off) }));
          const place = () => {
            const r = hero.getBoundingClientRect();
            pins.forEach(({ el, at }) => {
              const a = at();
              if (!el || !a) return;
              el.style.left = `${a.x - r.left}px`;
              el.style.top = `${a.y - r.top}px`;
            });
            raf = requestAnimationFrame(place);
          };
          raf = requestAnimationFrame(place);
          const t = window.setTimeout(() => {
            pins.forEach(({ el }, i) => window.setTimeout(() => el?.classList.add("on"), i * 260));
          }, reduce ? 0 : 1900);
          cleanups.push(() => window.clearTimeout(t));
        }

        layers.push(TB.wireframe("#tb-now-1", { model: "jet", x: 0.74, y: 0.3, size: 0.52, opacity: 0.55, intro: intro("draw") }));
        layers.push(TB.wireframe("#tb-now-2", { model: "laptop", x: 0.78, y: 0.32, size: 0.5, opacity: 0.55, intro: intro("draw") }));
        layers.push(TB.glyphField("#tb-now-3", { shape: "sphere", x: 0.85, y: 0.15, size: 0.9, opacity: 0.45 }));

        if (!mobile) {
          const lap = TB.wireframe("#tb-laptop", { model: "laptop", x: 0.6, y: 0.55, size: 0.75, opacity: 0.8, progressRotation: [0, 0.7, 0] });
          layers.push(lap);
          const zade = document.getElementById("zade");
          if (zade) scrolls.push(TB.scroll(zade, (p) => lap.setProgress(p)));
        }
        layers.push(TB.glyphField("#tb-co-1", { shape: "sphere", x: 0.9, y: 0.2, size: 1.0, opacity: 0.4 }));
        layers.push(TB.wireframe("#tb-co-2", { model: "jet", x: 0.78, y: 0.36, size: 0.55, opacity: 0.45 }));
        layers.push(TB.glyphField("#tb-footer-glyphs", { shape: "sphere", x: 0.5, y: 0.6, size: 1.5, opacity: 0.55 }));
      })
      .catch((err) => console.warn("[home] visuals unavailable:", err));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      scrolls.forEach((s) => s.destroy());
      layers.forEach((l) => l.destroy());
      cleanups.forEach((fn) => fn());
      root.classList.remove("tb-js");
    };
  }, []);

  return null;
}
