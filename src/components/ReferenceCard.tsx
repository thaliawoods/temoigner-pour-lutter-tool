"use client";

import type { TPLReference } from "@/lib/schema";

function formatYear(r: TPLReference) {
  if (r.year) return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

export default function ReferenceCard({
  item,
  onAdd
}: {
  item: TPLReference;
  onAdd?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd?.(item.id)}
      className="w-full text-left border border-zinc-200 bg-white hover:bg-zinc-50"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium leading-snug">
              {item.title}
            </div>
            <div className="mono mt-1 text-[11px] uppercase tracking-wide text-zinc-600">
              {item.type.replace("_", " ")} · {formatYear(item)}
              {item.creator ? ` · ${item.creator}` : ""}
            </div>
          </div>

          {item.location ? (
            <div className="mono text-[11px] text-zinc-600">
              {item.location}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
