"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
const FOLDER = "performances";

// ✅ seules ces vidéos seront affichées (sans extension)
const ALLOWED_PERFORMANCE_VIDEOS = new Set([
  "Video 29-10-2025 12 54 13",
  "Video 25-11-2025 18 26 24",
  "Video 25-10-2023 16 51 39",
  "Video 23-07-2025 16 33 39",
  "Video 21-07-2025 17 25 01",
  "Video 21-07-2025 17 23 15",
  "Video 13-03-2025 21 03 23",
  "Video 13-03-2025 20 51 39",
  "Video 03-05-2025 20 46 55",
  "Video 03-05-2025 20 34 53",
  "Video 03-05-2025 20 24 07",
  "Video 03-05-2025 20 18 03",
]);

type Performance = {
  id: string;
  title: string;
  year?: number;
  location?: string;
  credits?: string;
  videoSrc?: string | null;
  path: string;
};

function buildPublicUrl(path: string): string {
  if (!CDN_URL) return "";
  const encoded = path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `${CDN_URL}/${encoded}`;
}

function isVideoName(name: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(name);
}

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseYearFromFilename(filename: string): number | undefined {
  const m = filename.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return undefined;
  const year = Number(m[3]);
  return Number.isFinite(year) ? year : undefined;
}

function metaLine(p: Performance) {
  const parts: string[] = [];
  if (p.year) parts.push(String(p.year));
  if (p.location && p.location !== "—") parts.push(p.location);
  if (p.credits) parts.push(p.credits);
  return parts.length ? parts.join(" - ") : "—";
}

export default function PerformancesPage() {
  const [loading, setLoading] = useState(true);
  const [performances, setPerformances] = useState<Performance[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);

      try {
        const res = await fetch(`/api/bunny/list?folder=${FOLDER}`);
        if (!res.ok) throw new Error("list failed");

        const data: { files: string[] } = await res.json();

        if (cancelled) return;

        const files = (data.files ?? [])
          .filter((name) => isVideoName(name))
          .filter((name) => ALLOWED_PERFORMANCE_VIDEOS.has(stripExtension(name)));

        const items: Performance[] = files.map((name) => {
          const path = `${FOLDER}/${name}`;
          const url = buildPublicUrl(path);
          const year = parseYearFromFilename(name);
          const title = stripExtension(name);

          return {
            id: slugify(name),
            title,
            year,
            location: undefined,
            credits: "Ely & Marion Collective",
            videoSrc: url,
            path,
          };
        });

        console.log("[BUNNY] performances videos", items.length);

        setPerformances(items);
      } catch (e) {
        console.error("[BUNNY] list error", e);
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
          {loading ? "loading…" : `videos: ${performances.length}`}
        </div>

        <div className="mt-10 space-y-12">
          {!loading && performances.length === 0 && (
            <div className="border border-zinc-200 bg-zinc-50 p-6">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                no media found
              </div>
              <div className="mt-2 text-sm text-zinc-700">
                Rien trouvé dans{" "}
                <span className="mono">{FOLDER}/</span>
              </div>
            </div>
          )}

          {performances.map((p) => (
            <article key={p.id} className="border border-zinc-200 bg-white">
              <div className="w-full bg-zinc-50 border-b border-zinc-200">
                {p.videoSrc ? (
                  <video
                    src={p.videoSrc}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-auto w-full"
                    onError={() =>
                      console.warn("[VIDEO] error:", p.path, p.videoSrc)
                    }
                  />
                ) : (
                  <div className="aspect-video w-full flex items-center justify-center">
                    <div className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                      video placeholder
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-xl font-medium leading-snug">{p.title}</h2>
                  <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    {metaLine(p)}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
