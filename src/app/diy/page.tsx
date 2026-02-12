"use client";

import React, { useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getAllReferences } from "@/lib/references";
import type { TPLMedia, TPLReference } from "@/lib/schema";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const BUCKET = "tpl-web";

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

type PoolKind = "image" | "video" | "text";
type BucketKind = "image" | "video" | "audio";

type BucketFile = {
  kind: BucketKind;
  path: string;
  name: string;
  key: string;
};

type PoolTile = {
  id: string;
  refId: string;
  kind: PoolKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

type CanvasItem = {
  id: string;
  refId: string;
  kind: "image" | "video" | "audio" | "text";
  x: number;
  y: number;
  w: number;
  h: number;
};

function encodePath(path: string) {
  return path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
}

function buildPublicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!base) return "";
  return `${base}/storage/v1/object/public/${BUCKET}/${encodePath(path)}`;
}

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

function trunc(s: string, n = 34) {
  const t = (s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeKey(nameOrPath: string) {
  return normalize(nameOrPath);
}

function preferredKindForType(t: TPLReference["type"]): BucketKind {
  if (t === "musique" || t === "podcast") return "audio";
  if (t === "film" || t === "video" || t === "performance" || t === "jeu_video")
    return "video";
  return "image";
}

function scoreMatch(fileKey: string, refKey: string) {
  if (!fileKey || !refKey) return 0;
  if (fileKey === refKey) return 100;
  if (fileKey.includes(refKey)) return 40;
  if (refKey.includes(fileKey)) return 20;

  const fileTokens = new Set(fileKey.split(" ").filter(Boolean));
  const refTokens = refKey.split(" ").filter(Boolean);

  let hit = 0;
  for (const t of refTokens) {
    if (fileTokens.has(t)) hit += 3;
    else if (t.length >= 4) {
      for (const ft of fileTokens) {
        if (ft.includes(t) || t.includes(ft)) {
          hit += 1;
          break;
        }
      }
    }
  }
  return hit;
}

function guessMediaForReference(
  r: TPLReference,
  pool: Record<BucketKind, BucketFile[]>
): TPLMedia | undefined {
  const kind = preferredKindForType(r.type);
  const files = pool[kind];
  if (!files.length) return undefined;

  const candidates = [
    r.id,
    r.title,
    `${r.title} ${r.creator ?? ""}`,
    `${r.creator ?? ""} ${r.title}`,
  ]
    .map((x) => makeKey(x))
    .filter(Boolean);

  let best: { file: BucketFile; score: number } | null = null;

  for (const f of files) {
    let s = 0;
    for (const c of candidates) s = Math.max(s, scoreMatch(f.key, c));
    if (!best || s > best.score) best = { file: f, score: s };
  }

  const chosen = best?.score ? best.file : files[0];

  if (kind === "image") return { kind: "image", src: chosen.path, alt: r.title };
  if (kind === "video") return { kind: "video", src: chosen.path };
  return { kind: "audio", src: chosen.path, title: r.title };
}

function kindFromMedia(m?: TPLMedia): PoolKind {
  if (!m) return "text";
  if (m.kind === "image") return "image";
  if (m.kind === "video") return "video";
  return "text";
}

function canvasKindFromMedia(m?: TPLMedia): CanvasItem["kind"] {
  if (!m) return "text";
  if (m.kind === "image") return "image";
  if (m.kind === "video") return "video";
  if (m.kind === "audio") return "audio";
  return "text";
}

function mediaUrlFromMedia(m?: TPLMedia): string | null {
  if (!m) return null;
  const src = (m as { src?: string }).src ?? "";
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return buildPublicUrl(src);
}

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
    for (const t of tiles) {
      const tr = { x: t.x - 6, y: t.y - 6, w: t.w + 12, h: t.h + 12 };
      if (overlaps(r, tr)) return false;
    }
    return true;
  };

  let tries = 0;
  const maxTries = 4000;

  for (let i = 0; i < Math.min(count, refs.length); i++) {
    const r = refs[i];
    const kind = kindFromMedia(r.media);

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

function getCanvasRectInStage(params: { stageW: number; topOffset: number }) {
  const { stageW, topOffset } = params;

  const canvasW = Math.min(900, Math.max(560, Math.floor(stageW * 0.66)));
  const canvasH = 460;

  const canvasX = Math.floor((stageW - canvasW) / 2);
  const canvasY = topOffset;

  const consoleH = 160;
  const consoleY = canvasY + canvasH + 18;

  return {
    canvas: { x: canvasX, y: canvasY, w: canvasW, h: canvasH },
    console: { x: canvasX, y: consoleY, w: canvasW, h: consoleH },
    totalH: consoleY + consoleH,
  };
}

function WaveMini({ seed = 1 }: { seed?: number }) {
  const rand = mulberry32(seed);
  const bars = Array.from({ length: 26 }).map(() => 3 + Math.floor(rand() * 14));
  return (
    <div className="flex items-end gap-[2px] h-6">
      {bars.map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-zinc-900/30"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

function PoolCard({
  r,
  style,
  onPointerDown,
}: {
  r: TPLReference;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const kind = kindFromMedia(r.media);
  const url = mediaUrlFromMedia(r.media);

  return (
    <div
      className="absolute bg-white border border-zinc-200 select-none overflow-hidden"
      style={style}
      onPointerDown={onPointerDown}
    >
      {url && (kind === "image" || kind === "video") ? (
        <div className="absolute inset-0">
          {kind === "video" ? (
            <video
              src={url}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <img
              src={url}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          )}
          <div className="absolute inset-0 bg-white/35" />
        </div>
      ) : null}

      <div className="relative p-3">
        <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
          {kind === "image" ? "IMAGE" : kind === "video" ? "VIDEO" : prettyType(r.type)}
        </div>

        <div className="mt-2 text-[13px] leading-snug text-zinc-900">
          {trunc(r.title, 40)}
        </div>

        <div className="mt-2 mono text-[10px] uppercase tracking-widest text-zinc-500">
          drag
        </div>
      </div>
    </div>
  );
}

function CanvasBlock({
  r,
  selected,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  r: TPLReference;
  selected: boolean;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  const kind = canvasKindFromMedia(r.media);
  const url = mediaUrlFromMedia(r.media);

  if (kind === "audio") {
    return (
      <div
        className={[
          "absolute bg-white border border-zinc-200 select-none overflow-hidden",
          selected ? "outline outline-1 outline-black" : "",
        ].join(" ")}
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="p-3 h-full flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                AUDIO
              </div>
              <div className="mt-2 text-[13px] leading-snug text-zinc-900">
                {trunc(r.title, 48)}
              </div>
            </div>
            <WaveMini seed={makeKey(r.id).length * 33} />
          </div>

          {url ? (
            <audio controls preload="none" src={url} className="w-full" />
          ) : (
            <div className="mono text-[10px] uppercase tracking-widest text-zinc-400">
              no audio
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "absolute bg-white border border-zinc-200 select-none overflow-hidden",
        selected ? "outline outline-1 outline-black" : "",
      ].join(" ")}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {url && (kind === "image" || kind === "video") ? (
        <div className="absolute inset-0">
          {kind === "video" ? (
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <img
              src={url}
              alt=""
              draggable={false}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          )}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-3 bg-white/70 backdrop-blur-[2px]">
        <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
          {kind === "image" ? "IMAGE" : kind === "video" ? "VIDEO" : prettyType(r.type)}
        </div>
        <div className="mt-1 text-[12px] leading-snug text-zinc-900">
          {trunc(r.title, 44)}
        </div>
      </div>
    </div>
  );
}

export default function DIYPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const baseRefs = useMemo(() => getAllReferences(), []);

  const [refs, setRefs] = useState<TPLReference[]>(baseRefs);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoadingMedia(true);

      if (!supabase) {
        setLoadingMedia(false);
        return;
      }

      try {
        const kinds: BucketKind[] = ["image", "video", "audio"];

        const results = await Promise.all(
          kinds.map(async (kind) => {
            const res = await supabase.storage.from(BUCKET).list(kind, {
              limit: 1000,
              offset: 0,
              sortBy: { column: "name", order: "asc" },
            });

            const files: BucketFile[] =
              res.data?.map((f) => {
                const path = `${kind}/${f.name}`;
                return {
                  kind,
                  path,
                  name: f.name,
                  key: makeKey(f.name),
                };
              }) ?? [];

            return [kind, files] as const;
          })
        );

        if (cancelled) return;

        const pool: Record<BucketKind, BucketFile[]> = {
          image: [],
          video: [],
          audio: [],
        };

        for (const [kind, files] of results) pool[kind] = files;

        const enriched = baseRefs.map((r) => {
          const media = guessMediaForReference(r, pool);
          return { ...r, media };
        });

        setRefs(enriched);
      } finally {
        if (!cancelled) setLoadingMedia(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, baseRefs]);

  const refsById = useMemo(() => {
    const m = new Map<string, TPLReference>();
    for (const r of refs) m.set(r.id, r);
    return m;
  }, [refs]);

  const visualRefs = useMemo(() => {
    return refs.filter((r) => r.media?.kind === "image" || r.media?.kind === "video");
  }, [refs]);

  const audioRefs = useMemo(() => {
    return refs.filter((r) => r.media?.kind === "audio");
  }, [refs]);

  const [poolSeed, setPoolSeed] = useState(1);

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const topOffset = 78;
  const rects = useMemo(() => {
    return getCanvasRectInStage({ stageW: stageSize.w || 1200, topOffset });
  }, [stageSize.w]);

  const poolRefs = useMemo(() => {
    const rand = mulberry32(poolSeed * 999);
    const shuffled = [...visualRefs].sort(() => rand() - 0.5);
    return shuffled.slice(0, 26);
  }, [visualRefs, poolSeed]);

  const poolTiles = useMemo(() => {
    const stageW = stageSize.w || 1200;
    const stageH = stageSize.h || 780;

    const avoid = [
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
      { x: 0, y: 0, w: stageW, h: topOffset - 8 },
    ];

    return makeScatterTiles({
      seed: poolSeed * 1337,
      refs: poolRefs,
      count: 26,
      stageW,
      stageH,
      avoidRects: avoid,
    });
  }, [poolRefs, poolSeed, rects.canvas, rects.console, stageSize.w, stageSize.h]);

  const tileData = useMemo(() => {
    return poolTiles
      .map((t) => {
        const r = refsById.get(t.refId);
        if (!r) return null;
        return { tile: t, ref: r };
      })
      .filter((x): x is { tile: PoolTile; ref: TPLReference } => Boolean(x));
  }, [poolTiles, refsById]);

  const audioList = useMemo(() => {
    const rand = mulberry32(poolSeed * 2027);
    const shuffled = [...audioRefs].sort(() => rand() - 0.5);
    return shuffled;
  }, [audioRefs, poolSeed]);

  const dragRef = useRef<{
    refId: string;
    kind: CanvasItem["kind"];
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
    kind: CanvasItem["kind"];
  } | null>(null);

  const beginDragVisual = (e: React.PointerEvent, tile: PoolTile) => {
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

  const beginDragAudio = (e: React.PointerEvent, refId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const el = stageRef.current;
    if (!el) return;

    const stageR = el.getBoundingClientRect();
    const x = e.clientX - stageR.left;
    const y = e.clientY - stageR.top;

    const w = 360;
    const h = 120;

    dragRef.current = {
      refId,
      kind: "audio",
      offsetX: 12,
      offsetY: 12,
      w,
      h,
      active: true,
    };

    setGhost({
      x: x + 12,
      y: y + 12,
      w,
      h,
      refId,
      kind: "audio",
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

    setGhost((g) => (g ? { ...g, x: x + d.offsetX, y: y + d.offsetY } : null));
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

      const w = d.kind === "audio" ? 380 : 300;
      const h = d.kind === "audio" ? 128 : 190;

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

    setGhost(null);
    dragRef.current = null;
  };

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

    const px = (pageW - drawW) / 2;
    const py = (pageH - drawH) / 2;

    pdf.addImage(dataUrl, "PNG", px, py, drawW, drawH);
    pdf.save("diy-composition.pdf");
  };

  const downloadVideo = async () => {
    const ref = captureRef.current;
    if (!ref) return;

    const html2canvas = (await import("html2canvas")).default;

    const preferredMime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const fps = 30;
    const seconds = 15;
    const totalFrames = fps * seconds;

    const canvas = html2canvas(ref, {
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      scale: 2,
    }) as unknown as HTMLCanvasElement;

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start(250);

    for (let i = 0; i < totalFrames; i++) {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const next = html2canvas(ref, {
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        scale: 2,
      }) as unknown as HTMLCanvasElement;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(next, 0, 0);
    }

    recorder.stop();

    await new Promise<void>((res) => {
      recorder.onstop = () => res();
    });

    const blob = new Blob(chunks, { type: preferredMime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "diy-composition.webm";
    a.click();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

return (
  <main className="bg-white text-zinc-900">
    <div className="mx-auto max-w-6xl px-6 pt-6 pb-14">
      <div className="pt-4">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 lg:col-span-8">
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-500">
              do it yourself
            </div>

            {/* ✅ plus petit, plus proche des autres pages */}
            <h1 className="mt-3 text-[30px] leading-[1.15] font-semibold tracking-tight">
              drag → compose → export
            </h1>

            <div className="mt-2 mono text-[11px] uppercase tracking-widest text-zinc-400">
              {loadingMedia
                ? "loading media…"
                : `${visualRefs.length} visuals · ${audioRefs.length} audio`}
            </div>
          </div>

          {/* ✅ boutons sur UNE ligne (desktop) */}
          <div className="col-span-12 lg:col-span-4 flex justify-start lg:justify-end">
            <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
              <button
                className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                onClick={refresh}
                type="button"
              >
                refresh
              </button>

              <button
                className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                onClick={downloadPDF}
                type="button"
              >
                download pdf
              </button>

              <button
                className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                onClick={removeSelected}
                type="button"
              >
                remove
              </button>

              <button
                className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                onClick={clear}
                type="button"
              >
                clear
              </button>
            </div>
          </div>
        </div>

        {/* ✅ séparateur comme les autres pages */}
        <div className="mt-6 border-t border-zinc-200" />

        <div className="mt-4">
          <div
            ref={stageRef}
            className="relative w-full"
            style={{
              height: rects.totalH + 16,
              overscrollBehaviorX: "none",
              touchAction: "none",
            }}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
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
                  style={style}
                  onPointerDown={(e) => beginDragVisual(e, tile)}
                />
              );
            })}

            <div
              ref={captureRef}
              className="absolute"
              style={{
                left: rects.canvas.x,
                top: rects.canvas.y,
                width: rects.canvas.w,
                height: rects.canvas.h + 18 + rects.console.h,
                background: "#fff",
              }}
            >
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

                {items.map((it) => {
                  const r = refsById.get(it.refId);
                  if (!r) return null;

                  return (
                    <div
                      key={it.id}
                      className={[
                        "absolute bg-white border border-zinc-200 select-none overflow-hidden",
                        selectedId === it.id ? "outline outline-1 outline-black" : "",
                      ].join(" ")}
                      style={{
                        left: it.x,
                        top: it.y,
                        width: it.w,
                        height: it.h,
                      }}
                      onPointerDown={(e) => onBlockDown(e, it)}
                      onPointerMove={onBlockMove}
                      onPointerUp={onBlockUp}
                      onPointerCancel={onBlockUp}
                    >
                      <CanvasBlock
                        r={r}
                        selected={selectedId === it.id}
                        style={{ left: 0, top: 0, width: it.w, height: it.h }}
                        onPointerDown={() => {}}
                        onPointerMove={() => {}}
                        onPointerUp={() => {}}
                      />
                    </div>
                  );
                })}
              </div>

              <div
                className="absolute border border-zinc-200 bg-white"
                style={{
                  left: 0,
                  top: rects.canvas.h + 18,
                  width: rects.console.w,
                  height: rects.console.h,
                }}
              >
                <div className="p-3 h-full flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                      audio console
                    </div>
                    <div className="flex items-center gap-3">
                      <WaveMini seed={42} />
                      <WaveMini seed={99} />
                      <WaveMini seed={123} />
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto border border-zinc-200">
                    <div className="divide-y divide-zinc-200">
                      {audioList.map((r) => {
                        const src = mediaUrlFromMedia(r.media);
                        return (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-4 px-3 py-2 hover:bg-zinc-50"
                          >
                            <button
                              type="button"
                              className="min-w-0 text-left"
                              onPointerDown={(e) => beginDragAudio(e, r.id)}
                            >
                              <div className="mono text-[10px] uppercase tracking-widest text-zinc-500">
                                {prettyType(r.type)}
                              </div>
                              <div className="mt-1 text-[12px] text-zinc-900 truncate">
                                {r.title}
                              </div>
                              <div className="mt-1 mono text-[10px] uppercase tracking-widest text-zinc-400">
                                drag to canvas
                              </div>
                            </button>

                            <div className="flex items-center gap-3">
                              <WaveMini seed={makeKey(r.id).length * 17} />
                              {src ? (
                                <audio
                                  controls
                                  preload="none"
                                  src={src}
                                  className="w-[260px]"
                                />
                              ) : (
                                <div className="mono text-[10px] uppercase tracking-widest text-zinc-400">
                                  no audio
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {ghost ? (
              <div
                className="absolute pointer-events-none bg-white border border-zinc-200 opacity-85 overflow-hidden"
                style={{
                  left: ghost.x,
                  top: ghost.y,
                  width: ghost.w,
                  height: ghost.h,
                }}
              >
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                      {ghost.kind.toUpperCase()}
                    </div>
                    <div className="mt-2 text-[13px] leading-snug text-zinc-900">
                      {trunc(refsById.get(ghost.refId)?.title ?? "—", 48)}
                    </div>
                  </div>
                  {ghost.kind === "audio" ? <WaveMini seed={77} /> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="h-24" />
      </div>
    </div>
  </main>
);
}
