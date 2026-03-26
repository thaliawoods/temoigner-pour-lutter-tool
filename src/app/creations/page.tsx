"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CDN_URL = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";

function encodePath(p: string) {
  return p.split("/").map(encodeURIComponent).join("/");
}

function buildUrl(filename: string) {
  return `${CDN_URL}/${encodePath(`creations/${filename}`)}`;
}

function stripExt(s: string) {
  return s.replace(/\.[a-z0-9]+$/i, "");
}

function prettyName(filename: string) {
  const base = stripExt(filename);
  const withoutTs = base.replace(/^\d{13}-?/, "");
  return withoutTs ? withoutTs.replace(/-/g, " ") : "";
}

function formatDate(filename: string) {
  const match = filename.match(/^(\d{13})/);
  if (!match) return "";
  const d = new Date(Number(match[1]));
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

type Creation = {
  filename: string;
  url: string;
  isVideo: boolean;
  name: string;
  date: string;
};

const VIDEO_EXTS = /\.webm$/i;
const IMAGE_EXTS = /\.(png|jpe?g|webp|gif)$/i;

// ── upload form ───────────────────────────────────────────────────────────────

function UploadForm({ onUploaded, onClose }: { onUploaded: () => void; onClose: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File) => {
    if (!f.type.startsWith("image/") && f.type !== "video/webm") {
      setError("Format accepté : PNG, JPG, WebM");
      return;
    }
    setFile(f);
    setError("");
    setDone(false);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) accept(f);
  }, []);

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (name.trim()) fd.append("name", name.trim());
      const res = await fetch("/api/bunny/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Erreur ${res.status}`);
      }
      setFile(null);
      setName("");
      setDone(true);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div className="border border-dashed border-black/25 mb-12">
      {/* Form header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-dashed border-black/15">
        <div className="mono text-[11px] uppercase tracking-[0.22em] text-black/45">
          partager une création
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest"
        >
          fermer ×
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            border border-dashed cursor-pointer flex items-center justify-center min-h-[220px] transition-colors
            ${dragging ? "border-black bg-black/5" : "border-black/20 hover:border-black/40"}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/webm"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) accept(f); }}
          />
          {previewUrl ? (
            <div className="w-full h-full p-2 flex items-center justify-center">
              {file?.type.startsWith("image/") ? (
                <img src={previewUrl} alt="preview" className="max-h-[200px] max-w-full object-contain" />
              ) : (
                <video src={previewUrl} className="max-h-[200px] max-w-full" muted />
              )}
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="gertrude text-[18px] text-black/35 mb-2">
                déposer un fichier ici
              </div>
              <div className="mono text-[10px] uppercase tracking-[0.2em] text-black/25">
                ou cliquer pour sélectionner
              </div>
              <div className="mono text-[10px] uppercase tracking-[0.2em] text-black/20 mt-1">
                png · jpg · webm
              </div>
            </div>
          )}
        </div>

        {/* Fields + submit */}
        <div className="flex flex-col justify-between gap-4">
          <div>
            <label className="mono text-[10px] uppercase tracking-[0.2em] text-black/40 block mb-2">
              titre (optionnel)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="donnez un titre à votre création"
              maxLength={80}
              className="gertrude w-full border-b border-black/25 bg-transparent py-1.5 text-[15px] placeholder:text-black/25 focus:outline-none focus:border-black"
            />
          </div>

          <div>
            {error && (
              <div className="mono text-[11px] text-red-500 mb-3 leading-snug">{error}</div>
            )}
            {done && (
              <div className="mono text-[11px] uppercase tracking-widest text-black/50 mb-3">
                création partagée ✓
              </div>
            )}
            <button
              onClick={submit}
              disabled={!file || uploading}
              type="button"
              className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest w-full disabled:opacity-30"
            >
              {uploading ? "envoi en cours…" : "partager ma création"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── creation card ─────────────────────────────────────────────────────────────

function CreationCard({ creation }: { creation: Creation }) {
  const [errored, setErrored] = useState(false);
  if (errored) return null;

  return (
    <div className="flex flex-col">
      <div className="border border-black/10 overflow-hidden bg-zinc-50 flex items-center justify-center min-h-[200px]">
        {creation.isVideo ? (
          <video
            src={creation.url}
            controls
            playsInline
            preload="metadata"
            className="w-full object-contain"
            style={{ display: "block", maxHeight: "520px" }}
            onError={() => setErrored(true)}
          />
        ) : (
          <img
            src={creation.url}
            alt={creation.name || "création"}
            className="w-full object-contain"
            style={{ display: "block", maxHeight: "520px" }}
            onError={() => setErrored(true)}
          />
        )}
      </div>

      <div className="pt-3 pb-1 flex items-start justify-between gap-3">
        <div>
          {creation.name && (
            <div className="gertrude text-[16px] leading-snug">{creation.name}</div>
          )}
          {creation.date && (
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-black/35 mt-1">
              {creation.date}
            </div>
          )}
        </div>
        <a
          href={creation.url}
          download
          target="_blank"
          rel="noreferrer"
          className="mono text-[10px] uppercase tracking-[0.18em] text-black/35 hover:text-black transition-colors shrink-0 mt-0.5"
        >
          ↓
        </a>
      </div>
    </div>
  );
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function CreationsPage() {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchCreations = useCallback(async () => {
    try {
      const d = await fetch("/api/bunny/list?folder=creations").then((r) => r.json());
      const files: string[] = (d.files ?? [])
        .filter((f: string) => IMAGE_EXTS.test(f) || VIDEO_EXTS.test(f))
        .sort()
        .reverse();

      setCreations(
        files.map((filename) => ({
          filename,
          url: buildUrl(filename),
          isVideo: VIDEO_EXTS.test(filename),
          name: prettyName(filename),
          date: formatDate(filename),
        }))
      );
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCreations();
  }, [fetchCreations]);

  const handleUploaded = () => {
    void fetchCreations();
    setShowForm(false);
  };

  return (
    <main className="bg-white text-zinc-900 min-h-screen">
      <div className="mx-auto max-w-[1100px] px-6 pt-10 pb-20">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mono text-[11px] uppercase tracking-[0.22em] text-black/40">
              créations
            </div>
            <h1 className="gertrude mt-1 text-[32px] leading-tight">
              vos créations
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="border border-zinc-300 bg-white px-3 py-2 text-xs mono uppercase tracking-widest shrink-0 self-start md:self-auto"
          >
            {showForm ? "fermer" : "partager ma création"}
          </button>
        </div>

        <div className="border-t border-black/10 mb-8" />

        {/* Upload form — shown when toggled */}
        {showForm && (
          <UploadForm
            onUploaded={handleUploaded}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Count */}
        <div className="mono text-[11px] uppercase tracking-[0.22em] text-black/35 mb-6">
          {loading
            ? "chargement…"
            : `${creations.length} création${creations.length !== 1 ? "s" : ""}`}
        </div>

        {/* Empty state */}
        {!loading && creations.length === 0 && (
          <div
            className="border border-dashed border-black/15 flex flex-col items-center justify-center py-20 gap-4 cursor-pointer hover:border-black/30 transition-colors"
            onClick={() => setShowForm(true)}
          >
            <div className="gertrude text-[18px] text-black/30">
              aucune création partagée pour l'instant
            </div>
            <div className="mono text-[10px] uppercase tracking-[0.22em] text-black/25">
              cliquer pour partager la première
            </div>
          </div>
        )}

        {/* Gallery — 2 columns on md, 3 on xl */}
        <div className="columns-1 sm:columns-2 xl:columns-3 gap-6 space-y-6">
          {creations.map((c) => (
            <div key={c.filename} className="break-inside-avoid">
              <CreationCard creation={c} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
