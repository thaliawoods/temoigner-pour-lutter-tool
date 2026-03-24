"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
const STREAM_CDN = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? "";

type MediaKind = "image" | "video" | "audio";

type MediaFile = {
  id: string;
  path: string;
  url: string;
  kind: MediaKind;
  name: string;
  folder: string;
};

function encodePath(path: string) {
  return path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
}

function buildPublicUrl(path: string) {
  if (!CDN_URL) return "";
  return `${CDN_URL}/${encodePath(path)}`;
}

function stripExtension(s: string) {
  return s.replace(/\.[a-z0-9]+$/i, "");
}

type StreamVideo = { guid: string; title: string; thumbnailFileName: string };

function streamToMediaFile(v: StreamVideo): MediaFile {
  return {
    id: `stream-${v.guid}`,
    path: `stream/${v.guid}`,
    url: `${STREAM_CDN}/${v.guid}/play_720p.mp4`,
    kind: "video",
    name: stripExtension(v.title),
    folder: "stream",
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toMediaFile(folder: string, kind: MediaKind) {
  return (name: string): MediaFile => {
    const path = `${folder}/${name}`;
    return {
      id: path,
      path,
      url: buildPublicUrl(path),
      kind,
      name: stripExtension(name),
      folder,
    };
  };
}

function MediaDisplay({ f }: { f: MediaFile }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-zinc-50">
        <div className="mono text-[11px] uppercase tracking-widest text-zinc-400">
          impossible d'afficher ce fichier
        </div>
      </div>
    );
  }

  const hide = () => setErrored(true);

  if (f.kind === "image") {
    return (
      <img
        src={f.url}
        alt={f.name}
        className="h-full w-full object-contain"
        onError={hide}
      />
    );
  }

  if (f.kind === "video") {
    return (
      <video
        src={f.url}
        className="h-full w-full object-contain"
        muted
        playsInline
        controls
        preload="metadata"
        onError={hide}
      />
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-50">
      <audio
        src={f.url}
        controls
        preload="metadata"
        className="w-[92%]"
        onError={hide}
      />
    </div>
  );
}

const IMAGE_EXTS = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

export default function ArchivesReader() {
  const [allFiles, setAllFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const [imgData, streamData, audData] = await Promise.all([
          fetch("/api/bunny/list?folder=images").then((r) => r.json()),
          fetch("/api/bunny/stream").then((r) => r.json()),
          fetch("/api/bunny/list?folder=audio").then((r) => r.json()),
        ]);

        if (cancelled) return;

        const images: MediaFile[] = (imgData.files ?? [])
          .filter((f: string) => IMAGE_EXTS.test(f))
          .map(toMediaFile("images", "image"));

        const videos: MediaFile[] = (streamData.videos ?? []).map(streamToMediaFile);

        const audios: MediaFile[] = (audData.files ?? [])
          .filter((f: string) => /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f))
          .map(toMediaFile("audio", "audio"));

        setAllFiles([...images, ...videos, ...audios]);
      } catch (e) {
        console.error("[archives] fetch error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allFiles;
    return allFiles.filter((f) =>
      `${f.name} ${f.folder} ${f.kind}`.toLowerCase().includes(q)
    );
  }, [allFiles, query]);

  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((f) => f.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  const selectByOffset = useCallback(
    (delta: number) => {
      if (!filtered.length || !selected) return;
      const idx = filtered.findIndex((f) => f.id === selected.id);
      const cur = idx >= 0 ? idx : 0;
      const next = Math.max(0, Math.min(filtered.length - 1, cur + delta));
      const nextId = filtered[next]?.id;
      if (nextId) setSelectedId(nextId);
    },
    [filtered, selected]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isTyping) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectByOffset(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        selectByOffset(1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectByOffset]);

  return (
    <main className="bg-white text-zinc-900">
      <div className="mx-auto max-w-[1500px] px-6 py-10">
        <header className="mb-6">
          <div className="mono text-[11px] uppercase tracking-widest text-zinc-600">
            archives
          </div>
          <h1 className="mt-2 text-3xl font-medium">bibliothèque</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            sélectionner un fichier pour afficher l'image/vidéo/audio.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,520px)_1fr] gap-0 border border-zinc-200">
          {/* list */}
          <aside className="border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="p-3 border-b border-zinc-200 bg-white sticky top-0 z-10">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="rechercher (nom, type…)"
                className="w-full border border-zinc-300 px-3 py-2 text-sm bg-white"
              />
              <div className="mt-2 mono text-[11px] uppercase tracking-widest text-zinc-600">
                {loading ? "loading…" : `${filtered.length} items`}
              </div>
            </div>

            <div className="max-h-[calc(100vh-260px)] overflow-auto">
              {filtered.map((f) => {
                const active = f.id === selected?.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className={[
                      "w-full text-left px-4 py-2 border-b border-zinc-200",
                      active
                        ? "bg-zinc-900 text-white"
                        : "bg-white hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-[13px] leading-snug truncate">
                        {f.name}
                      </div>
                      <div
                        className={[
                          "mono text-[11px] uppercase tracking-widest shrink-0",
                          active ? "text-white/80" : "text-zinc-500",
                        ].join(" ")}
                      >
                        {f.kind}
                      </div>
                    </div>

                    <div
                      className={[
                        "mt-1 mono text-[10px] uppercase tracking-widest",
                        active ? "text-white/60" : "text-zinc-500",
                      ].join(" ")}
                    >
                      {f.folder}
                    </div>
                  </button>
                );
              })}

              {!loading && filtered.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500">aucun résultat</div>
              ) : null}
            </div>
          </aside>

          {/* media */}
          <section className="border-b lg:border-b-0 lg:border-r border-zinc-200 bg-white">
            <div className="h-[520px] w-full bg-zinc-100">
              {selected ? <MediaDisplay f={selected} /> : null}
            </div>
          </section>

          {/* info */}
          <section className="bg-white">
            {selected ? (
              <div className="p-6">
                <div className="mono text-[11px] uppercase tracking-widest text-zinc-500">
                  {selected.kind} · {selected.folder}
                </div>

                <h2 className="mt-3 text-[22px] leading-snug font-medium break-words">
                  {selected.name}
                </h2>

                <div className="mt-6 grid grid-cols-1 border border-zinc-200">
                  <div className="p-4 border-b border-zinc-200">
                    <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                      type
                    </div>
                    <div className="mt-2 text-sm">{selected.kind}</div>
                  </div>
                  <div className="p-4 border-b border-zinc-200">
                    <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                      dossier
                    </div>
                    <div className="mt-2 text-sm mono">{selected.folder}</div>
                  </div>
                  <div className="p-4">
                    <div className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                      fichier
                    </div>
                    <div className="mt-2 text-sm mono break-all">
                      {selected.path}
                    </div>
                  </div>
                </div>
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
