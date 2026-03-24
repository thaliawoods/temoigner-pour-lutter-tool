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

type EnrichedVideo = StreamVideo & { ref?: TPLReference };

function streamPlayUrl(guid: string) {
  return `${STREAM_CDN}/${guid}/play_720p.mp4`;
}

function streamPosterUrl(guid: string, thumbnailFileName: string) {
  return `${STREAM_CDN}/${guid}/${thumbnailFileName}`;
}

function stripExtension(s: string) {
  return s.replace(/\.[a-z0-9]+$/i, "");
}

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

function buildRefLookup(refs: TPLReference[]): Map<string, TPLReference> {
  const map = new Map<string, TPLReference>();
  for (const ref of refs) {
    const srcs: string[] = [];
    const m = ref.media as unknown;
    if (Array.isArray(m)) {
      for (const item of m) if (item?.src) srcs.push(item.src);
    } else if (m && typeof m === "object" && (m as { src?: string }).src) {
      srcs.push((m as { src: string }).src);
    }
    if (ref.mediaGallery) {
      for (const item of ref.mediaGallery) if (item?.src) srcs.push(item.src);
    }
    for (const src of srcs) {
      const key = normKey(basename(src));
      if (key && !map.has(key)) map.set(key, ref);
    }
  }
  return map;
}

export default function PerformancesPage() {
  const allRefs = useMemo(() => getAllReferences(), []);
  const refLookup = useMemo(() => buildRefLookup(allRefs), [allRefs]);

  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<EnrichedVideo[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch("/api/bunny/stream");
        if (!res.ok) throw new Error("stream fetch failed");
        const data: { videos: StreamVideo[] } = await res.json();
        if (cancelled) return;
        const enriched: EnrichedVideo[] = (data.videos ?? []).map((v) => ({
          ...v,
          ref: refLookup.get(normKey(v.title)),
        }));
        setVideos(enriched);
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
  }, [refLookup]);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          performances
        </div>
        <h1 className="mt-2 text-3xl font-medium">extraits</h1>

        <div className="mt-4 mono text-[12px] opacity-60">
          {loading ? "loading…" : `videos: ${videos.length}`}
        </div>

        <div className="mt-10 space-y-12">
          {!loading && videos.length === 0 && (
            <div className="border border-zinc-200 bg-zinc-50 p-6">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                no videos found
              </div>
            </div>
          )}

          {videos.map((v) => (
            <article key={v.guid} className="border border-zinc-200 bg-white">
              <div className="w-full bg-zinc-50 border-b border-zinc-200">
                <video
                  src={streamPlayUrl(v.guid)}
                  poster={streamPosterUrl(v.guid, v.thumbnailFileName)}
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
                    {v.ref?.title ?? stripExtension(v.title)}
                  </h2>
                  <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    {v.ref?.year ? String(v.ref.year) : ""}
                    {v.length > 0 ? (v.ref?.year ? " · " : "") + formatDuration(v.length) : ""}
                  </div>
                </div>

                {v.ref?.creator ? (
                  <div className="mt-1 text-sm text-zinc-600">{v.ref.creator}</div>
                ) : null}

                {v.ref?.location ? (
                  <div className="mt-1 mono text-[11px] uppercase tracking-widest text-zinc-500">
                    {v.ref.location}
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
