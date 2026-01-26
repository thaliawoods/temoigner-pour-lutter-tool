// src/components/ArchiveCard.tsx
import Link from "next/link";
import type { TPLReference } from "@/lib/schema";

function formatYear(r: TPLReference) {
  if (r.year) return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

export default function ArchiveCard({ r }: { r: TPLReference }) {
  const year = formatYear(r);

  return (
    <Link
      href={`/archives/${encodeURIComponent(r.id)}`}
      className="group block border border-zinc-300 bg-white hover:bg-zinc-50"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] leading-snug font-medium">{r.title}</h3>

          <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            {r.type.replaceAll("_", " ")}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-zinc-300 pt-3">
          <Meta label="year" value={year} />
          <Meta label="creator" value={r.creator ?? "—"} />
          <Meta label="location" value={r.location ?? "—"} />
          <Meta label="source" value={r.sourceLabel ?? "—"} />
        </div>

        {r.notes ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">{r.notes}</p>
        ) : null}

        {r.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {r.tags.slice(0, 6).map((t) => (
              <span
                key={t}
                className="mono text-[11px] border border-zinc-300 px-2 py-0.5 text-zinc-700"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-300 p-2">
      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
        {label}
      </div>
      <div className="mt-1 text-[12px] text-zinc-900">{value}</div>
    </div>
  );
}
