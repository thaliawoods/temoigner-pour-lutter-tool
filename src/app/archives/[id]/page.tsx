// src/app/archives/[id]/page.tsx

import { notFound } from "next/navigation";
import { getReferenceById } from "@/lib/references";
import type { TPLMedia, TPLReference } from "@/lib/schema";
import { buildPublicUrl } from "@/lib/public-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function safePublicUrl(src: string): string {
  try {
    return buildPublicUrl(src);
  } catch {
    return src;
  }
}

function MediaBlock({ media, title }: { media?: TPLMedia | null; title: string }) {
  if (!media) {
    return (
      <div className="w-full aspect-[16/9] bg-zinc-100 flex items-center justify-center">
        <span className="mono text-xs text-zinc-600">no media</span>
      </div>
    );
  }

  const url = safePublicUrl(media.src);
  const poster =
    "poster" in media && media.poster ? safePublicUrl(media.poster) : undefined;

  if (media.kind === "video") {
    return (
      <video
        className="w-full aspect-[16/9] bg-zinc-100"
        controls
        playsInline
        preload="metadata"
        poster={poster}
      >
        <source src={url} />
      </video>
    );
  }

  if (media.kind === "image") {
    return (
      <img
        src={url}
        alt={media.alt ?? title}
        className="w-full aspect-[16/9] object-cover bg-zinc-100"
      />
    );
  }

  return (
    <div className="w-full aspect-[16/9] bg-zinc-100 flex items-center justify-center">
      <audio src={url} controls preload="metadata" className="w-[92%]" />
    </div>
  );
}

export default async function ArchiveReferencePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

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
          <div className="border-b border-zinc-300 bg-white">
            <MediaBlock media={r.media} title={r.title} />
          </div>

          {r.mediaGallery?.length ? (
            <div className="border-b border-zinc-300 bg-white p-4">
              <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                gallery
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {r.mediaGallery.map((m, i) => (
                  <img
                    key={i}
                    src={safePublicUrl(m.src)}
                    alt={`${r.title} — ${i + 1}`}
                    className="w-full aspect-[4/3] object-cover bg-zinc-100"
                  />
                ))}
              </div>
            </div>
          ) : null}

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
