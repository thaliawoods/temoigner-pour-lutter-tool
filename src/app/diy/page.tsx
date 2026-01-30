// src/app/live/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAllReferences } from "@/lib/references";
import type { TPLReference } from "@/lib/schema";
import { AudioEngine } from "@/lib/audio/engine";

function formatYear(r: TPLReference): string {
  if (r.year) return String(r.year);
  if (r.yearRange) return `${r.yearRange.start}–${r.yearRange.end}`;
  return "—";
}

function prettyType(t: string) {
  return t.replaceAll("_", " ");
}

export default function LivePage() {
  const engineRef = useRef<AudioEngine | null>(null);

  // refs statiques (server json → stable)
  const refs = useMemo(() => getAllReferences(), []);

  // audio
  const [ready, setReady] = useState(false);

  // “active media”
  const [activeText, setActiveText] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    engineRef.current = new AudioEngine();

    const onKey = (e: KeyboardEvent) => {
      // silence hard
      if (e.key === " ") {
        e.preventDefault();
        engineRef.current?.silenceHard();
      }

      // clear visuals
      if (e.key.toLowerCase() === "x") {
        setActiveText(null);
        setActiveImage(null);
        setActiveVideo(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ensureAudioReady = async () => {
    if (ready) return;
    engineRef.current?.ensure();
    setReady(true);
  };

  const activate = async (r: TPLReference) => {
    await ensureAudioReady();

    // ⚠️ ton schéma v0 n’a PAS encore audioSrc/texte/imageSrc/videoSrc.
    // Donc ici on active seulement ce qui existe dans `r.media` (image / video).
    if (r.media?.kind === "image") {
      setActiveImage(r.media.src);
      setActiveVideo(null);
      setActiveText(null);
      return;
    }

    if (r.media?.kind === "video") {
      setActiveVideo(r.media.src);
      setActiveImage(null);
      setActiveText(null);
      return;
    }

    // fallback : texte simple (à remplacer plus tard par un vrai champ)
    setActiveText(r.title);
    setActiveImage(null);
    setActiveVideo(null);
  };

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
              live
            </div>
            <div className="mt-2 text-sm text-zinc-700">
              espace = silence · x = clear · clique pour activer
            </div>
          </div>

          <button
            onClick={ensureAudioReady}
            className="border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {ready ? "audio ready" : "arm audio"}
          </button>
        </header>

        {/* STAGE */}
        <section className="relative min-h-[40vh] overflow-hidden border border-zinc-300 bg-white">
          {activeVideo ? (
            <video
              src={activeVideo}
              autoPlay
              loop
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          {activeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}

          <div className="relative z-10 flex min-h-[40vh] items-center justify-center p-6">
            {activeText ? (
              <div className="max-w-3xl text-center text-2xl font-medium leading-tight md:text-4xl">
                {activeText}
              </div>
            ) : (
              <div className="mono text-xs uppercase tracking-widest text-zinc-600">
                no active media
              </div>
            )}
          </div>
        </section>

        {/* LIST */}
        <section className="mt-8">
          <div className="mono mb-3 text-[11px] uppercase tracking-widest text-zinc-600">
            available references ({refs.length})
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {refs.map((r) => (
              <button
                key={r.id}
                onClick={() => activate(r)}
                className="text-left border border-zinc-300 bg-white hover:bg-zinc-50"
                type="button"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-medium leading-snug">
                        {r.title}
                      </div>
                      <div className="mono mt-1 text-[11px] uppercase tracking-widest text-zinc-600">
                        {prettyType(r.type)} · {formatYear(r)}
                        {r.creator ? ` · ${r.creator}` : ""}
                      </div>
                    </div>

                    {r.location ? (
                      <div className="mono text-[11px] text-zinc-600">
                        {r.location}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
