"use client";

import { useMemo, useState } from "react";
import type { TPLReference, TPLType } from "@/lib/schema";

type SortKey = "year_desc" | "year_asc" | "title_asc" | "title_desc";

const TYPES: Array<TPLType> = [
  "collectif",
  "film",
  "jeu_video",
  "texte",
  "musique",
  "oeuvre_picturale",
  "performance",
  "podcast",
  "video",
];

function yearValue(r: TPLReference) {
  if (r.year) return r.year;
  if (r.yearRange) return r.yearRange.end;
  return -Infinity;
}

function labelType(t: string) {
  return t.replaceAll("_", " ");
}

export default function ArchiveFilters({
  data,
  children,
  initialType = "all",
  initialQuery = "",
}: {
  data: TPLReference[];
  children: (filtered: TPLReference[]) => React.ReactNode;
  initialType?: TPLType | "all";
  initialQuery?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState<TPLType | "all">(initialType);
  const [sort, setSort] = useState<SortKey>("year_desc");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = data;

    if (type !== "all") out = out.filter((r) => r.type === type);

    if (needle) {
      out = out.filter((r) => {
        const hay = [
          r.title,
          r.creator ?? "",
          r.notes ?? "",
          r.location ?? "",
          r.sourceLabel ?? "",
          (r.tags || []).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(needle);
      });
    }

    out = [...out].sort((a, b) => {
      if (sort === "year_desc") return yearValue(b) - yearValue(a);
      if (sort === "year_asc") return yearValue(a) - yearValue(b);
      if (sort === "title_asc") return a.title.localeCompare(b.title, "fr");
      return b.title.localeCompare(a.title, "fr");
    });

    return out;
  }, [data, q, type, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (title, author, tags, notes)…"
          className="w-full md:w-[420px] border border-zinc-300 px-3 py-2 text-sm"
        />

        <select
          value={type}
          onChange={(e) => setType((e.target.value as TPLType | "all") ?? "all")}
          className="border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {labelType(t)}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="year_desc">Year ↓</option>
          <option value="year_asc">Year ↑</option>
          <option value="title_asc">Title A→Z</option>
          <option value="title_desc">Title Z→A</option>
        </select>

        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600 ml-auto">
          {filtered.length} result(s)
        </div>
      </div>

      {children(filtered)}
    </div>
  );
}
