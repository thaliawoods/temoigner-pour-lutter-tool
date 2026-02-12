import type { SupabaseClient } from "@supabase/supabase-js";
import type { TPLMedia, TPLReference } from "@/lib/schema";
import { supabase as supabaseUntyped } from "@/lib/supabase/client";

const supabase = supabaseUntyped as unknown as SupabaseClient;

export const BUCKET = "tpl-web";

export type BucketKind = "image" | "video" | "audio";

export type BucketFile = {
  kind: BucketKind;
  path: string;
  name: string;
  key: string;
};

function encodePath(path: string) {
  return path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
}

export function buildPublicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!base) return "";
  return `${base}/storage/v1/object/public/${BUCKET}/${encodePath(path)}`;
}

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeKey(nameOrPath: string) {
  return normalize(nameOrPath);
}

export async function listBucketMedia() {
  const kinds: BucketKind[] = ["image", "video", "audio"];
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const res = await supabase.storage.from(BUCKET).list(kind, {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      const files: BucketFile[] =
        res.data?.map((f) => {
          const path = `${kind}/${f.name}`;
          return {
            kind,
            path,
            name: f.name,
            key: makeKey(f.name),
          };
        }) ?? [];

      return [kind, files] as const;
    })
  );

  const out: Record<BucketKind, BucketFile[]> = {
    image: [],
    video: [],
    audio: [],
  };

  for (const [kind, files] of results) out[kind] = files;

  return out;
}

function preferredKindForType(t: TPLReference["type"]): BucketKind {
  if (t === "musique" || t === "podcast") return "audio";
  if (t === "film" || t === "video" || t === "performance" || t === "jeu_video")
    return "video";
  return "image";
}

function scoreMatch(fileKey: string, refKey: string) {
  if (!fileKey || !refKey) return 0;
  if (fileKey === refKey) return 100;
  if (fileKey.includes(refKey)) return 40;
  if (refKey.includes(fileKey)) return 20;

  const fileTokens = new Set(fileKey.split(" ").filter(Boolean));
  const refTokens = refKey.split(" ").filter(Boolean);

  let hit = 0;
  for (const t of refTokens) {
    if (fileTokens.has(t)) hit += 3;
    else if (t.length >= 4) {
      for (const ft of fileTokens) {
        if (ft.includes(t) || t.includes(ft)) {
          hit += 1;
          break;
        }
      }
    }
  }
  return hit;
}

export function guessMediaForReference(
  r: TPLReference,
  pool: Record<BucketKind, BucketFile[]>
): TPLMedia | undefined {
  const kind = preferredKindForType(r.type);
  const files = pool[kind];
  if (!files.length) return undefined;

  const candidates = [
    r.id,
    r.title,
    `${r.title} ${r.creator ?? ""}`,
    `${r.creator ?? ""} ${r.title}`,
  ]
    .map((x) => makeKey(x))
    .filter(Boolean);

  let best: { file: BucketFile; score: number } | null = null;

  for (const f of files) {
    let s = 0;
    for (const c of candidates) s = Math.max(s, scoreMatch(f.key, c));
    if (!best || s > best.score) best = { file: f, score: s };
  }

  const chosen = best?.score ? best.file : files[0];

  if (kind === "image") return { kind: "image", src: chosen.path, alt: r.title };
  if (kind === "video") return { kind: "video", src: chosen.path };
  return { kind: "audio", src: chosen.path, title: r.title };
}
