"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllReferences } from "@/lib/references";
import type { TPLReference, TPLMedia } from "@/lib/schema";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
const STREAM_CDN = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? "";

type MediaKind = "image" | "video" | "audio";

type RefItem = {
  id: string;
  ref: TPLReference;
  url: string;
  kind: MediaKind;
  poster?: string;
};

type StreamVideo = { guid: string; title: string; thumbnailFileName: string };

function encodePath(path: string) {
  return path.split("/").map((p) => encodeURIComponent(p)).join("/");
}

function buildStorageUrl(path: string) {
  if (!CDN_URL) return "";
  return `${CDN_URL}/${encodePath(path)}`;
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

// Extract the primary media from a ref (handles array or object form)
function getPrimaryMedia(ref: TPLReference): TPLMedia | null {
  const m = ref.media as unknown;
  if (!m) return null;
  if (Array.isArray(m)) return (m[0] as TPLMedia) ?? null;
  return m as TPLMedia;
}

// Get ALL media srcs from a ref (primary + gallery)
function getAllMediaSrcs(ref: TPLReference): TPLMedia[] {
  const items: TPLMedia[] = [];
  const m = ref.media as unknown;
  if (Array.isArray(m)) {
    items.push(...(m as TPLMedia[]));
  } else if (m) {
    items.push(m as TPLMedia);
  }
  if (ref.mediaGallery) items.push(...ref.mediaGallery);
  return items;
}

function buildRefItem(
  ref: TPLReference,
  streamByKey: Map<string, StreamVideo>
): RefItem | null {
  const allMedia = getAllMediaSrcs(ref);
  if (allMedia.length === 0) return null;

  const videos = allMedia.filter((m) => m.kind === "video");
  const images = allMedia.filter((m) => m.kind === "image");
  const audios = allMedia.filter((m) => m.kind === "audio");

  // 1. Try any video that has a Stream match
  for (const v of videos) {
    const sv = streamByKey.get(normKey(basename(v.src)));
    if (sv) {
      return {
        id: ref.id, ref,
        url: `${STREAM_CDN}/${sv.guid}/play_720p.mp4`,
        poster: `${STREAM_CDN}/${sv.guid}/${sv.thumbnailFileName}`,
        kind: "video",
      };
    }
  }

  // 2. Try first image from Storage
  if (images.length > 0) {
    return {
      id: ref.id, ref,
      url: buildStorageUrl(`images/${basename(images[0].src)}`),
      kind: "image",
    };
  }

  // 3. Try first audio from Storage
  if (audios.length > 0) {
    return {
      id: ref.id, ref,
      url: buildStorageUrl(`audio/${basename(audios[0].src)}`),
      kind: "audio",
    };
  }

  return null;
}

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

function formatYear(ref: TPLReference): string {
  if (ref.year) return String(ref.year);
  if (ref.yearRange) return `${ref.yearRange.start}–${ref.yearRange.end}`;
  return "—";
}

function MediaDisplay({ item, onError }: { item: RefItem; onError: () => void }) {
  if (item.kind === "image") {
    return (
      <img
        src={item.url}
        alt={item.ref.title}
        className="h-full w-full object-contain"
        onError={onError}
      />
    );
  }

  if (item.kind === "video") {
    return (
      <video
        src={item.url}
        poster={item.poster}
        className="h-full w-full object-contain"
        muted
        playsInline
        controls
        preload="metadata"
        onError={onError}
      />
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-50">
      <audio
        src={item.url}
        controls
        preload="metadata"
        className="w-[92%]"
        onError={onError}
      />
    </div>
  );
}

export default function ArchivesReader() {
  const allRefs = useMemo(() => getAllReferences(), []);

  const [streamVideos, setStreamVideos] = useState<StreamVideo[]>([]);

  useEffect(() => {
    fetch("/api/bunny/stream")
      .then((r) => r.json())
      .then((d) => setStreamVideos(d.videos ?? []))
      .catch(() => {});
  }, []);

  const streamByKey = useMemo(() => {
    const m = new Map<string, StreamVideo>();
    for (const v of streamVideos) m.set(normKey(v.title), v);
    return m;
  }, [streamVideos]);

  const allItems = useMemo<RefItem[]>(() => {
    return allRefs
      .map((ref) => buildRefItem(ref, streamByKey))
      .filter((x): x is RefItem => x !== null);
  }, [allRefs, streamByKey]);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) => {
      const ref = item.ref;
      const hay = [
        ref.title,
        ref.creator ?? "",
        ref.type,
        ref.location ?? "",
        ref.year ? String(ref.year) : "",
        ref.yearRange ? `${ref.yearRange.start} ${ref.yearRange.end}` : "",
        ref.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, query]);

  const [erroredIds, setErroredIds] = useState<Set<string>>(new Set());

  const markErrored = useCallback((id: string) => {
    setErroredIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const displayedItems = useMemo(
    () => filtered.filter((item) => !erroredIds.has(item.id)),
    [filtered, erroredIds]
  );

  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const valid = displayedItems.some((f) => f.id === selectedId);
    if (!valid && displayedItems.length > 0) {
      setSelectedId(displayedItems[0].id);
    }
  }, [displayedItems, selectedId]);

  const selected = useMemo(
    () => displayedItems.find((f) => f.id === selectedId) ?? displayedItems[0] ?? null,
    [displayedItems, selectedId]
  );

  const selectByOffset = useCallback(
    (delta: number) => {
      if (!displayedItems.length || !selected) return;
      const idx = displayedItems.findIndex((f) => f.id === selected.id);
      const cur = idx >= 0 ? idx : 0;
      const next = Math.max(0, Math.min(displayedItems.length - 1, cur + delta));
      const nextId = displayedItems[next]?.id;
      if (nextId) setSelectedId(nextId);
    },
    [displayedItems, selected]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTyping) return;
      if (e.key === "ArrowUp") { e.preventDefault(); selectByOffset(-1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); selectByOffset(1); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectByOffset]);

  return (
    <main className="bg-white text-zinc-900">
      <div className="mx-auto max-w-[1500px] px-6 py-10">
        <header className="mb-6">
          <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            archives
          </div>
          <h1 className="mt-2 text-3xl font-medium">bibliothèque</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            sélectionner une référence pour afficher le média.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,520px)_1fr] gap-0 border border-zinc-200">
          {/* list */}
          <aside className="border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="p-3 border-b border-zinc-200 bg-white sticky top-0 z-10">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="rechercher (titre, auteur, type, année…)"
                className="w-full border border-zinc-300 px-3 py-2 text-sm bg-white"
              />
              <div className="mt-2 mono text-[11px] uppercase tracking-widest text-zinc-600">
                {displayedItems.length} références
              </div>
            </div>

            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              {displayedItems.map((item) => {
                const active = item.id === selected?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={[
                      "w-full text-left px-4 py-2 border-b border-zinc-200",
                      active ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[13px] leading-snug truncate">{item.ref.title}</div>
                      <div className={["mono text-[11px] uppercase tracking-widest shrink-0", active ? "text-white/80" : "text-zinc-500"].join(" ")}>
                        {formatYear(item.ref)}
                      </div>
                    </div>

                    {item.ref.creator ? (
                      <div className={["mt-1 text-[12px]", active ? "text-white/70" : "text-zinc-600"].join(" ")}>
                        {item.ref.creator}
                      </div>
                    ) : null}

                    <div className={["mt-1 mono text-[10px] uppercase tracking-widest", active ? "text-white/60" : "text-zinc-500"].join(" ")}>
                      {prettyType(item.ref.type)} · {item.kind}
                    </div>
                  </button>
                );
              })}

              {displayedItems.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500">aucun résultat</div>
              ) : null}
            </div>
          </aside>

          {/* media */}
          <section className="border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white">
            <div className="h-[520px] w-full bg-zinc-100">
              {selected ? (
                <MediaDisplay
                  key={selected.id}
                  item={selected}
                  onError={() => markErrored(selected.id)}
                />
              ) : null}
            </div>
          </section>

          {/* info */}
          <section className="bg-white">
            {selected ? (
              <div className="p-6">
                <div className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                  {prettyType(selected.ref.type)} · {formatYear(selected.ref)}
                  {selected.ref.location ? ` · ${selected.ref.location}` : ""}
                </div>

                <h2 className="mt-3 text-[22px] leading-snug font-medium">
                  {selected.ref.title}
                </h2>

                {selected.ref.creator ? (
                  <div className="mt-2 text-sm text-zinc-700">{selected.ref.creator}</div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 border border-zinc-200">
                  <div className="p-4 border-b border-zinc-200">
                    <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">type</div>
                    <div className="mt-2 text-sm">{prettyType(selected.ref.type)}</div>
                  </div>
                  <div className="p-4 border-b border-zinc-200">
                    <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">année</div>
                    <div className="mt-2 text-sm">{formatYear(selected.ref)}</div>
                  </div>
                  {selected.ref.location ? (
                    <div className="p-4 border-b border-zinc-200">
                      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">lieu</div>
                      <div className="mt-2 text-sm">{selected.ref.location}</div>
                    </div>
                  ) : null}
                  {selected.ref.notes?.trim() ? (
                    <div className="p-4 border-b border-zinc-200">
                      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">notes</div>
                      <div className="mt-2 text-sm leading-relaxed text-zinc-700">{selected.ref.notes}</div>
                    </div>
                  ) : null}
                  {(selected.ref.sourceLabel || selected.ref.sourceUrl) ? (
                    <div className="p-4">
                      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">source</div>
                      <div className="mt-2 text-sm">
                        {selected.ref.sourceUrl ? (
                          <a className="underline" href={selected.ref.sourceUrl} target="_blank" rel="noreferrer">
                            {selected.ref.sourceLabel ?? selected.ref.sourceUrl}
                          </a>
                        ) : selected.ref.sourceLabel}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="p-6 text-zinc-600">aucune sélection</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
