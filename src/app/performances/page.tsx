"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const BUCKET = "tpl-web";
const FOLDER = "performance"; 

type Performance = {
  id: string;
  title: string;
  year?: number;
  location?: string;
  credits?: string;
  videoSrc?: string | null;
  path: string;
};

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

function buildPublicUrl(supabase: SupabaseClient, path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function isVideoName(name: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/i.test(name);
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
  if (p.location) parts.push(p.location);
  if (p.credits) parts.push(p.credits);
  return parts.length ? parts.join(" · ") : "—";
}

export default function PerformancesPage() {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [performances, setPerformances] = useState<Performance[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);

      if (!supabase) {
        console.warn("[SUPABASE] missing env vars");
        setLoading(false);
        return;
      }

      try {
        const res = await supabase.storage.from(BUCKET).list(FOLDER, {
          limit: 1000,
          offset: 0,
          sortBy: { column: "name", order: "asc" },
        });

        if (cancelled) return;

        const files =
          res.data?.filter((f) => !!f.name && isVideoName(f.name)) ?? [];

        const items: Performance[] = files.map((f) => {
          const path = `${FOLDER}/${f.name}`;
          const url = buildPublicUrl(supabase, path);

          const year = parseYearFromFilename(f.name);
          const title = f.name.replace(/\.[a-z0-9]+$/i, "");

          return {
            id: slugify(f.name),
            title,
            year,
            location: "—",
            credits: "Ely & Marion Collective",
            videoSrc: url,
            path,
          };
        });

        console.log("[SUPABASE] performances videos", items.length);
        console.log("[SUPABASE] example", items[0]);

        setPerformances(items);
      } catch (e) {
        console.error("[SUPABASE] list error", e);
      } finally {
        setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          performances
        </div>

        <div className="mt-4 mono text-[12px] opacity-60">
          {loading
            ? "loading…"
            : `videos: ${performances.length} (bucket: ${BUCKET}/${FOLDER})`}
        </div>

        <div className="mt-10 space-y-12">
          {!loading && performances.length === 0 && (
            <div className="border border-zinc-200 bg-zinc-50 p-6">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                no media found
              </div>
              <div className="mt-2 text-sm text-zinc-700">
                Rien trouvé dans <span className="mono">{BUCKET}/{FOLDER}/</span>
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

                <div className="mt-3 text-sm text-zinc-600">
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                    id
                  </span>{" "}
                  — {p.id}
                </div>

                <div className="mt-2 text-sm text-zinc-600">
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                    path
                  </span>{" "}
                  — {p.path}
                </div>

                <div className="mt-4 text-sm text-zinc-700">
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    note
                  </span>{" "}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
