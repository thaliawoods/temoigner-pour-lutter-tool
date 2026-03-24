"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
const STREAM_CDN = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? "";

type MediaKind = "image" | "video" | "audio";

type MediaFile = {
  id: string;
  path: string;
  url: string;
  kind: MediaKind;
  name: string;
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

function streamToMediaFile(v: StreamVideo): MediaFile {
  return {
    id: `stream-${v.guid}`,
    path: `stream/${v.guid}`,
    url: `${STREAM_CDN}/${v.guid}/play_720p.mp4`,
    kind: "video",
    name: stripExtension(v.title),
  };
}

function toMediaFile(folder: string, kind: MediaKind) {
  return (name: string): MediaFile => {
    const path = `${folder}/${name}`;
    return {
      id: path,
      path,
      url: buildPublicUrl(path),
      kind,
      name: stripExtension(name),
    };
  };
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
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
          />
        ) : (
          <img
            src={f.url}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
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
                {trunc(f.name, 48)}
              </div>
            </div>
            <WaveMini seed={f.id.length * 33} />
          </div>

          <audio
            controls
            preload="none"
            src={f.url}
            className="w-full"
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
          />
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
      <div className="absolute inset-0">
        {f.kind === "video" ? (
          <video
            src={f.url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
          />
        ) : (
          <img
            src={f.url}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
          />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3 bg-white/70 backdrop-blur-[2px]">
        <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
          {f.kind.toUpperCase()}
        </div>
        <div className="mt-1 text-[12px] leading-snug text-zinc-900">
          {trunc(f.name, 44)}
        </div>
      </div>
    </div>
  );
}

export default function DIYPage() {
  const [visualFiles, setVisualFiles] = useState<MediaFile[]>([]);
  const [audioFiles, setAudioFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const [imgData, streamData, audData] = await Promise.all([
          fetch("/api/bunny/list?folder=images").then((r) => r.json()),
          fetch("/api/bunny/stream").then((r) => r.json()),
          fetch("/api/bunny/list?folder=audio").then((r) => r.json()),
        ]);

        if (cancelled) return;

        const images: MediaFile[] = (imgData.files ?? [])
          .filter((f: string) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f))
          .map(toMediaFile("images", "image"));

        const videos: MediaFile[] = (streamData.videos ?? []).map(streamToMediaFile);

        const audios: MediaFile[] = (audData.files ?? [])
          .filter((f: string) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f))
          .map(toMediaFile("audio", "audio"));

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasCaptureRef = useRef<HTMLDivElement | null>(null);
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

      const w = d.kind === "audio" ? 380 : 300;
      const h = d.kind === "audio" ? 128 : 190;

      setItems((prev) => {
        const id = `canvas-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        return [
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
    setSelectedId(null);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((p) => p.id !== selectedId));
    setSelectedId(null);
  };

  const downloadPDF = async () => {
    const node = canvasCaptureRef.current;
    if (!node) return;

    const { toPng } = await import("html-to-image");
    const { jsPDF } = await import("jspdf");

    const dataUrl = await toPng(node, {
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
      orientation: img.width > img.height ? "landscape" : "portrait",
      unit: "px",
      format: [img.width, img.height],
    });

    pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
    pdf.save("diy-canvas.pdf");
  };

  const downloadVideo = async () => {
    const ref = canvasCaptureRef.current;
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
    a.download = "diy-canvas.webm";
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

              <h1 className="mt-3 text-[30px] leading-[1.15] font-semibold tracking-tight">
                drag → compose → export
              </h1>

              <div className="mt-2 mono text-[11px] uppercase tracking-widest text-zinc-400">
                {loading
                  ? "loading media…"
                  : `${visualFiles.length} visuals · ${audioFiles.length} audio`}
              </div>
            </div>

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
              {tileData.map(({ tile, file }) => {
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
                {/* canvas (captured for export) */}
                <div
                  ref={canvasCaptureRef}
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
                      drag media here
                    </div>
                  </div>

                  {items.map((it) => {
                    const f = filesById.get(it.fileId);
                    if (!f) return null;

                    return (
                      <div
                        key={it.id}
                        className={[
                          "absolute bg-white border border-zinc-200 select-none overflow-hidden",
                          selectedId === it.id
                            ? "outline outline-1 outline-black"
                            : "",
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
                </div>

                {/* audio console (not captured) */}
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
                                className="w-[260px]"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = "none";
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
    </main>
  );
}
