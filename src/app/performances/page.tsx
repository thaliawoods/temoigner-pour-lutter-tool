"use client";

import { useEffect, useState } from "react";

const STREAM_CDN = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? "";

type StreamVideo = {
  guid: string;
  title: string;
  thumbnailFileName: string;
  length: number;
};

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

export default function PerformancesPage() {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<StreamVideo[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const res = await fetch("/api/bunny/stream");
        if (!res.ok) throw new Error("stream fetch failed");
        const data: { videos: StreamVideo[] } = await res.json();
        if (cancelled) return;
        setVideos(data.videos ?? []);
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
  }, []);

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
                    {stripExtension(v.title)}
                  </h2>
                  {v.length > 0 && (
                    <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                      {formatDuration(v.length)}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
