"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TPLReference, TPLMedia } from "@/lib/schema";
import { getAllReferences } from "@/lib/references";
import { buildPublicUrl } from "@/lib/public-url";

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

function formatYear(r: TPLReference): string {
  if (typeof r.year === "number") return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

function sortKey(r: TPLReference) {
  if (typeof r.year === "number") return r.year;
  if (typeof r.yearRange?.start === "number") return r.yearRange.start;
  return Number.NEGATIVE_INFINITY;
}

function renderMedia(media: TPLMedia | null | undefined, title: string) {
  const src = media?.src;
  if (!media || !src) return <div className="h-full w-full bg-zinc-50" />;

  const url = buildPublicUrl(src);
  if (!url) return <div className="h-full w-full bg-zinc-50" />;

  if (media.kind === "image") {
    return (
      <img
        src={url}
        alt={media.alt ?? title}
        className="h-full w-full object-cover"
      />
    );
  }

  if (media.kind === "video") {
    const posterUrl = media.poster ? buildPublicUrl(media.poster) : undefined;

    return (
      <video
        src={url}
        className="h-full w-full object-cover"
        muted
        playsInline
        controls
        preload="metadata"
        poster={posterUrl}
      />
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-50">
      <audio src={url} controls preload="metadata" className="w-[92%]" />
    </div>
  );
}

function hasAnyMedia(r: TPLReference) {
  return Boolean(r.media?.src) || Boolean(r.mediaGallery?.length);
}

export default function ArchivesReader() {
  const allRefs = useMemo(() => {
    const all = getAllReferences();
    return [...all].sort((a, b) => {
      const ak = sortKey(a);
      const bk = sortKey(b);

      const aNoDate = ak === Number.NEGATIVE_INFINITY;
      const bNoDate = bk === Number.NEGATIVE_INFINITY;

      if (aNoDate && !bNoDate) return 1;
      if (!aNoDate && bNoDate) return -1;

      if (bk !== ak) return bk - ak;

      return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
    });
  }, []);

  const refs = useMemo(() => allRefs.filter(hasAnyMedia), [allRefs]);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return refs;

    return refs.filter((r) => {
      const hay = [
        r.title,
        r.creator ?? "",
        r.id,
        r.type,
        r.location ?? "",
        r.sourceLabel ?? "",
        r.year ? String(r.year) : "",
        r.yearRange ? `${r.yearRange.start}-${r.yearRange.end}` : "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [refs, query]);

  const [selectedId, setSelectedId] = useState<string>(() => refs[0]?.id ?? "");

  const selected = useMemo(() => {
    return filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  const [gallerySrc, setGallerySrc] = useState<string | null>(null);
  const gallery = selected?.mediaGallery ?? null;

  const activeIndex = useMemo(() => {
    if (!gallery?.length) return 0;
    if (!gallerySrc) return 0;

    const idx = gallery.findIndex((m) => m.src === gallerySrc);
    return idx >= 0 ? idx : 0;
  }, [gallery, gallerySrc]);

  const displayMedia: TPLMedia | null | undefined = useMemo(() => {
    if (!selected) return null;

    if (gallery?.length) {
      return gallery[activeIndex] ?? null;
    }

    return selected.media ?? null;
  }, [selected, gallery, activeIndex]);

  const goPrev = useCallback(() => {
    if (!gallery?.length) return;
    const next = Math.max(0, activeIndex - 1);
    setGallerySrc(gallery[next]?.src ?? null);
  }, [gallery, activeIndex]);

  const goNext = useCallback(() => {
    if (!gallery?.length) return;
    const next = Math.min(gallery.length - 1, activeIndex + 1);
    setGallerySrc(gallery[next]?.src ?? null);
  }, [gallery, activeIndex]);

  const selectByOffset = useCallback(
    (delta: number) => {
      if (!filtered.length || !selected) return;

      const idx = filtered.findIndex((r) => r.id === selected.id);
      const cur = idx >= 0 ? idx : 0;

      const next = Math.max(0, Math.min(filtered.length - 1, cur + delta));
      const nextId = filtered[next]?.id;
      if (!nextId) return;

      setSelectedId(nextId);
      setGallerySrc(null); 
    },
    [filtered, selected]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isTyping) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectByOffset(-1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectByOffset(1);
        return;
      }

      if (gallery?.length) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goPrev();
          return;
        }

        if (e.key === "ArrowRight") {
          e.preventDefault();
          goNext();
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          setGallerySrc(null);
          return;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gallery?.length, goPrev, goNext, selectByOffset]);

  return (
    <main className="bg-white text-zinc-900">
      <div className="mx-auto max-w-[1500px] px-6 py-10">
        <header className="mb-6">
          <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            archives
          </div>
          <h1 className="mt-2 text-3xl font-medium">bibliothèque</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            sélectionner une référence pour afficher l’image/vidéo/audio et les infos.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,520px)_1fr] gap-0 border border-zinc-200">
          <aside className="border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="p-3 border-b border-zinc-200 bg-white sticky top-0 z-10">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="rechercher (titre, auteur, id, année...)"
                className="w-full border border-zinc-300 px-3 py-2 text-sm bg-white"
              />
              <div className="mt-2 mono text-[11px] uppercase tracking-widest text-zinc-600">
                {filtered.length} items
              </div>
            </div>

            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              {filtered.map((r) => {
                const active = r.id === selected?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(r.id);
                      setGallerySrc(null);
                    }}
                    className={[
                      "w-full text-left px-4 py-2 border-b border-zinc-200",
                      active
                        ? "bg-zinc-900 text-white"
                        : "bg-white hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[13px] leading-snug">{r.title}</div>
                      <div
                        className={[
                          "mono text-[11px] uppercase tracking-widest",
                          active ? "text-white/80" : "text-zinc-500",
                        ].join(" ")}
                      >
                        {formatYear(r)}
                      </div>
                    </div>

                    {r.creator ? (
                      <div
                        className={[
                          "mt-1 text-[12px]",
                          active ? "text-white/70" : "text-zinc-600",
                        ].join(" ")}
                      >
                        {r.creator}
                      </div>
                    ) : null}

                    {r.mediaGallery?.length ? (
                      <div
                        className={[
                          "mt-1 mono text-[10px] uppercase tracking-widest",
                          active ? "text-white/60" : "text-zinc-500",
                        ].join(" ")}
                      >
                        {r.mediaGallery.length} screens
                      </div>
                    ) : null}
                  </button>
                );
              })}

              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500">aucun résultat</div>
              ) : null}
            </div>
          </aside>

          <section className="border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white">
            <div className="h-[520px] w-full">
              {selected ? renderMedia(displayMedia, selected.title) : null}
            </div>

            {gallery?.length ? (
              <div className="border-t border-zinc-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                    gallery · {activeIndex + 1}/{gallery.length}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      prev
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
                    >
                      next
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-6 gap-2">
                  {gallery.map((m, i) => {
                    const thumbUrl = m?.src ? buildPublicUrl(m.src) : "";
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGallerySrc(m?.src ?? null)}
                        className={[
                          "aspect-[4/3] overflow-hidden border",
                          i === activeIndex
                            ? "border-zinc-900"
                            : "border-zinc-200",
                        ].join(" ")}
                        title={`${selected.title} — ${i + 1}`}
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={`${selected.title} — ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-zinc-50" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section className="bg-white">
            {selected ? (
              <div className="p-6">
                <div className="text-sm text-zinc-700">
                  {selected.creator ?? "—"}
                  <span className="text-zinc-500"> · </span>
                  <span className="text-zinc-500">{prettyType(selected.type)}</span>
                </div>

                <h2 className="mt-2 text-[22px] leading-snug font-medium">
                  {selected.title}
                </h2>

                <div className="mt-2 text-sm text-zinc-500">
                  {formatYear(selected)}
                  {selected.location ? ` · ${selected.location}` : ""}
                </div>

                {/* <div className="mt-6 text-[13px] leading-relaxed text-zinc-700 max-w-[60ch]">
                  {selected.notes?.trim() ? (
                    <p>{selected.notes}</p>
                  ) : (
                    <p className="text-zinc-400">
                      (texte / description à renseigner — ici on mettra aussi les liens,
                      bibliographie, tags)
                    </p>
                  )}
                </div> */}

                {(selected.sourceLabel || selected.sourceUrl) && (
                  <div className="mt-6 text-sm text-zinc-600">
                    <span className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                      source
                    </span>{" "}
                    —{" "}
                    {selected.sourceUrl ? (
                      <a
                        className="underline"
                        href={selected.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selected.sourceLabel ?? selected.sourceUrl}
                      </a>
                    ) : (
                      selected.sourceLabel
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-zinc-600">no selection</div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
