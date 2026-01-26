// src/app/archives/[id]/page.tsx
import { notFound } from "next/navigation";
import { getReferenceById } from "@/lib/references";
import type { TPLReference } from "@/lib/schema";

function formatYear(r: TPLReference): string {
  if (r.year) return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-300 p-3">
      <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
        {label}
      </div>
      <div className="mt-2 text-sm text-zinc-900">{value}</div>
    </div>
  );
}

export default async function ArchiveReferencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // ✅ OBLIGATOIRE en Next 16

  const r = getReferenceById(id);
  if (!r) return notFound();

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          archives
        </div>

        <h1 className="mt-2 text-2xl font-medium">{r.title}</h1>

        <div className="mt-6 border border-zinc-300">
          {/* MEDIA */}
          <div className="border-b border-zinc-300 bg-white">
            {r.media?.kind === "video" ? (
              <video
                className="w-full aspect-[16/9] bg-zinc-100"
                controls
                playsInline
                preload="metadata"
                poster={r.media.poster}
              >
                <source src={r.media.src} />
              </video>
            ) : r.media?.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.media.src}
                alt={r.media.alt ?? r.title}
                className="w-full aspect-[16/9] object-cover bg-zinc-100"
              />
            ) : (
              <div className="w-full aspect-[16/9] bg-zinc-100 flex items-center justify-center">
                <span className="mono text-xs text-zinc-600">
                  no media
                </span>
              </div>
            )}
          </div>

          {/* META */}
          <div className="grid grid-cols-1 md:grid-cols-3">
            <MetaCell label="year" value={formatYear(r)} />
            <MetaCell label="location" value={r.location ?? "—"} />
            <MetaCell label="type" value={r.type.replaceAll("_", " ")} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-zinc-300">
            <MetaCell label="creator" value={r.creator ?? "—"} />
            <MetaCell label="source" value={r.sourceLabel ?? "—"} />
            <MetaCell label="id" value={r.id} />
          </div>

          {/* NOTES */}
          <div className="border-t border-zinc-300 p-4">
            <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
              notes
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-800">
              {r.notes || "(no notes yet)"}
            </p>

            {r.sourceUrl && (
              <a
                className="mt-4 inline-block text-sm underline"
                href={r.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                open source
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
