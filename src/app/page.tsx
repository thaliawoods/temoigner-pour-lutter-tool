"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const BUCKET = "tpl-web";

type MediaItem = {
  type: "image" | "video";
  path: string; // ex: "image/xxx.png" ou "video/xxx.mp4"
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

function isVideoPath(path: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(path);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// --- Supabase singleton (évite “Multiple GoTrueClient instances” en dev/HMR) ---
declare global {
  // eslint-disable-next-line no-var
  var __tpl_supabase__: SupabaseClient | undefined;
}

function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!globalThis.__tpl_supabase__) {
    globalThis.__tpl_supabase__ = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return globalThis.__tpl_supabase__ ?? null;
}

function buildPublicUrl(supabase: SupabaseClient, path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// petit “random” déterministe (stable au refresh)
function seeded01(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function makeTiles(media: MediaItem[], viewportW: number, viewportH: number): Tile[] {
  const count = media.length;

  // Option B: le “spread” du nuage dépend du nb de médias
  const spread = clamp(250 + count * 10, 350, 2200);

  const baseW = viewportW > 900 ? 220 : 160;
  const baseH = viewportW > 900 ? 160 : 120;

  return media.map((m, i) => {
    const r1 = seeded01(i + 1);
    const r2 = seeded01(i + 2);
    const r3 = seeded01(i + 3);

    const sizeBoost = m.type === "video" ? 1.1 : 1.0;
    const w = Math.round((baseW + r3 * 160) * sizeBoost);
    const h = Math.round((baseH + r1 * 140) * sizeBoost);

    // centre + nuage
    const x = Math.round(viewportW * 0.35 + (r1 - 0.5) * spread);
    const y = Math.round(viewportH * 0.55 + (r2 - 0.5) * spread);

    return {
      id: `${m.type}-${i}-${m.path}`,
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
  const supabase = useMemo(() => getSupabase(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });

  // drag tile
  const dragTileRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    tileX: number;
    tileY: number;
  } | null>(null);

  // pan canvas
  const panRef = useRef<{
    startX: number;
    startY: number;
    viewX: number;
    viewY: number;
  } | null>(null);

  const mediaCount = media.length;
  const imageCount = media.filter((m) => m.type === "image").length;
  const videoCount = media.filter((m) => m.type === "video").length;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);

      if (!supabase) {
        console.warn("[SUPABASE] missing env vars");
        setLoading(false);
        return;
      }

      try {
        const [imgs, vids] = await Promise.all([
          supabase.storage.from(BUCKET).list("image", {
            limit: 1000,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
          }),
          supabase.storage.from(BUCKET).list("video", {
            limit: 1000,
            offset: 0,
            sortBy: { column: "name", order: "asc" },
          }),
        ]);

        if (cancelled) return;

        const images: MediaItem[] =
          imgs.data?.map((f) => ({ type: "image", path: `image/${f.name}` })) ?? [];
        const videos: MediaItem[] =
          vids.data?.map((f) => ({ type: "video", path: `video/${f.name}` })) ?? [];

        const all = [...images, ...videos];

        console.log("[SUPABASE] images", images.length, "videos", videos.length);
        console.log("[SUPABASE] example image", images[0]);
        console.log("[SUPABASE] example video", videos[0]);

        setMedia(all);
      } catch (e) {
        console.error("[SUPABASE] list error", e);
      } finally {
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // regen tiles when media changes or viewport changes
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
    // click on background => pan
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      viewX: view.x,
      viewY: view.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    // tile drag
    if (dragTileRef.current) {
      const d = dragTileRef.current;
      const dx = (e.clientX - d.startX) / view.scale;
      const dy = (e.clientY - d.startY) / view.scale;

      setTiles((prev) =>
        prev.map((t) => (t.id === d.id ? { ...t, x: d.tileX + dx, y: d.tileY + dy } : t))
      );
      return;
    }

    // pan
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
    } catch {
      // ignore
    }
  }

  function onWheel(e: React.WheelEvent) {
    // zoom doux au wheel (trackpad-friendly)
    if (e.ctrlKey) return; // laisse pinch-zoom navigateur si besoin
    e.preventDefault();

    const delta = -e.deltaY;
    const nextScale = clamp(view.scale + delta * 0.001, 0.35, 2.2);

    // zoom towards cursor
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
      {/* HERO (comme avant) */}
      <section className="px-6 pt-10 pb-6 max-w-[1400px]">
        <div className="mono text-[11px] tracking-[0.22em] uppercase opacity-60">
          ELY &amp; MARION COLLECTIVE
        </div>
        <h1 className="mt-3 font-sans text-[56px] leading-[1.02] tracking-[-0.02em]">
          Témoigner pour lutter
        </h1>

        <div className="mt-4 mono text-[12px] opacity-60">
          media: {imageCount} images · {videoCount} videos
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
              const isVideo = t.media.type === "video" || isVideoPath(t.media.path);

              if (!supabase) return null;
              const url = buildPublicUrl(supabase, t.media.path);

              return (
                <div
                  key={t.id}
                  data-kind="tile"
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
                  {isVideo ? (
                    <video
                      src={url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={url}
                      alt=""
                      draggable={false}
                      className="w-full h-full object-cover"
                      onError={() => console.warn("IMG error:", t.media.path)}
                    />
                  )}
                </div>
              );
            })}

            {!loading && mediaCount === 0 && (
              <div className="absolute left-6 top-6 mono text-[12px] opacity-60">
                No media found in bucket “{BUCKET}” (folders “image/” and “video/”).
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

