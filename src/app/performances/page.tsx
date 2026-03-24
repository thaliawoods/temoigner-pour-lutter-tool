"use client";

import { useEffect, useMemo, useState } from "react";
import { getAllReferences } from "@/lib/references";
import type { TPLReference } from "@/lib/schema";

const STREAM_CDN = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? "";

type StreamVideo = {
  guid: string;
  title: string;
  thumbnailFileName: string;
  length: number;
};

type PerformanceItem = {
  ref: TPLReference;
  guid: string;
  thumbnailFileName: string;
  length: number;
};

function formatDuration(seconds: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function normKey(s: string): string {
  return s
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function basename(src: string): string {
  return src.split("/").pop() ?? src;
}

function getVideoSrcs(ref: TPLReference): string[] {
  const srcs: string[] = [];
  const m = ref.media as unknown;
  if (Array.isArray(m)) {
    for (const item of m as { kind?: string; src?: string }[])
      if (item?.kind === "video" && item.src) srcs.push(item.src);
  } else if (m && typeof m === "object") {
    const item = m as { kind?: string; src?: string };
    if (item.kind === "video" && item.src) srcs.push(item.src);
  }
  if (ref.mediaGallery) {
    for (const item of ref.mediaGallery)
      if (item.kind === "video" && item.src) srcs.push(item.src);
  }
  return srcs;
}

export default function PerformancesPage() {
  const allRefs = useMemo(() => getAllReferences(), []);
  const performanceRefs = useMemo(
    () => allRefs.filter((r) => r.type === "performance"),
    [allRefs]
  );

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PerformanceItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch("/api/bunny/stream");
        if (!res.ok) throw new Error("stream fetch failed");
        const data: { videos: StreamVideo[] } = await res.json();
        if (cancelled) return;

        const streamByKey = new Map<string, StreamVideo>();
        for (const v of data.videos ?? []) streamByKey.set(normKey(v.title), v);

        const matched: PerformanceItem[] = [];
        for (const ref of performanceRefs) {
          for (const src of getVideoSrcs(ref)) {
            const sv = streamByKey.get(normKey(basename(src)));
            if (sv) {
              matched.push({ ref, guid: sv.guid, thumbnailFileName: sv.thumbnailFileName, length: sv.length ?? 0 });
              break;
            }
          }
        }
        setItems(matched);
      } catch (e) {
        console.error("[performances] stream error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [performanceRefs]);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          performances
        </div>
        <h1 className="mt-2 text-3xl font-medium">extraits</h1>

        <div className="mt-10 space-y-12">
          {!loading && items.length === 0 && (
            <div className="border border-zinc-200 bg-zinc-50 p-6">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                aucune performance trouvée
              </div>
            </div>
          )}

          {items.map((item) => (
            <article key={item.guid} className="border border-zinc-200 bg-white">
              <div className="w-full bg-zinc-50 border-b border-zinc-200">
                <video
                  src={`${STREAM_CDN}/${item.guid}/play_720p.mp4`}
                  poster={`${STREAM_CDN}/${item.guid}/${item.thumbnailFileName}`}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-auto w-full"
                  onError={(e) => {
                    const article = (e.currentTarget as HTMLElement).closest("article");
                    if (article) (article as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-xl font-medium leading-snug">
                    {item.ref.title}
                  </h2>
                  <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    {item.ref.year ? String(item.ref.year) : ""}
                    {item.length > 0 ? (item.ref.year ? " · " : "") + formatDuration(item.length) : ""}
                  </div>
                </div>

                {item.ref.creator ? (
                  <div className="mt-1 text-sm text-zinc-600">{item.ref.creator}</div>
                ) : null}

                {item.ref.location ? (
                  <div className="mt-1 mono text-[11px] uppercase tracking-widest text-zinc-500">
                    {item.ref.location}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
