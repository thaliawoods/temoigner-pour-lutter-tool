"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAllReferences } from "@/lib/references";
import type { TPLReference, TPLMedia } from "@/lib/schema";
import { buildPublicUrl, preloadPublicImage } from "@/lib/public-url";

type MediaItem = {
  type: "image";
  path: string;
};

type Tile = {
  id: string;
  media: MediaItem;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
};

type View = { x: number; y: number; scale: number };

type DragState = {
  id: string;
  startX: number;
  startY: number;
  tileX: number;
  tileY: number;
};

type ResizeState = {
  id: string;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

type PanState = {
  startX: number;
  startY: number;
  viewX: number;
  viewY: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function seeded01(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function pushIfImage(out: MediaItem[], m: TPLMedia | undefined | null) {
  if (!m) return;
  if (m.kind === "image") out.push({ type: "image", path: m.src });
}

function pickImageMediasFromRefs(refs: TPLReference[]): MediaItem[] {
  const out: MediaItem[] = [];

  for (const r of refs) {
    pushIfImage(out, r.media);
    for (const m of r.mediaGallery ?? []) pushIfImage(out, m);
  }

  const uniq = new Map<string, MediaItem>();
  for (const m of out) uniq.set(m.path, m);
  return [...uniq.values()];
}

/**
 * Fit view + "boost" pour arriver plus zoomé.
 * Reset view revient exactement à cette view.
 */
function fitViewToTiles(tiles: Tile[], viewportW: number, viewportH: number): View {
  if (tiles.length === 0) return { x: 0, y: 0, scale: 1 };

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const t of tiles) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + t.w);
    maxY = Math.max(maxY, t.y + t.h);
  }

  const contentW = Math.max(1, maxX - minX);
  const contentH = Math.max(1, maxY - minY);

  const pad = viewportW > 900 ? 80 : 56;

  const scaleX = (viewportW - pad * 2) / contentW;
  const scaleY = (viewportH - pad * 2) / contentH;

  const rawScale = Math.min(scaleX, scaleY) * 1.34;
  const scale = clamp(rawScale, 0.35, 2.2);

  const x = (viewportW - contentW * scale) / 2 - minX * scale;
  const y = (viewportH - contentH * scale) / 2 - minY * scale;

  return { x, y, scale };
}

function relaxLayout(
  tiles: Tile[],
  viewportW: number,
  viewportH: number,
  pad: number,
  passes: number
): Tile[] {
  const next = tiles.map((t) => ({ ...t }));

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < next.length; i++) {
      for (let j = i + 1; j < next.length; j++) {
        const a = next[i];
        const b = next[j];

        const ax = a.x + a.w * 0.5;
        const ay = a.y + a.h * 0.5;
        const bx = b.x + b.w * 0.5;
        const by = b.y + b.h * 0.5;

        const dx = ax - bx;
        const dy = ay - by;

        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const minDist =
          Math.min(a.w, a.h) * 0.28 + Math.min(b.w, b.h) * 0.28 + 22;

        if (dist < minDist) {
          const push = (minDist - dist) * 0.5;
          const ux = dx / dist;
          const uy = dy / dist;

          a.x += ux * push;
          a.y += uy * push;
          b.x -= ux * push;
          b.y -= uy * push;

          a.x = clamp(a.x, pad, viewportW - pad - a.w);
          a.y = clamp(a.y, pad, viewportH - pad - a.h);
          b.x = clamp(b.x, pad, viewportW - pad - b.w);
          b.y = clamp(b.y, pad, viewportH - pad - b.h);
        }
      }
    }
  }

  return next;
}

/**
 * Layout éparpillé "raisonnable" + tailles normales (variantes mais pas extrêmes).
 */
