// src/app/archives/page.tsx
"use client";

import { useMemo } from "react";
import { getAllReferences } from "@/lib/references";
import ArchiveFilters from "@/components/ArchiveFilters";
import ArchiveCard from "@/components/ArchiveCard";

export default function ArchivesPage() {
  const data = useMemo(() => getAllReferences(), []);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-6">
          <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            archives
          </div>
          <h1 className="mt-2 text-3xl font-medium">library</h1>
          <p className="mt-2 text-sm text-zinc-600 max-w-2xl">
            filter by type, search, open a reference page (image/video + metadata).
          </p>
        </header>

        <ArchiveFilters data={data}>
          {(filtered) => (
            <section className="grid gap-3 md:grid-cols-2">
              {filtered.map((r) => (
                <ArchiveCard key={r.id} r={r} />
              ))}
            </section>
          )}
        </ArchiveFilters>
      </div>
    </main>
  );
}
