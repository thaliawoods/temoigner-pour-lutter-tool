"use client";

import { useMemo, useState } from "react";
import type { TPLReference } from "@/lib/schema";
import { getAllReferences } from "@/lib/references";

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

function formatYear(r: TPLReference): string {
  if (typeof r.year === "number") return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

function sortKey(r: TPLReference) {
  // récent -> ancien
  if (typeof r.year === "number") return r.year;
  if (typeof r.yearRange?.start === "number") return r.yearRange.start;
  return Number.NEGATIVE_INFINITY; // sans date à la fin
}

function MediaCenter({ r }: { r: TPLReference }) {
  if (r.media?.kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={r.media.src}
        alt={r.media.alt ?? r.title}
        className="h-full w-full object-cover"
      />
    );
  }

  if (r.media?.kind === "video") {
    return (
      <video
        src={r.media.src}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
    );
  }

  return <div className="h-full w-full bg-zinc-50" />;
}

export default function ArchivesReader() {
  // refs triées : récent -> ancien, puis "—" à la fin
  const refs = useMemo(() => {
    const all = getAllReferences();
    return [...all].sort((a, b) => {
      const ak = sortKey(a);
      const bk = sortKey(b);

      const aNoDate = ak === Number.NEGATIVE_INFINITY;
      const bNoDate = bk === Number.NEGATIVE_INFINITY;

      if (aNoDate && !bNoDate) return 1;
      if (!aNoDate && bNoDate) return -1;

      if (bk !== ak) return bk - ak;

      // tie-break : titre
      return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
    });
  }, []);

  const [selectedId, setSelectedId] = useState<string>(() => refs[0]?.id ?? "");

  const selected = useMemo(
    () => refs.find((r) => r.id === selectedId) ?? refs[0],
    [refs, selectedId]
  );

  return (
    <main className="bg-white text-zinc-900">
      <div className="mx-auto max-w-[1500px] px-6 py-10">
        {/* ✅ header (comme tes autres pages) */}
        <header className="mb-6">
          <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            archives
          </div>
          <h1 className="mt-2 text-3xl font-medium">bibliothèque</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            sélectionner une référence pour afficher l’image/vidéo et les infos.
          </p>
        </header>

        {/* ✅ split 3 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,520px)_1fr] gap-0 border border-zinc-200">
          {/* LEFT — list */}
          <aside className="border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="max-h-[calc(100vh-220px)] overflow-auto">
              {refs.map((r) => {
                const active = r.id === selected?.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
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
                  </button>
                );
              })}
            </div>
          </aside>

          {/* CENTER — media */}
          <section className="border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white">
            <div className="h-[520px] w-full">
              {selected ? <MediaCenter r={selected} /> : null}
            </div>
          </section>

          {/* RIGHT — text */}
          <section className="bg-white">
            {selected ? (
              <div className="p-6">
                <div className="text-sm text-zinc-700">
                  {selected.creator ?? "—"}
                  <span className="text-zinc-500"> · </span>
                  <span className="text-zinc-500">
                    {prettyType(selected.type)}
                  </span>
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
                      (texte / description à renseigner — ici on mettra aussi les
                      liens, bibliographie, tags)
                    </p>
                  )}
                </div>

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
