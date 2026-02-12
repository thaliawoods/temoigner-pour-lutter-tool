"use client";

import { useEffect, useMemo, useState } from "react";
import type { TPLMedia, TPLReference } from "@/lib/schema";
import { getAllReferences } from "@/lib/references";
import { buildPublicUrl, guessMediaForReference, listBucketMedia } from "@/lib/media";

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

function formatYear(r: TPLReference): string {
  if (r.year) return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

function hasMedia(r: TPLReference) {
  return Boolean(r.media);
}

function MediaHero({ r }: { r: TPLReference }) {
  const media = r.media;
  if (!media) {
    return (
      <div className="h-full w-full flex items-center justify-center mono text-[11px] uppercase tracking-widest text-zinc-500">
        no media
      </div>
    );
  }

  const url = buildPublicUrl(media.src);

  if (media.kind === "image") {
    return <img src={url} alt={media.alt ?? r.title} className="h-full w-full object-cover" />;
  }

  if (media.kind === "video") {
    return <video src={url} className="h-full w-full object-cover" muted playsInline controls preload="metadata" poster={media.poster} />;
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-50">
      <audio src={url} controls preload="metadata" className="w-[92%]" />
    </div>
  );
}

export default function ArchivesSplitView() {
  const refs = useMemo(() => getAllReferences(), []);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(() => refs[0]?.id ?? "");

  const [mediaPool, setMediaPool] = useState<Awaited<ReturnType<typeof listBucketMedia>> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const next = await listBucketMedia();
        if (cancelled) return;
        setMediaPool(next);
      } catch {
        if (cancelled) return;
        setMediaPool(null);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    if (!mediaPool) return refs;
    return refs.map((r) => {
      if (r.media) return r;
      const guessed = guessMediaForReference(r, mediaPool);
      return guessed ? { ...r, media: guessed } : r;
    });
  }, [refs, mediaPool]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((r) => {
      const hay = `${r.title} ${r.creator ?? ""} ${r.location ?? ""} ${r.type}`.toLowerCase();
      return hay.includes(q);
    });
  }, [enriched, query]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? filtered[0],
    [filtered, selectedId]
  );

  return (
    <div className="min-h-[calc(100vh-120px)] bg-white text-zinc-900">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] border border-zinc-200">
          <aside className="border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="p-4 border-b border-zinc-200 bg-white sticky top-[72px] z-10">
              <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                archives
              </div>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search…"
                className="mt-3 w-full border border-zinc-300 px-3 py-2 text-sm bg-white"
              />

              <div className="mt-3 mono text-[11px] uppercase tracking-widest text-zinc-600">
                {filtered.length} items
              </div>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-auto">
              {filtered.map((r) => {
                const active = r.id === selected?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={[
                      "w-full text-left px-4 py-3 border-b border-zinc-200 hover:bg-zinc-50",
                      active ? "bg-black text-white hover:bg-black" : "bg-white",
                    ].join(" ")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-sm font-medium leading-snug">
                        {r.title}
                      </div>
                      <div className={["mono text-[11px] uppercase tracking-widest", active ? "text-white/80" : "text-zinc-500"].join(" ")}>
                        {formatYear(r)}
                      </div>
                    </div>

                    <div className={["mono mt-1 text-[11px] uppercase tracking-widest", active ? "text-white/75" : "text-zinc-600"].join(" ")}>
                      {prettyType(r.type)}
                      {r.creator ? ` · ${r.creator}` : ""}
                      {r.location ? ` · ${r.location}` : ""}
                      {hasMedia(r) ? " · media" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-white">
            {selected ? (
              <div className="min-h-[60vh]">
                <div className="aspect-[16/9] border-b border-zinc-200 bg-zinc-100">
                  <MediaHero r={selected} />
                </div>

                <div className="p-6">
                  <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    {prettyType(selected.type)} · {formatYear(selected)}
                    {selected.location ? ` · ${selected.location}` : ""}
                  </div>

                  <h2 className="mt-3 text-3xl font-semibold leading-tight">
                    {selected.title}
                  </h2>

                  {selected.creator ? (
                    <div className="mt-2 text-sm text-zinc-700">
                      {selected.creator}
                    </div>
                  ) : null}

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 border border-zinc-200">
                    <div className="p-4 border-b md:border-b-0 md:border-r border-zinc-200">
                      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                        type
                      </div>
                      <div className="mt-2 text-sm">{prettyType(selected.type)}</div>
                    </div>
                    <div className="p-4 border-b md:border-b-0 md:border-r border-zinc-200">
                      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                        year
                      </div>
                      <div className="mt-2 text-sm">{formatYear(selected)}</div>
                    </div>
                    <div className="p-4">
                      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                        location
                      </div>
                      <div className="mt-2 text-sm">{selected.location ?? "—"}</div>
                    </div>
                  </div>

                  <div className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-800">
                    {selected.notes?.trim() ? (
                      <p>{selected.notes}</p>
                    ) : (
                      <p className="text-zinc-500">
                        (notes à compléter — ici on mettra description, contexte, liens, tags…)
                      </p>
                    )}
                  </div>

                  {selected.sourceLabel || selected.sourceUrl ? (
                    <div className="mt-6 text-sm">
                      <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                        source
                      </span>{" "}
                      —{" "}
                      {selected.sourceUrl ? (
                        <a className="underline" href={selected.sourceUrl} target="_blank" rel="noreferrer">
                          {selected.sourceLabel ?? selected.sourceUrl}
                        </a>
                      ) : (
                        <span>{selected.sourceLabel}</span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="p-6 text-zinc-600">no selection</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
