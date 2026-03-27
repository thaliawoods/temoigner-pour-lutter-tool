"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAllReferences } from "@/lib/references";
import type { TPLReference, TPLType } from "@/lib/schema";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
const STREAM_CDN = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? "";

type MediaKind = "image" | "video" | "audio";

type MediaFile = {
  id: string;
  path: string;
  url: string;
  kind: MediaKind;
  name: string;
  ref?: TPLReference;
};

type PoolKind = "image" | "video";

type PoolTile = {
  id: string;
  fileId: string;
  kind: PoolKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

type CanvasItem = {
  id: string;
  fileId: string;
  kind: MediaKind;
  x: number;
  y: number;
  w: number;
  h: number;
};

// ─── normKey helpers ─────────────────────────────────────────────────────────

function normKey(s: string) {
  return s
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function basename(src: string) {
  return src.split("/").pop() ?? src;
}

function buildRefLookup(refs: TPLReference[]): Map<string, TPLReference> {
  const map = new Map<string, TPLReference>();
  for (const ref of refs) {
    const srcs: string[] = [];
    const m = ref.media as unknown;
    if (m && typeof m === "object" && (m as { src?: string }).src)
      srcs.push((m as { src: string }).src);
    if (ref.mediaGallery)
      for (const item of ref.mediaGallery) if (item?.src) srcs.push(item.src);
    for (const src of srcs) {
      const key = normKey(basename(src));
      if (key && !map.has(key)) map.set(key, ref);
    }
  }
  return map;
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

function encodePath(path: string) {
  return path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
}

function buildPublicUrl(path: string) {
  if (!CDN_URL) return "";
  return `${CDN_URL}/${encodePath(path)}`;
}

function stripExtension(s: string) {
  return s.replace(/\.[a-z0-9]+$/i, "");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type StreamVideo = { guid: string; title: string; thumbnailFileName: string };

function streamToMediaFile(
  v: StreamVideo,
  refLookup: Map<string, TPLReference>
): MediaFile {
  const name = stripExtension(v.title);
  const ref = refLookup.get(normKey(basename(v.title)));
  return {
    id: `stream-${v.guid}`,
    path: `stream/${v.guid}`,
    url: `${STREAM_CDN}/${v.guid}/play_720p.mp4`,
    kind: "video",
    name,
    ref,
  };
}

function toMediaFile(
  folder: string,
  kind: MediaKind,
  refLookup: Map<string, TPLReference>
) {
  return (name: string): MediaFile => {
    const path = `${folder}/${name}`;
    const ref = refLookup.get(normKey(basename(name)));
    return {
      id: path,
      path,
      url: buildPublicUrl(path),
      kind,
      name: stripExtension(name),
      ref,
    };
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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

function trunc(s: string, n = 34) {
  const t = (s ?? "").trim();
  if (!t) return "—";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function makeScatterTiles(params: {
  seed: number;
  files: MediaFile[];
  count: number;
  stageW: number;
  stageH: number;
  avoidRects: Array<{ x: number; y: number; w: number; h: number }>;
}) {
  const { seed, files, count, stageW, stageH, avoidRects } = params;
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

  for (let i = 0; i < Math.min(count, files.length); i++) {
    const f = files[i];
    const kind: PoolKind = f.kind === "video" ? "video" : "image";

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
        id: `pool-${f.id}`,
        fileId: f.id,
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

  const isMobile = stageW < 640;
  const canvasW = isMobile
    ? Math.max(280, stageW - 16)
    : Math.min(900, Math.max(560, Math.floor(stageW * 0.66)));
  const canvasH = isMobile ? Math.round(canvasW * 0.7) : 460;

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

// ─── Type display labels ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<TPLType, string> = {
  collectif: "Collectif, atelier, groupe",
  film: "Film",
  jeu_video: "Jeu Vidéo",
  texte: "Livre, texte, manifeste",
  musique: "Musique",
  podcast: "Podcast",
  performance: "Performance",
  video: "Vidéo",
  oeuvre_picturale: "Oeuvres picturales",
};

const TYPE_ORDER: TPLType[] = [
  "film",
  "video",
  "performance",
  "musique",
  "podcast",
  "texte",
  "collectif",
  "jeu_video",
  "oeuvre_picturale",
];

// ─── VersoPage component ──────────────────────────────────────────────────────

function VersoPage({
  items,
  canvasAudio,
  filesById,
  canvasW,
  canvasH,
}: {
  items: CanvasItem[];
  canvasAudio: { id: string; fileId: string }[];
  filesById: Map<string, MediaFile>;
  canvasW: number;
  canvasH: number;
}) {
  const allFileIds = useMemo(
    () => [
      ...items.map((i) => i.fileId),
      ...canvasAudio.map((a) => a.fileId),
    ],
    [items, canvasAudio]
  );

  // Collect unique refs + unmatched items from canvas
  const { refsByType, unmatched } = useMemo(() => {
    const seen = new Set<string>();
    const map = new Map<TPLType, TPLReference[]>();
    const unmatched: { id: string; name: string }[] = [];
    const seenUnmatched = new Set<string>();

    for (const fileId of allFileIds) {
      const file = filesById.get(fileId);
      if (!file) continue;

      if (file.ref) {
        const ref = file.ref;
        if (!seen.has(ref.id)) {
          seen.add(ref.id);
          if (!map.has(ref.type)) map.set(ref.type, []);
          map.get(ref.type)!.push(ref);
        }
      } else {
        if (!seenUnmatched.has(file.id)) {
          seenUnmatched.add(file.id);
          unmatched.push({ id: file.id, name: file.name });
        }
      }
    }

    return { refsByType: map, unmatched };
  }, [allFileIds, filesById]);

  const hasContent = refsByType.size > 0 || unmatched.length > 0;
  const activeTypes = TYPE_ORDER.filter((t) => refsByType.has(t));

  return (
    <div
      style={{
        width: canvasW,
        height: canvasH,
        background: "white",
        padding: "20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexShrink: 0,
        }}
      >
        <div
          className="gertrude"
          style={{ fontSize: "28px", lineHeight: 1.1, fontWeight: 600 }}
        >
          témoigner pour lutter
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            className="mono"
            style={{
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#52525b",
            }}
          >
            ely&amp;marion collective
          </div>
          <div
            className="mono"
            style={{
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#a1a1aa",
            }}
          >
            @ely.marion.collective
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          borderTop: "1px dashed #d4d4d8",
          margin: "10px 0 12px 0",
          flexShrink: 0,
        }}
      />

      {/* Body */}
      {!hasContent ? (
        <div
          className="mono"
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#a1a1aa",
            paddingTop: "8px",
          }}
        >
          Ajoutez des médias au canvas pour générer les références
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            columnCount: (activeTypes.length + (unmatched.length > 0 ? 1 : 0)) <= 2 ? 2 : 3,
            columnGap: "16px",
          }}
        >
          {activeTypes.map((type) => {
            const refs = refsByType.get(type)!;
            return (
              <div key={type} style={{ breakInside: "avoid", marginBottom: "12px" }}>
                <div
                  className="gertrude"
                  style={{
                    fontSize: "11px",
                    fontStyle: "italic",
                    borderBottom: "1px dashed #d4d4d8",
                    paddingBottom: "3px",
                    marginBottom: "5px",
                    color: "#3f3f46",
                  }}
                >
                  {TYPE_LABELS[type]}
                </div>
                {refs.map((ref) => {
                  const yearStr = ref.year
                    ? String(ref.year)
                    : ref.yearRange
                    ? `${ref.yearRange.start}–${ref.yearRange.end}`
                    : null;
                  return (
                    <div
                      key={ref.id}
                      className="gertrude"
                      style={{ fontSize: "10px", lineHeight: 1.4, marginBottom: "4px", color: "#27272a" }}
                    >
                      <span style={{ fontWeight: 500 }}>{ref.title}</span>
                      {ref.creator ? <span style={{ color: "#71717a" }}> — {ref.creator}</span> : null}
                      {yearStr ? <span style={{ color: "#a1a1aa" }}> ({yearStr})</span> : null}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {unmatched.length > 0 && (
            <div style={{ breakInside: "avoid", marginBottom: "12px" }}>
              <div
                className="gertrude"
                style={{
                  fontSize: "11px",
                  fontStyle: "italic",
                  borderBottom: "1px dashed #d4d4d8",
                  paddingBottom: "3px",
                  marginBottom: "5px",
                  color: "#3f3f46",
                }}
              >
                À référencer
              </div>
              {unmatched.map(({ id, name }) => (
                <div
                  key={id}
                  className="gertrude"
                  style={{ fontSize: "10px", lineHeight: 1.4, marginBottom: "4px", color: "#a1a1aa" }}
                >
                  Connecter la référence
                  <span style={{ color: "#d4d4d8" }}> — {name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── WaveMini ─────────────────────────────────────────────────────────────────

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

// ─── PoolCard ─────────────────────────────────────────────────────────────────

function PoolCard({
  f,
  style,
  onPointerDown,
}: {
  f: MediaFile;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="absolute bg-white border border-zinc-200 select-none overflow-hidden"
      style={style}
      onPointerDown={onPointerDown}
    >
      <div className="absolute inset-0">
        {f.kind === "video" ? (
          <video
            src={f.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <img
            src={f.url}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-white/35" />
      </div>

      <div className="relative p-3">
        <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
          {f.kind.toUpperCase()}
        </div>

        <div className="mt-2 text-[13px] leading-snug text-zinc-900">
          {trunc(f.name, 40)}
        </div>

        <div className="mt-2 mono text-[10px] uppercase tracking-widest text-zinc-500">
          drag
        </div>
      </div>
    </div>
  );
}

// ─── CanvasBlock ──────────────────────────────────────────────────────────────

function CanvasBlock({
  f,
  selected,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  f: MediaFile;
  selected: boolean;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  if (f.kind === "audio") {
    return (
      <div
        className={[
          "absolute bg-white border border-dashed border-zinc-300 select-none overflow-hidden",
          selected ? "outline outline-1 outline-black" : "",
        ].join(" ")}
        style={style}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="px-3 h-full flex flex-col justify-center gap-2">
          <WaveMini seed={f.id.length * 33} />
          <audio
            controls
            preload="none"
            src={f.url}
            className="w-full"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "absolute bg-white select-none overflow-hidden",
        selected ? "outline outline-1 outline-black" : "",
      ].join(" ")}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute inset-0">
        {f.kind === "video" ? (
          <video
            src={f.url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <img
            src={f.url}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── DIYPage ──────────────────────────────────────────────────────────────────

export default function DIYPage() {
  const [visualFiles, setVisualFiles] = useState<MediaFile[]>([]);
  const [audioFiles, setAudioFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showVerso, setShowVerso] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const allRefs = getAllReferences();
        const refLookup = buildRefLookup(allRefs);

        const [imgData, streamData, audData] = await Promise.all([
          fetch("/api/bunny/list?folder=images").then((r) => r.json()),
          fetch("/api/bunny/stream").then((r) => r.json()),
          fetch("/api/bunny/list?folder=audio").then((r) => r.json()),
        ]);

        if (cancelled) return;

        const images: MediaFile[] = (imgData.files ?? [])
          .filter((f: string) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f))
          .map(toMediaFile("images", "image", refLookup));

        const videos: MediaFile[] = (streamData.videos ?? []).map(
          (v: StreamVideo) => streamToMediaFile(v, refLookup)
        );

        const audios: MediaFile[] = (audData.files ?? [])
          .filter((f: string) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f))
          .map(toMediaFile("audio", "audio", refLookup));

        setVisualFiles([...images, ...videos]);
        setAudioFiles(audios);
      } catch (e) {
        console.error("[DIY] fetch error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filesById = useMemo(() => {
    const m = new Map<string, MediaFile>();
    for (const f of [...visualFiles, ...audioFiles]) m.set(f.id, f);
    return m;
  }, [visualFiles, audioFiles]);

  const [poolSeed, setPoolSeed] = useState(1);

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [canvasAudio, setCanvasAudio] = useState<{ id: string; fileId: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasCaptureRef = useRef<HTMLDivElement | null>(null);
  const versoRef = useRef<HTMLDivElement | null>(null);
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

  const topOffset = stageSize.w > 0 && stageSize.w < 640 ? 20 : 78;
  const rects = useMemo(() => {
    return getCanvasRectInStage({ stageW: stageSize.w || 1200, topOffset });
  }, [stageSize.w, topOffset]);

  const poolFiles = useMemo(() => {
    const rand = mulberry32(poolSeed * 999);
    const shuffled = [...visualFiles].sort(() => rand() - 0.5);
    return shuffled.slice(0, 26);
  }, [visualFiles, poolSeed]);

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
      files: poolFiles,
      count: 26,
      stageW,
      stageH,
      avoidRects: avoid,
    });
  }, [poolFiles, poolSeed, rects.canvas, rects.console, stageSize.w, stageSize.h]);

  const tileData = useMemo(() => {
    return poolTiles
      .map((t) => {
        const f = filesById.get(t.fileId);
        if (!f) return null;
        return { tile: t, file: f };
      })
      .filter((x): x is { tile: PoolTile; file: MediaFile } => Boolean(x));
  }, [poolTiles, filesById]);

  const audioList = useMemo(() => {
    const rand = mulberry32(poolSeed * 2027);
    const shuffled = [...audioFiles].sort(() => rand() - 0.5);
    return shuffled;
  }, [audioFiles, poolSeed]);

  const dragRef = useRef<{
    fileId: string;
    kind: MediaKind;
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
    fileId: string;
    kind: MediaKind;
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
      fileId: tile.fileId,
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
      fileId: tile.fileId,
      kind: tile.kind,
    });

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const beginDragAudio = (e: React.PointerEvent, fileId: string) => {
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
      fileId,
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
      fileId,
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

      if (d.kind === "audio") {
        const audioId = `audio-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        setCanvasAudio((prev) => [...prev, { id: audioId, fileId: d.fileId }]);
      } else {
        const w = 300;
        const h = 190;
        const id = `canvas-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        setItems((prev) => [
          ...prev,
          {
            id,
            fileId: d.fileId,
            kind: d.kind,
            x: clamp(localX - w / 2, 10, c.w - w - 10),
            y: clamp(localY - h / 2, 10, c.h - h - 10),
            w,
            h,
          },
        ]);
      }
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

  const resizeRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const MIN_W = 120;
  const MIN_H = 90;

  const onResizeDown = (e: React.PointerEvent, it: CanvasItem) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedId(it.id);

    resizeRef.current = {
      id: it.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: it.w,
      startH: it.h,
    };

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - r.startClientX;
    const dy = e.clientY - r.startClientY;

    const c = rects.canvas;

    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== r.id) return p;

        let nextW = Math.max(MIN_W, r.startW + dx);
        let nextH = Math.max(MIN_H, r.startH + dy);

        nextW = Math.min(nextW, c.w - p.x - 10);
        nextH = Math.min(nextH, c.h - p.y - 10);

        return { ...p, w: nextW, h: nextH };
      })
    );
  };

  const onResizeUp = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = null;
  };

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
    setCanvasAudio([]);
    setSelectedId(null);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };

  // ─── Export: 2-page PDF (recto + verso) ────────────────────────────────────

  const downloadPDF = async () => {
    const rectoNode = canvasCaptureRef.current;
    const versoNode = versoRef.current;
    if (!rectoNode || !versoNode) return;

    const { toPng } = await import("html-to-image");
    const { jsPDF } = await import("jspdf");

    const [rectoDataUrl, versoDataUrl] = await Promise.all([
      toPng(rectoNode, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" }),
      toPng(versoNode, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" }),
    ]);

    const loadImage = (url: string) =>
      new Promise<HTMLImageElement>((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.src = url;
      });

    const [rectoImg, versoImg] = await Promise.all([
      loadImage(rectoDataUrl),
      loadImage(versoDataUrl),
    ]);

    const pdf = new jsPDF({
      orientation: rectoImg.width > rectoImg.height ? "landscape" : "portrait",
      unit: "px",
      format: [rectoImg.width, rectoImg.height],
    });

    pdf.addImage(rectoDataUrl, "PNG", 0, 0, rectoImg.width, rectoImg.height);

    pdf.addPage([versoImg.width, versoImg.height]);
    pdf.addImage(versoDataUrl, "PNG", 0, 0, versoImg.width, versoImg.height);

    pdf.save("temoigner-pour-lutter.pdf");
  };

  const [videoExporting, setVideoExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sharedDone, setSharedDone] = useState(false);
  const [shareError, setShareError] = useState("");

  const shareCreation = async () => {
    const node = canvasCaptureRef.current;
    if (!node) return;
    setSharing(true);
    setSharedDone(false);
    setShareError("");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const fd = new FormData();
      fd.append("file", blob, "creation.png");
      const res = await fetch("/api/bunny/upload", { method: "POST", body: fd });
      if (res.ok) {
        setSharedDone(true);
      } else {
        const json = await res.json().catch(() => ({}));
        setShareError(json.error ?? `Erreur ${res.status}`);
      }
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSharing(false);
    }
  };

  const downloadVideo = async () => {
    const rectoNode = canvasCaptureRef.current;
    const versoNode = versoRef.current;
    if (!rectoNode || !versoNode) return;

    setVideoExporting(true);
    try {
      const { toPng } = await import("html-to-image");

      // Capture both sides as images
      const [rectoDataUrl, versoDataUrl] = await Promise.all([
        toPng(rectoNode, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" }),
        toPng(versoNode, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" }),
      ]);

      const loadImage = (url: string) =>
        new Promise<HTMLImageElement>((res) => {
          const img = new Image();
          img.onload = () => res(img);
          img.src = url;
        });

      const [rectoImg, versoImg] = await Promise.all([
        loadImage(rectoDataUrl),
        loadImage(versoDataUrl),
      ]);

      // Create offscreen canvas matching recto dimensions
      const offscreen = document.createElement("canvas");
      offscreen.width = rectoImg.naturalWidth;
      offscreen.height = rectoImg.naturalHeight;
      const ctx = offscreen.getContext("2d")!;

      // Draw recto first
      ctx.drawImage(rectoImg, 0, 0);

      const preferredMime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const fps = 30;
      const rectoDuration = 8000;  // 8 seconds recto
      const versoDuration = 4000;  // 4 seconds verso

      // Set up audio from canvasAudio items
      let audioTracks: MediaStreamTrack[] = [];
      let audioElements: HTMLAudioElement[] = [];
      let audioCtx: AudioContext | null = null;

      if (canvasAudio.length > 0) {
        audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();

        for (const { fileId } of canvasAudio) {
          const file = filesById.get(fileId);
          if (!file) continue;
          const audioEl = new Audio(file.url);
          audioEl.crossOrigin = "anonymous";
          audioEl.loop = true;
          audioElements.push(audioEl);
          const src = audioCtx.createMediaElementSource(audioEl);
          src.connect(dest);
          src.connect(audioCtx.destination);
        }

        audioTracks = dest.stream.getAudioTracks();
      }

      // Build combined stream: video + optional audio
      const videoStream = offscreen.captureStream(fps);
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioTracks,
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType: preferredMime });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      // Start audio playback
      for (const audioEl of audioElements) {
        await audioEl.play().catch(() => {});
      }

      recorder.start(250);

      // Show recto for rectoDuration
      await new Promise<void>((res) => setTimeout(res, rectoDuration));

      // Switch canvas to verso (scale to fit if dimensions differ)
      ctx.clearRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(
        versoImg,
        0,
        0,
        offscreen.width,
        offscreen.height,
      );

      // Show verso for versoDuration
      await new Promise<void>((res) => setTimeout(res, versoDuration));

      recorder.stop();
      await new Promise<void>((res) => { recorder.onstop = () => res(); });

      // Stop audio
      for (const audioEl of audioElements) {
        audioEl.pause();
        audioEl.src = "";
      }
      audioCtx?.close();

      const blob = new Blob(chunks, { type: preferredMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "temoigner-pour-lutter.webm";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setVideoExporting(false);
    }
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

              <h1 className="mt-3 gertrude text-[30px] leading-[1.15] font-semibold tracking-tight">
                drag → compose → export
              </h1>

              <div className="mt-2 mono text-[11px] uppercase tracking-widest text-zinc-400">
                {loading
                  ? "loading media…"
                  : `${visualFiles.length} visuals · ${audioFiles.length} audio`}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex justify-start lg:justify-end">
              <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                <button
                  className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                  onClick={refresh}
                  type="button"
                >
                  refresh
                </button>

                <button
                  className="border px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                  onClick={() => setShowVerso(false)}
                  type="button"
                  style={!showVerso ? { borderColor: "#27272a", background: "#27272a", color: "#fff" } : { borderColor: "#d4d4d8", background: "white", color: "#71717a" }}
                >
                  recto
                </button>
                <button
                  className="border px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                  onClick={() => setShowVerso(true)}
                  type="button"
                  style={showVerso ? { borderColor: "#27272a", background: "#27272a", color: "#fff" } : { borderColor: "#d4d4d8", background: "white", color: "#71717a" }}
                >
                  verso
                </button>

                <button
                  className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0"
                  onClick={downloadPDF}
                  type="button"
                >
                  pdf
                </button>

                <button
                  className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0 disabled:opacity-40"
                  onClick={downloadVideo}
                  type="button"
                  disabled={videoExporting}
                >
                  {videoExporting ? "enregistrement…" : "vidéo"}
                </button>

                <div className="flex flex-col items-start gap-1">
                  <button
                    className="border border-black bg-black text-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0 disabled:opacity-40"
                    onClick={shareCreation}
                    type="button"
                    disabled={sharing || (items.length === 0 && canvasAudio.length === 0)}
                    title="Partager sur la page Créations"
                  >
                    {sharing ? "envoi…" : sharedDone ? "partagé ✓" : "partager"}
                  </button>
                  {shareError && (
                    <div className="mono text-[10px] text-red-500 max-w-[180px] leading-tight">{shareError}</div>
                  )}
                </div>

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

          <div className="mt-6 border-t border-zinc-200" />

          <div className="mt-4">
            <div
              ref={stageRef}
              className="relative w-full overflow-hidden"
              style={{
                height: rects.totalH + 16,
                overscrollBehaviorX: "none",
                touchAction: "none",
              }}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {/* Pool tiles (only shown when recto) */}
              {!showVerso &&
                tileData.map(({ tile, file }) => {
                  const style: React.CSSProperties = {
                    left: tile.x,
                    top: tile.y,
                    width: tile.w,
                    height: tile.h,
                  };

                  return (
                    <PoolCard
                      key={tile.id}
                      f={file}
                      style={style}
                      onPointerDown={(e) => beginDragVisual(e, tile)}
                    />
                  );
                })}

              <div
                className="absolute"
                style={{
                  left: rects.canvas.x,
                  top: rects.canvas.y,
                  width: rects.canvas.w,
                  height: rects.canvas.h + 18 + rects.console.h,
                  background: "#fff",
                }}
              >
                {/* Canvas area — recto or verso */}
                {showVerso ? (
                  <div
                    ref={canvasCaptureRef}
                    style={{
                      width: rects.canvas.w,
                      height: rects.canvas.h,
                      border: "1px solid #e4e4e7",
                      background: "white",
                    }}
                  >
                    <VersoPage
                      items={items}
                      canvasAudio={canvasAudio}
                      filesById={filesById}
                      canvasW={rects.canvas.w}
                      canvasH={rects.canvas.h}
                    />
                  </div>
                ) : (
                  <div
                    ref={canvasCaptureRef}
                    className="absolute bg-white"
                    style={{
                      left: 0,
                      top: 0,
                      width: rects.canvas.w,
                      height: rects.canvas.h,
                      border: "1px dashed #d4d4d8",
                    }}
                    onPointerDown={() => setSelectedId(null)}
                  >
                    {items.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="mono text-[11px] uppercase tracking-[0.22em] text-black/20">
                          drag media here
                        </div>
                      </div>
                    )}

                    {items.map((it) => {
                      const f = filesById.get(it.fileId);
                      if (!f) return null;

                      return (
                        <div
                          key={it.id}
                          className={[
                            "absolute bg-white select-none overflow-hidden",
                            selectedId === it.id ? "outline outline-1 outline-black" : "",
                          ].join(" ")}
                          style={{ left: it.x, top: it.y, width: it.w, height: it.h }}
                          onPointerDown={(e) => onBlockDown(e, it)}
                          onPointerMove={onBlockMove}
                          onPointerUp={onBlockUp}
                          onPointerCancel={onBlockUp}
                        >
                          <CanvasBlock
                            f={f}
                            selected={selectedId === it.id}
                            style={{ left: 0, top: 0, width: it.w, height: it.h }}
                            onPointerDown={() => {}}
                            onPointerMove={() => {}}
                            onPointerUp={() => {}}
                          />
                          {selectedId === it.id ? (
                            <div
                              className="absolute right-1 bottom-1 h-3 w-3 border border-black bg-white cursor-se-resize"
                              onPointerDown={(e) => onResizeDown(e, it)}
                              onPointerMove={onResizeMove}
                              onPointerUp={onResizeUp}
                              onPointerCancel={onResizeUp}
                              title="resize"
                            />
                          ) : null}
                        </div>
                      );
                    })}

                    {/* Audio strip — pinned to the bottom of the canvas */}
                    {canvasAudio.length > 0 && (
                      <div
                        className="absolute inset-x-0 bottom-0 bg-white"
                        style={{ borderTop: "1px dashed #d4d4d8" }}
                      >
                        <div className="flex overflow-x-auto divide-x divide-dashed divide-zinc-200">
                          {canvasAudio.map(({ id, fileId }) => {
                            const f = filesById.get(fileId);
                            if (!f) return null;
                            return (
                              <div key={id} className="flex items-center gap-2 px-3 py-2 shrink-0">
                                <WaveMini seed={fileId.length * 13} />
                                <audio
                                  src={f.url}
                                  controls
                                  preload="none"
                                  style={{ height: "28px", width: "200px" }}
                                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                                />
                                <button
                                  type="button"
                                  className="mono text-[10px] text-black/25 hover:text-black/70 leading-none"
                                  onClick={() => setCanvasAudio((prev) => prev.filter((a) => a.id !== id))}
                                >×</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio console (not captured) */}
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
                        {audioList.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between gap-4 px-3 py-2 hover:bg-zinc-50"
                          >
                            <button
                              type="button"
                              className="min-w-0 text-left"
                              onPointerDown={(e) => beginDragAudio(e, f.id)}
                            >
                              <div className="mono text-[10px] uppercase tracking-widest text-zinc-500">
                                AUDIO
                              </div>
                              <div className="mt-1 text-[12px] text-zinc-900 truncate">
                                {f.name}
                              </div>
                              <div className="mt-1 mono text-[10px] uppercase tracking-widest text-zinc-400">
                                drag to canvas
                              </div>
                            </button>

                            <div className="flex items-center gap-3">
                              <WaveMini seed={f.id.length * 17} />
                              <audio
                                controls
                                preload="none"
                                src={f.url}
                                className="w-[120px] sm:w-[260px]"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          </div>
                        ))}

                        {!loading && audioList.length === 0 ? (
                          <div className="p-3 mono text-[11px] uppercase tracking-widest text-zinc-400">
                            no audio found
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ghost drag preview */}
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
                        {trunc(filesById.get(ghost.fileId)?.name ?? "—", 48)}
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

      {/* Hidden verso div for PDF capture — always rendered off-screen */}
      <div
        style={{
          position: "absolute",
          left: "-99999px",
          top: 0,
          width: rects.canvas.w,
          height: rects.canvas.h,
        }}
      >
        <div
          ref={versoRef}
          style={{
            width: rects.canvas.w,
            height: rects.canvas.h,
            background: "white",
          }}
        >
          <VersoPage
            items={items}
            canvasAudio={canvasAudio}
            filesById={filesById}
            canvasW={rects.canvas.w}
            canvasH={rects.canvas.h}
          />
        </div>
      </div>
    </main>
  );
}
