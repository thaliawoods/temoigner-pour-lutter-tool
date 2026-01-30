"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Tile = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTiles(count: number) {
  const rand = mulberry32(42);
  const tiles: Tile[] = [];
  const WORLD_W = 7000;
  const WORLD_H = 4500;

  for (let i = 0; i < count; i++) {
    const base = 90 + Math.floor(rand() * 170);
    const ratio = 0.7 + rand() * 0.9;
    const w = Math.round(base * (ratio >= 1 ? ratio : 1));
    const h = Math.round(base * (ratio < 1 ? 1 / ratio : 1));

    const x = Math.round(rand() * (WORLD_W - w) - WORLD_W / 2);
    const y = Math.round(rand() * (WORLD_H - h) - WORLD_H / 2);

    tiles.push({ id: `tile-${i}`, x, y, w, h });
  }

  return tiles;
}

export default function HomePage() {
  // Ajuste si besoin selon ton header/footer réels
  const TOP_SAFE = 64;
  const BOTTOM_SAFE = 72;

  const TILE_COUNT = 220;
  const MIN_Z = 0.25;
  const MAX_Z = 2.2;

  const initialTiles = useMemo(() => makeTiles(TILE_COUNT), []);
  const [tiles, setTiles] = useState<Tile[]>(initialTiles);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState({ x: 0, y: 0, z: 0.8 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // ---- PAN (fond) ----
  const panDraggingRef = useRef(false);
  const panLastRef = useRef({ x: 0, y: 0 });

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    panDraggingRef.current = true;
    panLastRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onBackgroundPointerMove = (e: React.PointerEvent) => {
    if (!panDraggingRef.current) return;

    const dx = e.clientX - panLastRef.current.x;
    const dy = e.clientY - panLastRef.current.y;
    panLastRef.current = { x: e.clientX, y: e.clientY };

    const z = viewRef.current.z;
    setView((v) => ({ ...v, x: v.x + dx / z, y: v.y + dy / z }));
  };

  const onBackgroundPointerUp = () => {
    panDraggingRef.current = false;
  };

  // ---- ZOOM (wheel/trackpad) ----
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const el = wrapRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const { x, y, z } = viewRef.current;

    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 1 / 1.08;
    const nextZ = clamp(z * factor, MIN_Z, MAX_Z);

    const wxBefore = x + (px - rect.width / 2) / z;
    const wyBefore = y + (py - rect.height / 2) / z;

    const wxAfter = x + (px - rect.width / 2) / nextZ;
    const wyAfter = y + (py - rect.height / 2) / nextZ;

    setView({
      x: x + (wxBefore - wxAfter),
      y: y + (wyBefore - wyAfter),
      z: nextZ,
    });
  };

  // ---- DRAG tile ----
  const tileDraggingRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startTileX: number;
    startTileY: number;
  } | null>(null);

  const bringToFront = (id: string) => {
    setTiles((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const copy = prev.slice();
      const [picked] = copy.splice(idx, 1);
      copy.push(picked);
      return copy;
    });
  };

  const onTilePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();

    const t = tiles.find((tt) => tt.id === id);
    if (!t) return;

    bringToFront(id);

    tileDraggingRef.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTileX: t.x,
      startTileY: t.y,
    };

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onTilePointerMove = (e: React.PointerEvent) => {
    const drag = tileDraggingRef.current;
    if (!drag) return;
    e.stopPropagation();

    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;

    const z = viewRef.current.z;
    const nx = drag.startTileX + dx / z;
    const ny = drag.startTileY + dy / z;

    setTiles((prev) =>
      prev.map((t) => (t.id === drag.id ? { ...t, x: nx, y: ny } : t))
    );
  };

  const onTilePointerUp = (e: React.PointerEvent) => {
    if (!tileDraggingRef.current) return;
    e.stopPropagation();
    tileDraggingRef.current = null;
  };

  const transform = `translate3d(50%, 50%, 0) scale(${view.z}) translate3d(${-view.x}px, ${-view.y}px, 0)`;

  return (
    <main className="bg-white text-zinc-900">
      <section
        className="relative w-full overflow-hidden"
        style={{
          height: `calc(100svh - ${TOP_SAFE + BOTTOM_SAFE}px)`,
          overscrollBehavior: "none",
        }}
      >
        {/* Titre fixe */}
        <header className="pointer-events-none absolute left-6 top-6 z-30">
          <div className="pointer-events-auto inline-block">
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              Ely &amp; Marion Collective
            </div>
            <h1 className="mt-2 text-4xl font-medium leading-tight">
              Témoigner pour lutter
            </h1>
          </div>
        </header>

        {/* Surface pan/zoom */}
        <div
          ref={wrapRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            touchAction: "none",
            overscrollBehavior: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          onPointerDown={onBackgroundPointerDown}
          onPointerMove={onBackgroundPointerMove}
          onPointerUp={onBackgroundPointerUp}
          onPointerCancel={onBackgroundPointerUp}
          onWheel={onWheel}
        >
          <div
            className="absolute left-0 top-0 will-change-transform"
            style={{ transform, transformOrigin: "0 0" }}
          >
            {tiles.map((t) => (
              <div
                key={t.id}
                className="absolute bg-white border border-zinc-200"
                style={{
                  left: t.x,
                  top: t.y,
                  width: t.w,
                  height: t.h,
                  touchAction: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onPointerDown={(e) => onTilePointerDown(e, t.id)}
                onPointerMove={onTilePointerMove}
                onPointerUp={onTilePointerUp}
                onPointerCancel={onTilePointerUp}
              >
                <div className="h-full w-full" />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setView({ x: 0, y: 0, z: 0.8 })}
          className="absolute bottom-6 right-6 z-40 border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
        >
          reset view
        </button>
      </section>
    </main>
  );
}
