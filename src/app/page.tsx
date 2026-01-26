// src/app/page.tsx
import Link from "next/link";
import { getAllReferences } from "@/lib/references";
import type { TPLReference, TPLType } from "@/lib/schema";

const PREVIEW_PER_TYPE = 3;

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

function groupByType(refs: TPLReference[]) {
  const map = new Map<TPLType, TPLReference[]>();
  for (const r of refs) {
    const arr = map.get(r.type) ?? [];
    arr.push(r);
    map.set(r.type, arr);
  }
  return map;
}

export default function HomePage() {
  const refs = getAllReferences();
  const byType = groupByType(refs);

  return (
    <main className="bg-white text-zinc-900">
      {/* HERO VIDEO */}
      <section className="relative border-b border-zinc-200">
        <div className="relative aspect-[16/9] w-full bg-black">

          <video
            className="absolute inset-0 h-full w-full object-cover"
            src="/media/performance.mp4"
            autoPlay
            loop
            muted
            playsInline
          />

          {/* overlay title inside video (comme liquid architecture) */}
          <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
            <div className="mono text-[12px] uppercase tracking-widest text-white/85">
              programme / performance
            </div>
          </div>

          <div className="absolute bottom-5 right-6 z-10 mono text-[11px] uppercase tracking-widest text-white/70">
            (muted)
          </div>
        </div>
      </section>

      {/* PRESENTATION */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            performance
          </div>

          <h1 className="mt-3 text-4xl font-semibold">Témoigner pour lutter</h1>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 border border-zinc-200">
            <div className="border-b md:border-b-0 md:border-r border-zinc-200 p-4">
              <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                format
              </div>
              <div className="mt-2 text-sm">live performance + archive tool</div>
            </div>
            <div className="border-b md:border-b-0 md:border-r border-zinc-200 p-4">
              <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                status
              </div>
              <div className="mt-2 text-sm">mvp</div>
            </div>
            <div className="p-4">
              <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                sound
              </div>
              <div className="mt-2 text-sm">soon</div>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-800">
            Un dispositif numérique pour organiser une bibliothèque
            de références, et activer des médias en live.
          </p>

          <div className="mt-4 text-sm text-zinc-700">
            <span className="mono uppercase tracking-widest text-[11px] text-zinc-600">
              note
            </span>{" "}
            — utiliser{" "}
            <Link className="underline" href="/archives">
              Archives
            </Link>{" "}
            pour explorer,{" "}
            <Link className="underline" href="/live">
              Live
            </Link>{" "}
            pour activer.
          </div>
        </div>
      </section>

      {/* ARCHIVE PREVIEW (comme “Videos / Related …”) */}
      <section className="border-b border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
          {Array.from(byType.entries()).map(([type, items]) => {
            const slice = items.slice(0, PREVIEW_PER_TYPE);
            if (slice.length === 0) return null;

            return (
              <div key={type}>
                <div className="flex items-baseline justify-between gap-4">
                  <div className="text-lg font-medium">{prettyType(type)}</div>
                  <Link className="mono text-[11px] uppercase tracking-widest underline" href="/archives">
                    view all
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {slice.map((r) => (
                    <Link
                      key={r.id}
                      href={`/archives/${encodeURIComponent(r.id)}`}
                      className="block border border-zinc-200 bg-white hover:bg-zinc-50"
                    >
                      <div className="aspect-[4/3] bg-zinc-100 border-b border-zinc-200 overflow-hidden">
                        {r.media?.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.media.src} alt={r.media.alt ?? r.title} className="h-full w-full object-cover" />
                        ) : r.media?.kind === "video" ? (
                          <video src={r.media.src} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center mono text-[11px] uppercase tracking-widest text-zinc-500">
                            no media
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <div className="text-sm font-medium leading-snug">{r.title}</div>
                        <div className="mono mt-1 text-[11px] uppercase tracking-widest text-zinc-600">
                          {prettyType(r.type)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* footer est global via layout */}
    </main>
  );
}
