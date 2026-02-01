"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { getAllReferences } from "@/lib/references";
import type { TPLReference } from "@/lib/schema";

type PoolKind = "image" | "video" | "text";

type PoolTile = {
  id: string; // pool-${refId}
  refId: string;
  kind: PoolKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

type CanvasItem = {
  id: string; // canvas-${n}
  refId: string;
  kind: PoolKind;
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

function prettyType(t: string) {
  return t.replaceAll("_", " ").toUpperCase();
}

function formatYear(r: TPLReference): string {
  if (r.year) return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

function guessKind(r: TPLReference): PoolKind {
  if (r.media?.kind === "image") return "image";
  if (r.media?.kind === "video") return "video";
  return "text";
}

function trunc(s: string, n = 34) {
  const t = (s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/**
 * Place des cartes dans "les zones dispo" autour d’un rectangle central (canvas + console),
 * en évitant les collisions trop visibles.
 */
function makeScatterTiles(params: {
  seed: number;
  refs: TPLReference[];
  count: number;
  stageW: number;
  stageH: number;
  avoidRects: Array<{ x: number; y: number; w: number; h: number }>;
}) {
  const { seed, refs, count, stageW, stageH, avoidRects } = params;
  const rand = mulberry32(seed);

  const tiles: PoolTile[] = [];

  // tailles proches du screenshot
  const minW = 120;
  const maxW = 190;
  const minH = 90;
  const maxH = 140;

  const margin = 10;

  const overlaps = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ) => {
    return !(
      a.x + a.w < b.x ||
      a.x > b.x + b.w ||
      a.y + a.h < b.y ||
      a.y > b.y + b.h
    );
  };

  const isOk = (r: { x: number; y: number; w: number; h: number }) => {
    for (const ar of avoidRects) {
      if (overlaps(r, ar)) return false;
    }
    // évite un peu les overlaps entre tiles (léger)
    for (const t of tiles) {
      const tr = { x: t.x - 6, y: t.y - 6, w: t.w + 12, h: t.h + 12 };
      if (overlaps(r, tr)) return false;
    }
    return true;
  };

  // rejection sampling
  let tries = 0;
  const maxTries = 4000;

  for (let i = 0; i < Math.min(count, refs.length); i++) {
    const r = refs[i];
    const kind = guessKind(r);

    // un peu de variété de taille
    const w = Math.round(minW + rand() * (maxW - minW));
    const h = Math.round(minH + rand() * (maxH - minH));

    let placed = false;

    while (!placed && tries < maxTries) {
      tries++;

      const x = Math.round(margin + rand() * (stageW - w - margin * 2));
      const y = Math.round(margin + rand() * (stageH - h - margin * 2));

      const rect = { x, y, w, h };
      if (!isOk(rect)) continue;

      tiles.push({
        id: `pool-${r.id}`,
        refId: r.id,
        kind,
        x,
        y,
        w,
        h,
      });
      placed = true;
    }
  }

  return tiles;
}

function getCanvasRectInStage(params: {
  stageW: number;
  topOffset: number; // espace au-dessus du canvas (titre + boutons)
}) {
  const { stageW, topOffset } = params;

  // canvas plus étroit pour laisser place aux refs
  const canvasW = Math.min(820, Math.max(560, Math.floor(stageW * 0.62)));
  const canvasH = 440;

  const canvasX = Math.floor((stageW - canvasW) / 2);
  const canvasY = topOffset;

  // console en dessous, même largeur
  const consoleH = 120;
  const consoleY = canvasY + canvasH + 18;

  return {
    canvas: { x: canvasX, y: canvasY, w: canvasW, h: canvasH },
    console: { x: canvasX, y: consoleY, w: canvasW, h: consoleH },
    totalH: consoleY + consoleH,
  };
}

function PoolCard({
  r,
  kind,
  style,
  onPointerDown,
}: {
  r: TPLReference;
  kind: PoolKind;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="absolute bg-white border border-zinc-200 shadow-[0_0_0_1px_rgba(0,0,0,0.02)] select-none"
      style={style}
      onPointerDown={onPointerDown}
    >
      <div className="p-3">
        <div className="mono text-[10px] uppercase tracking-widest text-zinc-500">
          {kind === "image"
            ? "IMAGE"
            : kind === "video"
            ? "VIDEO"
            : prettyType(r.type)}
        </div>

        <div className="mt-2 text-[13px] leading-snug text-zinc-900">
          {trunc(r.title, 40)}
        </div>

        <div className="mt-2 mono text-[10px] uppercase tracking-widest text-zinc-400">
          drag
        </div>
      </div>
    </div>
  );
}

function CanvasBlock({
  r,
  kind,
  selected,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  r: TPLReference;
  kind: PoolKind;
  selected: boolean;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className={[
        "absolute bg-white border border-zinc-200 select-none",
        selected ? "outline outline-1 outline-black" : "",
      ].join(" ")}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="p-3">
        <div className="mono text-[10px] uppercase tracking-widest text-zinc-500">
          {kind === "image"
            ? "PLACEHOLDER"
            : kind === "video"
            ? "PLACEHOLDER"
            : "PLACEHOLDER"}
        </div>

        <div className="mt-2 text-[13px] leading-snug text-zinc-900">
          {trunc(r.title, 42)}
        </div>

        <div className="mt-2 mono text-[10px] uppercase tracking-widest text-zinc-400">
          move
        </div>
      </div>
    </div>
  );
}

export default function DIYPage() {
  const allRefs = useMemo(() => getAllReferences(), []);
  const refsById = useMemo(() => {
    const m = new Map<string, TPLReference>();
    for (const r of allRefs) m.set(r.id, r);
    return m;
  }, [allRefs]);

  // ✅ 20 refs aléatoires, refresh → nouveau tirage
  const [poolSeed, setPoolSeed] = useState(1);

  // canvas items
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // layout sizes
  const stageRef = useRef<HTMLDivElement | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const topOffset = 78; // espace sous la ligne titre/boutons pour que le canvas commence "sous les boutons"
  const rects = useMemo(() => {
    return getCanvasRectInStage({ stageW: stageSize.w || 1200, topOffset });
  }, [stageSize.w]);

  const poolRefs = useMemo(() => {
    const rand = mulberry32(poolSeed * 999);
    const shuffled = [...allRefs].sort(() => rand() - 0.5);
    return shuffled.slice(0, 20);
  }, [allRefs, poolSeed]);

  const poolTiles = useMemo(() => {
    const stageW = stageSize.w || 1200;
    const stageH = stageSize.h || 700;

    const avoid = [
      // évite canvas + console (avec marge)
      {
        x: rects.canvas.x - 18,
        y: rects.canvas.y - 18,
        w: rects.canvas.w + 36,
        h: rects.canvas.h + 36,
      },
      {
        x: rects.console.x - 18,
        y: rects.console.y - 18,
        w: rects.console.w + 36,
        h: rects.console.h + 36,
      },
      // évite la zone des boutons en haut
      { x: 0, y: 0, w: stageW, h: topOffset - 8 },
    ];

    return makeScatterTiles({
      seed: poolSeed * 1337,
      refs: poolRefs,
      count: 20,
      stageW,
      stageH,
      avoidRects: avoid,
    });
  }, [poolRefs, poolSeed, rects.canvas, rects.console, stageSize.w, stageSize.h]);

  // ---- Pointer “drag” from pool -> canvas ----
  const dragRef = useRef<{
    refId: string;
    kind: PoolKind;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    w: number;
    h: number;
    active: boolean;
  } | null>(null);

  const [ghost, setGhost] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    refId: string;
    kind: PoolKind;
  } | null>(null);

  const beginDrag = (e: React.PointerEvent, tile: PoolTile) => {
    e.preventDefault();
    e.stopPropagation();

    const el = stageRef.current;
    if (!el) return;

    const stageR = el.getBoundingClientRect();
    const x = e.clientX - stageR.left;
    const y = e.clientY - stageR.top;

    dragRef.current = {
      refId: tile.refId,
      kind: tile.kind,
      startX: x,
      startY: y,
      offsetX: 12,
      offsetY: 12,
      w: tile.w,
      h: tile.h,
      active: true,
    };

    setGhost({
      x: x + 12,
      y: y + 12,
      w: tile.w,
      h: tile.h,
      refId: tile.refId,
      kind: tile.kind,
    });

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
const moveDrag = (e: React.PointerEvent) => {
  const d = dragRef.current;
  if (!d?.active) return;

  const el = stageRef.current;
  if (!el) return;

  const stageR = el.getBoundingClientRect();
  const x = e.clientX - stageR.left;
  const y = e.clientY - stageR.top;

  // ✅ on capture les offsets maintenant (au cas où dragRef devient null ensuite)
  const ox = d.offsetX;
  const oy = d.offsetY;

  setGhost((g) => (g ? { ...g, x: x + ox, y: y + oy } : null));
};


const endDrag = (e: React.PointerEvent) => {
  const d = dragRef.current;
  if (!d?.active) {
    setGhost(null);
    dragRef.current = null;
    return;
  }

  const el = stageRef.current;
  if (!el) {
    setGhost(null);
    dragRef.current = null;
    return;
  }

  const stageR = el.getBoundingClientRect();
  const x = e.clientX - stageR.left;
  const y = e.clientY - stageR.top;

  const c = rects.canvas;
  const inside = x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;

  if (inside) {
    const localX = x - c.x;
    const localY = y - c.y;

    const w = 240;
    const h = 160;

    setItems((prev) => {
      const id = `canvas-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      return [
        ...prev,
        {
          id,
          refId: d.refId,
          kind: d.kind,
          x: clamp(localX - w / 2, 10, c.w - w - 10),
          y: clamp(localY - h / 2, 10, c.h - h - 10),
          w,
          h,
        },
      ];
    });
  }

  // ✅ cleanup toujours
  setGhost(null);
  dragRef.current = null;
};


  // ---- Move blocks inside canvas ----
  const moveRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const onBlockDown = (e: React.PointerEvent, it: CanvasItem) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedId(it.id);

    moveRef.current = {
      id: it.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: it.x,
      startY: it.y,
    };

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onBlockMove = (e: React.PointerEvent) => {
    const m = moveRef.current;
    if (!m) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - m.startClientX;
    const dy = e.clientY - m.startClientY;

    const c = rects.canvas;

    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== m.id) return p;
        return {
          ...p,
          x: clamp(m.startX + dx, 10, c.w - p.w - 10),
          y: clamp(m.startY + dy, 10, c.h - p.h - 10),
        };
      })
    );
  };

  const onBlockUp = (e: React.PointerEvent) => {
    if (!moveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    moveRef.current = null;
  };

  // ---- Actions ----
  const refresh = () => setPoolSeed((s) => s + 1);

  const clear = () => {
    setItems([]);
    setSelectedId(null);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };

  const downloadJSON = () => {
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      items: items.map((it) => ({
        refId: it.refId,
        kind: it.kind,
        x: it.x,
        y: it.y,
        w: it.w,
        h: it.h,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "diy-composition.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPNG = async () => {
    if (!captureRef.current) return;
    const { toPng } = await import("html-to-image");

    const dataUrl = await toPng(captureRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "diy-composition.png";
    a.click();
  };

  const downloadPDF = async () => {
    if (!captureRef.current) return;
    const { toPng } = await import("html-to-image");
    const { jsPDF } = await import("jspdf");

    const dataUrl = await toPng(captureRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((res) => {
      img.onload = () => res();
    });

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // fit contain
    const imgRatio = img.width / img.height;
    const pageRatio = pageW / pageH;

    let drawW = pageW;
    let drawH = pageH;

    if (imgRatio > pageRatio) {
      drawW = pageW;
      drawH = pageW / imgRatio;
    } else {
      drawH = pageH;
      drawW = pageH * imgRatio;
    }

    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH);
    pdf.save("diy-composition.pdf");
  };

  // évite le “swipe back” (trackpad) autant que possible via wheel horizontal
  const onStageWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
    }
  };

  // refs tiles data
  const tileData = useMemo(() => {
    return poolTiles
      .map((t) => {
        const r = refsById.get(t.refId);
        if (!r) return null;
        return { tile: t, ref: r };
      })
      .filter((x): x is { tile: PoolTile; ref: TPLReference } => Boolean(x));
  }, [poolTiles, refsById]);

  const canvasStyle: React.CSSProperties = {
    left: rects.canvas.x,
    top: rects.canvas.y,
    width: rects.canvas.w,
    height: rects.canvas.h,
  };

  const consoleStyle: React.CSSProperties = {
    left: rects.console.x,
    top: rects.console.y,
    width: rects.console.w,
    height: rects.console.h,
  };

  return (
    <main className="bg-white text-zinc-900">
      {/* petit espace sous navbar (moins qu’avant) */}
      <div className="mx-auto max-w-6xl px-6 pt-6 pb-14">
        {/* row title + buttons */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              do it yourself — drag → compose → export
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
              onClick={refresh}
              type="button"
            >
              refresh
            </button>

            <button
              className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
              onClick={downloadPDF}
              type="button"
            >
              download pdf
            </button>

            <button
              className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
              onClick={downloadPNG}
              type="button"
            >
              download png
            </button>

            <button
              className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
              onClick={downloadJSON}
              type="button"
            >
              download json
            </button>

            <button
              className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
              onClick={removeSelected}
              type="button"
            >
              remove
            </button>

            <button
              className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
              onClick={clear}
              type="button"
            >
              clear
            </button>
          </div>
        </div>

        {/* STAGE (refs all around) */}
        <div className="mt-4">
          <div
            ref={stageRef}
            className="relative w-full"
            style={{
              height: rects.totalH + 16, // zone de travail (refs + canvas + console)
              overscrollBehaviorX: "none",
              touchAction: "none",
            }}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={onStageWheel}
          >
            {/* POOL tiles scattered */}
            {tileData.map(({ tile, ref }) => {
              const style: React.CSSProperties = {
                left: tile.x,
                top: tile.y,
                width: tile.w,
                height: tile.h,
              };

              return (
                <PoolCard
                  key={tile.id}
                  r={ref}
                  kind={tile.kind}
                  style={style}
                  onPointerDown={(e) => beginDrag(e, tile)}
                />
              );
            })}

            {/* CAPTURE AREA (canvas + blocks) */}
            <div
              ref={captureRef}
              className="absolute"
              style={{
                left: rects.canvas.x,
                top: rects.canvas.y,
                width: rects.canvas.w,
                height: rects.canvas.h + 18 + rects.console.h, // canvas + espace + console
                background: "#fff",
              }}
            >
              {/* Canvas */}
              <div
                className="absolute border border-zinc-200 bg-white"
                style={{
                  left: 0,
                  top: 0,
                  width: rects.canvas.w,
                  height: rects.canvas.h,
                }}
                onPointerDown={() => setSelectedId(null)}
              >
                {/* grid very light */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                  }}
                />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                    drag refs here
                  </div>
                </div>

                {/* blocks */}
                {items.map((it) => {
                  const r = refsById.get(it.refId);
                  if (!r) return null;

                  return (
                    <CanvasBlock
                      key={it.id}
                      r={r}
                      kind={it.kind}
                      selected={selectedId === it.id}
                      style={{
                        left: it.x,
                        top: it.y,
                        width: it.w,
                        height: it.h,
                      }}
                      onPointerDown={(e) => onBlockDown(e, it)}
                      onPointerMove={onBlockMove}
                      onPointerUp={onBlockUp}
                    />
                  );
                })}
              </div>

              {/* Console */}
              <div
                className="absolute border border-zinc-200 bg-white"
                style={{
                  left: 0,
                  top: rects.canvas.h + 18,
                  width: rects.console.w,
                  height: rects.console.h,
                }}
              >
                <div className="p-4">
                  <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    audio console (placeholder)
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">
                    espace = silence
                  </div>
                </div>
              </div>
            </div>

            {/* Ghost while dragging */}
            {ghost ? (
              <div
                className="absolute pointer-events-none bg-white border border-zinc-200 opacity-80"
                style={{
                  left: ghost.x,
                  top: ghost.y,
                  width: ghost.w,
                  height: ghost.h,
                }}
              >
                <div className="p-3">
                  <div className="mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {ghost.kind === "image"
                      ? "IMAGE"
                      : ghost.kind === "video"
                      ? "VIDEO"
                      : "TEXT"}
                  </div>
                  <div className="mt-2 text-[13px] leading-snug">
                    {trunc(refsById.get(ghost.refId)?.title ?? "—", 38)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Espace pour que le footer soit accessible en scrollant */}
        <div className="h-24" />
      </div>
    </main>
  );
}
