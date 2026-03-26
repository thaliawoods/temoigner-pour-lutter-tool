"use client";

import { useEffect, useState } from "react";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";

function encodePath(path: string) {
  return path.split("/").map((p) => encodeURIComponent(p)).join("/");
}

function buildUrl(filename: string) {
  return `${CDN_URL}/${encodePath(`performances/${filename}`)}`;
}

function stripExtension(s: string) {
  return s.replace(/\.[a-z0-9]+$/i, "");
}

const VIDEO_EXTS = /\.(mp4|mov|webm|mkv|avi|m4v)$/i;

export default function PerformancesPage() {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/bunny/list?folder=performances")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setFiles((d.files ?? []).filter((f: string) => VIDEO_EXTS.test(f)));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          performances
        </div>
        <h1 className="mt-2 gertrude text-3xl font-medium">extraits</h1>

        <div className="mt-10 space-y-12">
          {!loading && files.length === 0 && (
            <div className="border border-zinc-200 bg-zinc-50 p-6">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                aucune vidéo trouvée
              </div>
            </div>
          )}

          {files.map((filename) => (
            <article key={filename} className="border border-zinc-200 bg-white">
              <div className="w-full bg-zinc-50 border-b border-zinc-200">
                <video
                  src={buildUrl(filename)}
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
                <h2 className="gertrude text-xl font-medium leading-snug">
                  {stripExtension(filename)}
                </h2>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
