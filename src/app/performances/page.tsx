import Link from "next/link";

type Performance = {
  id: string;
  title: string;
  year?: number;
  location?: string;
  credits?: string;
  videoSrc?: string | null; 
};

const PERFORMANCES: Performance[] = [
  {
    id: "perf-2026-01",
    title: "Performance 01",
    year: 2026,
    location: "Paris",
    credits: "Ely & Marion Collective",
    videoSrc: null,
  },
  {
    id: "perf-2026-02",
    title: "Performance 02",
    year: 2026,
    location: "—",
    credits: "Ely & Marion Collective",
    videoSrc: null,
  },
  {
    id: "perf-2026-03",
    title: "Performance 03",
    year: 2026,
    location: "—",
    credits: "Ely & Marion Collective",
    videoSrc: null,
  },
  {
    id: "perf-2026-04",
    title: "Performance 04",
    year: 2026,
    location: "—",
    credits: "Ely & Marion Collective",
    videoSrc: null,
  },
  {
    id: "perf-2026-05",
    title: "Performance 05",
    year: 2026,
    location: "—",
    credits: "Ely & Marion Collective",
    videoSrc: null,
  },
];

function metaLine(p: Performance) {
  const parts = [];
  if (p.year) parts.push(String(p.year));
  if (p.location) parts.push(p.location);
  if (p.credits) parts.push(p.credits);
  return parts.length ? parts.join(" · ") : "—";
}

export default function PerformancesPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
          performances
        </div>
        <div className="mt-10 space-y-12">
          {PERFORMANCES.map((p) => (
            <article key={p.id} className="border border-zinc-200 bg-white">
              <div className="w-full bg-zinc-50 border-b border-zinc-200">
                {p.videoSrc ? (
                  <video
                    src={p.videoSrc}
                    controls
                    playsInline
                    className="h-auto w-full"
                  />
                ) : (
                  <div className="aspect-video w-full flex items-center justify-center">
                    <div className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                      video placeholder
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-xl font-medium leading-snug">{p.title}</h2>
                  <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    {metaLine(p)}
                  </div>
                </div>

                <div className="mt-3 text-sm text-zinc-600">
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                    id
                  </span>{" "}
                  — {p.id}
                </div>

                <div className="mt-4 text-sm text-zinc-700">
                  <span className="mono text-[11px] uppercase tracking-widest text-zinc-600">
                    note
                  </span>{" "}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="mono text-[11px] uppercase tracking-widest underline"
          >
            back to home →
          </Link>
        </div>
      </div>
    </main>
  );
}
