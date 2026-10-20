"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { GlassSceneHandle } from "./scene";

/**
 * Serializes scene lifecycles so a StrictMode remount (or fast back/forward
 * navigation) never has two engines writing to the same DOM at once.
 */
let lifecycle: Promise<unknown> = Promise.resolve();

export function GlassStage({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const camRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const host = hostRef.current;
    const view = viewRef.current;
    const cam = camRef.current;
    const spacer = spacerRef.current;
    if (!root || !host || !view || !cam || !spacer) return;
    // Tells the pre-paint script the app booted, so it won't force the fallback.
    (window as Window & { __glassBoot?: boolean }).__glassBoot = true;

    if (document.documentElement.dataset.glass !== "3d") {
      root.dataset.mode = "fallback";
      return;
    }

    let cancelled = false;
    let handle: GlassSceneHandle | null = null;

    const fallback = (reason: string) => {
      if (cancelled) return;
      console.warn(`[glass] using fallback layout: ${reason}`);
      cancelled = true;
      handle?.dispose();
      handle = null;
      root.dataset.mode = "fallback";
    };

    const timer = window.setTimeout(() => {
      if (!handle) fallback("scene took too long to start");
    }, 9000);

    const run = lifecycle.then(async () => {
      if (cancelled) return null;
      const { createGlassScene } = await import("./scene");
      if (cancelled) return null;
      return createGlassScene({ root, host, view, cam, spacer, onFail: fallback });
    });

    lifecycle = run.then(
      (h) => {
        if (!h) return;
        if (cancelled) {
          h.dispose();
          return;
        }
        handle = h;
        window.clearTimeout(timer);
        root.dataset.mode = "3d";
      },
      (err) => fallback(err instanceof Error ? err.message : String(err)),
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      handle?.dispose();
      handle = null;
      delete root.dataset.mode;
    };
  }, []);

  return (
    <div ref={rootRef} className="glass-home">
      <div ref={hostRef} className="glass-canvas-host" aria-hidden="true" />
      <div className="glass-loader" aria-hidden="true">
        <span className="glass-loader-dot" />
        Loading glass
      </div>
      <div ref={viewRef} className="glass-view">
        <div ref={camRef} className="glass-cam">
          {children}
        </div>
      </div>
      <div ref={spacerRef} className="glass-spacer" aria-hidden="true" />
    </div>
  );
}
