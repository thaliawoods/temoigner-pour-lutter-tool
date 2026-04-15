"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllReferences } from "@/lib/references";
import { buildPublicUrl } from "@/lib/public-url";
import type { TPLReference } from "@/lib/schema";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
const STREAM_CDN = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? "";

const gradientText = {
  backgroundImage: "linear-gradient(135deg, #ef444d 0%, #ff00ff 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  color: "transparent",
};



type MediaKind = "image" | "video" | "audio";

type ListItem = {
  id: string;
  url: string;
  kind: MediaKind;
  filename: string;
  poster?: string;
  ref: TPLReference | null;
};

type GroupedRow = {
  id: string;
  ref: TPLReference | null;
  items: ListItem[];
};

type StreamVideo = { guid: string; title: string; thumbnailFileName: string };



function encodePath(p: string) {
  return p.split("/").map(encodeURIComponent).join("/");
}

function buildStorageUrl(folder: string, filename: string) {
  if (!CDN_URL) return "";
  return `${CDN_URL}/${encodePath(`${folder}/${filename}`)}`;
}

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

function stripExt(s: string) {
  return s.replace(/\.[a-z0-9]+$/i, "");
}

function formatYear(r: TPLReference): string {
  if (r.year) return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "-";
}

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

function buildRefLookup(refs: TPLReference[]): Map<string, TPLReference> {
  const map = new Map<string, TPLReference>();
  for (const ref of refs) {
    const srcs: string[] = [];
    const m = ref.media as unknown;
    if (Array.isArray(m)) {
      for (const item of m as { src?: string }[]) if (item?.src) srcs.push(item.src);
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

const IMAGE_EXTS = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const AUDIO_EXTS = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;



function MediaDisplay({ item }: { item: ListItem }) {
  if (item.kind === "video") {
    return (
      <video
        src={item.url}
        poster={item.poster}
        controls
        playsInline
        preload="metadata"
        className="w-full max-h-[480px] object-contain bg-black/5"
        style={{ display: "block" }}
      />
    );
  }
  if (item.kind === "audio") {
    return (
      <div className="py-4">
        <audio src={item.url} controls preload="metadata" className="w-full" />
      </div>
    );
  }
  return (
    <img
      src={item.url}
      alt={item.ref?.title ?? item.filename}
      className="w-full max-h-[480px] object-contain bg-black/5"
      style={{ display: "block" }}
    />
  );
}

function ExpandedContent({ row }: { row: GroupedRow }) {
  const r = row.ref;
  const items = row.items;

  return (
    <div
      className="pb-8 pt-4 pl-4 sm:pl-[calc(7rem+1rem)]"
    >

      <div className="mb-4 max-w-[640px] space-y-3">
        {items.map((item) => (
          <MediaDisplay key={item.id} item={item} />
        ))}
      </div>


      {r?.notes?.trim() && (
        <p className="gertrude text-[16px] leading-[1.7] max-w-[60ch] mb-3 text-black">
          {r.notes}
        </p>
      )}


      <div className="mono text-[11px] uppercase tracking-[0.18em] flex flex-wrap gap-x-4 gap-y-1 text-black/40">
        {r ? (
          <>
            {r.type && <span>{prettyType(r.type)}</span>}
            {r.location && <span>{r.location}</span>}
            {r.sourceLabel && (
              <span>
                {r.sourceUrl ? (
                  <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                    {r.sourceLabel}
                  </a>
                ) : r.sourceLabel}
              </span>
            )}
          </>
        ) : (
          <span className="text-black/25 normal-case">{items[0]?.filename}</span>
        )}
      </div>
    </div>
  );
}



export default function ArchivesReader() {
  const allRefs = useMemo(() => getAllReferences(), []);
  const refLookup = useMemo(() => buildRefLookup(allRefs), [allRefs]);

  const [allItems, setAllItems] = useState<GroupedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroredIds, setErroredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [imgData, streamData, audData] = await Promise.all([
          fetch("/api/bunny/list?folder=images").then((r) => r.json()),
          fetch("/api/bunny/stream").then((r) => r.json()),
          fetch("/api/bunny/list?folder=audio").then((r) => r.json()),
        ]);
        if (cancelled) return;

        const images: ListItem[] = (imgData.files ?? [])
          .filter((f: string) => IMAGE_EXTS.test(f))
          .map((filename: string): ListItem => ({
            id: `images/${filename}`,
            url: buildStorageUrl("images", filename),
            kind: "image",
            filename: stripExt(filename),
            ref: refLookup.get(normKey(filename)) ?? null,
          }));

        const videos: ListItem[] = (streamData.videos ?? []).map(
          (v: StreamVideo): ListItem => ({
            id: `stream/${v.guid}`,
            url: `${STREAM_CDN}/${v.guid}/play_720p.mp4`,
            kind: "video",
            filename: stripExt(v.title),
            poster: `${STREAM_CDN}/${v.guid}/${v.thumbnailFileName}`,
            ref: refLookup.get(normKey(v.title)) ?? null,
          })
        );

        const audios: ListItem[] = (audData.files ?? [])
          .filter((f: string) => AUDIO_EXTS.test(f))
          .map((filename: string): ListItem => ({
            id: `audio/${filename}`,
            url: buildStorageUrl("audio", filename),
            kind: "audio",
            filename: stripExt(filename),
            ref: refLookup.get(normKey(filename)) ?? null,
          }));

        const items = [...images, ...videos, ...audios];


        const groupMap = new Map<string, GroupedRow>();

        for (const item of items) {
          if (item.ref) {
            const key = item.ref.id;
            const existing = groupMap.get(key);
            if (existing) {
              existing.items.push(item);
            } else {
              groupMap.set(key, { id: key, ref: item.ref, items: [item] });
            }
          }
        }

        const grouped = [...groupMap.values()].sort((a, b) => {
          const ya = a.ref?.year ?? a.ref?.yearRange?.start ?? 9999;
          const yb = b.ref?.year ?? b.ref?.yearRange?.start ?? 9999;
          return ya - yb;
        });

        setAllItems(grouped);
      } catch (e) {
        console.error("[archives] fetch error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [refLookup]);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {

    const visible = allItems.filter((row) =>
      row.items.some((item) => !erroredIds.has(item.id))
    );
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((row) => {
      const hay = [
        row.ref?.title ?? "",
        row.ref?.creator ?? "",
        row.ref?.type ?? "",
        String(row.ref?.year ?? ""),
        ...row.items.map((i) => i.filename),
        ...row.items.map((i) => i.kind),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, erroredIds, query]);

  const markErrored = useCallback((id: string) => {
    setErroredIds((prev) => new Set([...prev, id]));
  }, []);

  function toggle(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  return (
    <main className="bg-white text-zinc-900 min-h-screen">
      <div className="mx-auto max-w-[1200px] px-6 py-10">


        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.22em] text-black/50">
              archives
            </div>
            <h1 className="gertrude mt-1 text-[32px] leading-tight">
              bibliothèque
            </h1>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="rechercher…"
            className="gertrude w-full md:w-72 border-b border-black/30 bg-transparent py-1.5 text-[15px] placeholder:text-black/30 focus:outline-none focus:border-black"
          />
        </div>


        <div
          className="mono text-[11px] uppercase tracking-[0.18em] pb-3 text-black/40"
          style={{
            display: "grid",
            gridTemplateColumns: "var(--archives-cols, 7rem 1fr 14rem)",
            gap: "0 1rem",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <span>↓ année</span>
          <span>↓ titre</span>
          <span className="hidden sm:block">↓ auteur·ice</span>
        </div>
        <style>{`@media (max-width: 639px) { :root { --archives-cols: 5rem 1fr; } }`}</style>


        {loading && (
          <div className="py-10 mono text-[11px] uppercase tracking-[0.18em] text-black/30">
            chargement…
          </div>
        )}

        {filtered.map((row) => {
          const active = selectedId === row.id;
          const r = row.ref;
          const title = r?.title ?? "Connecter la référence";
          const year = r ? formatYear(r) : "-";
          const creator = r?.creator ?? "";
          const isUnlinked = !r;
          const mediaCount = row.items.length;

          return (
            <div key={row.id} id={`item-${row.id}`}>
              <button
                type="button"
                onClick={() => toggle(row.id)}
                className="w-full text-left py-3 hover:opacity-70 transition-opacity"
                style={{
                  display: "grid",
                  gridTemplateColumns: "var(--archives-cols, 7rem 1fr 14rem)",
                  gap: "0 1rem",
                  alignItems: "baseline",
                  borderBottom: "1px solid rgba(0,0,0,0.07)",
                }}
              >
                <span
                  className="gertrude text-[15px] shrink-0"
                  style={active ? gradientText : { color: "#111" }}
                >
                  {year}
                </span>

                <span
                  className="gertrude text-[15px] leading-snug"
                  style={active ? gradientText : (isUnlinked ? { color: "#aaa" } : { color: "#111" })}
                >
                  {title}
                  {mediaCount > 1 && (
                    <span className="mono text-[10px] text-black/30 ml-2">
                      ({mediaCount})
                    </span>
                  )}
                </span>

                <span
                  className="gertrude text-[15px] leading-snug hidden sm:block"
                  style={active ? gradientText : { color: "#555" }}
                >
                  {creator}
                </span>
              </button>

              {active && (
                <ErrorBoundaryItem id={row.id} onError={markErrored}>
                  <ExpandedContent row={row} />
                </ErrorBoundaryItem>
              )}
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="py-10 gertrude text-[15px] text-black/40">
            aucun résultat
          </div>
        )}

        <div className="mt-4 mono text-[11px] uppercase tracking-[0.18em] text-black/30">
          {loading ? "" : `${filtered.length} média${filtered.length !== 1 ? "s" : ""}`}
        </div>
      </div>
    </main>
  );
}


import React from "react";

class ErrorBoundaryItem extends React.Component<
  { id: string; onError: (id: string) => void; children: React.ReactNode },
  { errored: boolean }
> {
  constructor(props: { id: string; onError: (id: string) => void; children: React.ReactNode }) {
    super(props);
    this.state = { errored: false };
  }
  componentDidCatch() {
    this.props.onError(this.props.id);
    this.setState({ errored: true });
  }
  render() {
    if (this.state.errored) return null;
    return this.props.children;
  }
}
