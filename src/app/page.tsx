"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAllReferences } from "@/lib/references";
import type { TPLReference, TPLMedia } from "@/lib/schema";
import { buildPublicUrl } from "@/lib/public-url";

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

function makeTiles(media: MediaItem[], viewportW: number, viewportH: number): Tile[] {
  const count = media.length;
  const spread = clamp(250 + count * 10, 350, 2200);

  const baseW = viewportW > 900 ? 220 : 160;
  const baseH = viewportW > 900 ? 160 : 120;

  return media.map((m, i) => {
    const r1 = seeded01(i + 1);
    const r2 = seeded01(i + 2);
    const r3 = seeded01(i + 3);

    const w = Math.round(baseW + r3 * 160);
    const h = Math.round(baseH + r1 * 140);

    const x = Math.round(viewportW * 0.35 + (r1 - 0.5) * spread);
    const y = Math.round(viewportH * 0.55 + (r2 - 0.5) * spread);

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

  const dragTileRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    tileX: number;
    tileY: number;
  } | null>(null);

  const panRef = useRef<{
    startX: number;
    startY: number;
    viewX: number;
    viewY: number;
  } | null>(null);

  const mediaCount = media.length;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const rebuild = () => {
      const rect = el.getBoundingClientRect();
      const nextTiles = makeTiles(media, rect.width, rect.height);
      setTiles(nextTiles);
    };

    rebuild();

    const ro = new ResizeObserver(() => rebuild());
    ro.observe(el);

    return () => ro.disconnect();
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

    const t = tiles.find((x) => x.id === id);
    if (!t) return;

    bringToFront(id);

    dragTileRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      tileX: t.x,
      tileY: t.y,
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
    setView({ x: 0, y: 0, scale: 1 });
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

        <div className="mt-4 mono text-[12px] opacity-60">
          media: {mediaCount} images
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
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
              {Array.from({ length: 60 }).map((_, i) => {
                const r1 = seeded01(1000 + i);
                const r2 = seeded01(2000 + i);
                const r3 = seeded01(3000 + i);
                const w = 60 + Math.round(r3 * 220);
                const h = 40 + Math.round(r1 * 180);
                const x = Math.round(r1 * 2400);
                const y = Math.round(r2 * 1600);
                return (
                  <div
                    key={i}
                    className="absolute border border-black/20 bg-white"
                    style={{ left: x, top: y, width: w, height: h }}
                  />
                );
              })}
            </div>

            {tiles.map((t) => {
              const url = buildPublicUrl(t.media.path);

              return (
                <div
                  key={t.id}
                  className="absolute select-none"
                  style={{
                    left: t.x,
                    top: t.y,
                    width: t.w,
                    height: t.h,
                    zIndex: t.z,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    background: "white",
                  }}
                  onPointerDown={(e) => onTilePointerDown(e, t.id)}
                >
                  <img
                    src={url}
                    alt=""
                    draggable={false}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })}

            {mediaCount === 0 && (
              <div className="absolute left-6 top-6 mono text-[12px] opacity-60">
                No images found in refs (add &quot;media&quot; / &quot;mediaGallery&quot; in your JSON).
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={resetView}
            className="absolute right-8 bottom-8 z-50 mono text-[12px] tracking-[0.22em] uppercase border border-black/20 bg-white px-5 py-3 hover:bg-black/5 transition-colors"
          >
            Reset view
          </button>
        </div>
      </section>
    </main>
  );
}
