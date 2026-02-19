"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
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

function hasAnyMedia(r: TPLReference) {
  const hasMain = Boolean(r.media);
  const hasGallery = Boolean(r.mediaGallery?.length);
  return hasMain || hasGallery;
}

function getGalleryCount(r: TPLReference) {
  const g = r.mediaGallery?.length ?? 0;
  return g > 0 ? g : r.media ? 1 : 0;
}

function getMediaAt(r: TPLReference, index: number): TPLMedia | undefined {
  if (r.mediaGallery?.length) {
    const i = Math.max(0, Math.min(index, r.mediaGallery.length - 1));
    return r.mediaGallery[i];
  }
  return r.media ?? undefined;
}

function renderMedia(media: TPLMedia | null | undefined, title: string) {
  if (!media) return <div className="h-full w-full bg-zinc-50" />;

  const url = buildPublicUrl(media.src);

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
    return (
      <video
        src={url}
        className="h-full w-full object-cover"
        muted
        playsInline
        controls
        preload="metadata"
        poster={media.poster ? buildPublicUrl(media.poster) : undefined}
      />
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-50">
      <audio src={url} controls preload="metadata" className="w-[92%]" />
    </div>
  );
}

export default function ArchivesReader() {
  const refsWithMedia = useMemo(() => {
    const all = getAllReferences();
    const filtered = all.filter(hasAnyMedia);

    return [...filtered].sort((a, b) => {
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

  const [selectedId, setSelectedId] = useState<string>(() => refsWithMedia[0]?.id ?? "");
  const selected = useMemo(
    () => refsWithMedia.find((r) => r.id === selectedId) ?? refsWithMedia[0],
    [refsWithMedia, selectedId]
  );

  const [galleryIndex, setGalleryIndex] = useState(0);

  const galleryCount = selected ? getGalleryCount(selected) : 0;

  const displayMedia = useMemo(() => {
    if (!selected) return undefined;
    return getMediaAt(selected, galleryIndex);
  }, [selected, galleryIndex]);

  // ✅ helper: change selection AND reset galleryIndex (no effect needed)
  const selectRef = useCallback((id: string) => {
    setSelectedId(id);
    setGalleryIndex(0);
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!selected) return;

      // gauche/droite -> gallery
      if (e.key === "ArrowLeft") {
        if (galleryCount <= 1) return;
        e.preventDefault();
        setGalleryIndex((i) => (i - 1 + galleryCount) % galleryCount);
        return;
      }
      if (e.key === "ArrowRight") {
        if (galleryCount <= 1) return;
        e.preventDefault();
        setGalleryIndex((i) => (i + 1) % galleryCount);
        return;
      }

      // haut/bas -> sélectionner la ref dans la liste
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();

        const idx = refsWithMedia.findIndex((r) => r.id === selected.id);
        if (idx < 0) return;

        const nextIdx =
          e.key === "ArrowUp"
            ? Math.max(0, idx - 1)
            : Math.min(refsWithMedia.length - 1, idx + 1);

        const next = refsWithMedia[nextIdx];
        if (next) selectRef(next.id);
      }
    },
    [selected, refsWithMedia, galleryCount, selectRef]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown as EventListener);
  }, [onKeyDown]);

  return (
    <main className="bg-white text-zinc-900">
      <div className="mx-auto max-w-[1500px] px-6 py-10">
        <header className="mb-6">
          <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            archives
          </div>
          <h1 className="mt-2 text-3xl font-medium">bibliothèque</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            (affiche uniquement les références avec médias)
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,520px)_1fr] gap-0 border border-zinc-200">
          <aside className="border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="max-h-[calc(100vh-220px)] overflow-auto">
              {refsWithMedia.map((r) => {
                const active = r.id === selected?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectRef(r.id)}
                    className={[
                      "w-full text-left px-4 py-2 border-b border-zinc-200",
                      active ? "bg-zinc-900 text-white" : "bg-white hover:bg-zinc-50",
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

                    <div
                      className={[
                        "mt-1 text-[12px]",
                        active ? "text-white/70" : "text-zinc-600",
                      ].join(" ")}
                    >
                      {r.creator ?? "—"}
                      <span className="text-zinc-400"> · </span>
                      <span className="text-zinc-500">{prettyType(r.type)}</span>
                      <span className="text-zinc-400"> · </span>
                      <span className="mono text-[10px] uppercase tracking-widest">
                        {getGalleryCount(r)} media
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white">
            <div className="h-[520px] w-full">
              {selected ? renderMedia(displayMedia, selected.title) : null}
            </div>

            {selected && galleryCount > 1 ? (
              <div className="p-3 text-xs text-zinc-600 flex items-center justify-between">
                <div className="mono uppercase tracking-widest">
                  gallery {galleryIndex + 1}/{galleryCount}
                </div>
                <div className="mono uppercase tracking-widest text-zinc-500">
                  ← → pour naviguer
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

                <div className="mt-6 text-[13px] leading-relaxed text-zinc-700 max-w-[60ch]">
                  {selected.notes?.trim() ? (
                    <p>{selected.notes}</p>
                  ) : (
                    <p className="text-zinc-400">
                      (notes à compléter — liens, bibliographie, tags…)
                    </p>
                  )}
                </div>
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