function makeTiles(media: MediaItem[], viewportW: number, viewportH: number): Tile[] {
  const count = media.length;

  const baseW = viewportW > 900 ? 240 : 175;
  const baseH = viewportW > 900 ? 175 : 130;

  const pad = viewportW > 900 ? 70 : 50;

  const centerX = Math.round(viewportW * 0.5);
  const centerY = Math.round(viewportH * 0.52);

  const rx = Math.max(180, (viewportW - pad * 2) * 0.72);
  const ry = Math.max(160, (viewportH - pad * 2) * 0.62);

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const seedBase = Math.floor((viewportW * 0.21 + viewportH * 0.17 + count * 9.3) * 10);

  const tiles: Tile[] = media.map((m, i) => {
    const r1 = seeded01(seedBase + i * 17 + 1);
    const r2 = seeded01(seedBase + i * 17 + 2);
    const r3 = seeded01(seedBase + i * 17 + 3);
    const r4 = seeded01(seedBase + i * 17 + 4);

    const w = Math.round(baseW + r3 * (viewportW > 900 ? 220 : 140));
    const h = Math.round(baseH + r1 * (viewportW > 900 ? 180 : 120));

    const t = count <= 1 ? 0 : i / (count - 1);
    const prog = Math.pow(t, 0.55);

    const angle = i * GOLDEN + (r4 - 0.5) * 0.9;

    const maxRX = Math.max(60, rx - w * 0.55);
    const maxRY = Math.max(60, ry - h * 0.55);

    const jitterX = (r1 - 0.5) * 170;
    const jitterY = (r2 - 0.5) * 140;

    let x = Math.round(centerX + Math.cos(angle) * (prog * maxRX) + jitterX);
    let y = Math.round(centerY + Math.sin(angle) * (prog * maxRY) + jitterY);

    x = clamp(x, pad, viewportW - pad - w);
    y = clamp(y, pad, viewportH - pad - h);

    return {
      id: `image-${i}-${m.path}`,
      media: m,
      x,
      y,
      w,
      h,
      z: i + 1,
    };
  });

  return relaxLayout(tiles, viewportW, viewportH, pad, 3);
}

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const media = useMemo(() => {
    const refs = getAllReferences();
    const withMedia = refs.filter(
      (r) => Boolean(r.media) || Boolean(r.mediaGallery?.length)
    );
    return pickImageMediasFromRefs(withMedia);
  }, []);

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });

  const dragTileRef = useRef<DragState | null>(null);
  const resizeTileRef = useRef<ResizeState | null>(null);
  const panRef = useRef<PanState | null>(null);

  const didInitViewRef = useRef(false);
  const defaultViewRef = useRef<View>({ x: 0, y: 0, scale: 1 });

  const mediaCount = media.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const rebuild = () => {
      const rect = el.getBoundingClientRect();
      const nextTiles = makeTiles(media, rect.width, rect.height);
      setTiles(nextTiles);

      if (!didInitViewRef.current) {
        const fitted = fitViewToTiles(nextTiles, rect.width, rect.height);
        defaultViewRef.current = fitted;
        setView(fitted);
        didInitViewRef.current = true;
      } else {
        defaultViewRef.current = fitViewToTiles(nextTiles, rect.width, rect.height);
      }
    };

    rebuild();

    const ro = new ResizeObserver(() => rebuild());
    ro.observe(el);

    return () => ro.disconnect();
  }, [media]);

  useEffect(() => {
    const MAX_PRELOAD = 120;
    for (const m of media.slice(0, MAX_PRELOAD)) preloadPublicImage(m.path);
  }, [media]);

  function bringToFront(id: string) {
    setTiles((prev) => {
      const maxZ = prev.reduce((acc, t) => Math.max(acc, t.z), 0);
      return prev.map((t) => (t.id === id ? { ...t, z: maxZ + 1 } : t));
    });
  }

  function onTilePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    bringToFront(id);

    const t = tiles.find((x) => x.id === id);
    if (!t) return;

    dragTileRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      tileX: t.x,
      tileY: t.y,
    };
  }

  function onResizeHandleDown(e: React.PointerEvent, id: string) {
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    bringToFront(id);

    const t = tiles.find((x) => x.id === id);
    if (!t) return;

    resizeTileRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startW: t.w,
      startH: t.h,
    };
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: view.x,
      viewY: view.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (resizeTileRef.current) {
      const r = resizeTileRef.current;
      const dx = (e.clientX - r.startX) / view.scale;
      const dy = (e.clientY - r.startY) / view.scale;

      const MIN_W = 90;
      const MIN_H = 70;
      const MAX_W = 1100;
      const MAX_H = 900;

      setTiles((prev) =>
        prev.map((t) => {
          if (t.id !== r.id) return t;

          if (e.shiftKey) {
            const ratio = r.startW / Math.max(1, r.startH);
            const nextW = clamp(r.startW + dx, MIN_W, MAX_W);
            const nextH = clamp(Math.round(nextW / ratio), MIN_H, MAX_H);
            return { ...t, w: nextW, h: nextH };
          }

          return {
            ...t,
            w: clamp(r.startW + dx, MIN_W, MAX_W),
            h: clamp(r.startH + dy, MIN_H, MAX_H),
          };
        })
      );
      return;
    }

    if (dragTileRef.current) {
      const d = dragTileRef.current;
      const dx = (e.clientX - d.startX) / view.scale;
      const dy = (e.clientY - d.startY) / view.scale;

      setTiles((prev) =>
        prev.map((t) =>
          t.id === d.id ? { ...t, x: d.tileX + dx, y: d.tileY + dy } : t
        )
      );
      return;
    }

    if (panRef.current) {
      const p = panRef.current;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      setView((v) => ({ ...v, x: p.viewX + dx, y: p.viewY + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    dragTileRef.current = null;
    resizeTileRef.current = null;
    panRef.current = null;

    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  function onWheel(e: React.WheelEvent) {
    if (e.ctrlKey) return;
    e.preventDefault();

    const delta = -e.deltaY;
    const nextScale = clamp(view.scale + delta * 0.001, 0.35, 2.2);

    const el = containerRef.current;
    if (!el) {
      setView((v) => ({ ...v, scale: nextScale }));
      return;
    }

    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const worldX = (cx - view.x) / view.scale;
    const worldY = (cy - view.y) / view.scale;

    const nextX = cx - worldX * nextScale;
    const nextY = cy - worldY * nextScale;

    setView({ x: nextX, y: nextY, scale: nextScale });
  }

  function resetView() {
    setView(defaultViewRef.current);
  }

  return (
    <main className="w-full">
      <section className="px-6 pt-10 pb-6 max-w-[1400px]">
        <div className="mono text-[11px] tracking-[0.22em] uppercase opacity-60">
          ELY &amp; MARION COLLECTIVE
        </div>

        <h1 className="mt-3 font-sans text-[56px] leading-[1.02] tracking-[-0.02em]">
          Témoigner pour lutter
        </h1>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-start md:gap-10">
          <div className="mono text-[12px] opacity-60">
            media: {mediaCount} images
          </div>

          <div className="mono text-[12px] opacity-50 leading-relaxed max-w-[900px]">
            <span className="opacity-70">tips:</span> drag image - grab bottom right corner to resize - drag
            background to pan - scroll to zoom
          </div>
        </div>
      </section>

      <section className="relative w-full border-y border-black/10">
        <div
          ref={containerRef}
          className="relative h-[620px] w-full overflow-hidden bg-white touch-none"
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            {tiles.map((t, idx) => {
              const url = buildPublicUrl(t.media.path);
              const isPriority = idx < 10;

              return (
                <div
                  key={t.id}
                  className="absolute select-none"
                  style={{
                    transform: `translate3d(${t.x}px, ${t.y}px, 0)`,
                    width: t.w,
                    height: t.h,
                    zIndex: t.z,
                    background: "white",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    touchAction: "none",
                    transition:
                      "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), width 420ms cubic-bezier(0.2, 0.8, 0.2, 1), height 420ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                  onPointerDown={(e) => onTilePointerDown(e, t.id)}
                >
                  <img
                    src={url}
                    alt=""
                    draggable={false}
                    loading={isPriority ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={isPriority ? "high" : "auto"}
                    className="w-full h-full object-cover bg-black/[0.03]"
                  />

                  <div
                    className="absolute right-0 bottom-0 w-8 h-8 cursor-se-resize z-20"
                    onPointerDown={(e) => onResizeHandleDown(e, t.id)}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.28) 53%, rgba(0,0,0,0.28) 63%, rgba(0,0,0,0) 64%)",
                    }}
                    aria-label="Resize"
                    title="Resize (shift = keep ratio)"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              resetView();
            }}
            className="absolute right-8 bottom-8 z-50 mono text-[12px] tracking-[0.22em] uppercase border border-black/20 bg-white px-5 py-3 hover:bg-black/5 transition-colors"
          >
            Reset view
          </button>
        </div>
      </section>
    </main>
  );
}
