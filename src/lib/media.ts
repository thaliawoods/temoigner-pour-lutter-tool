import type { TPLMedia, TPLReference } from "@/lib/schema";

export const BUCKET = "tpl-media";

export type BucketKind = "images" | "video" | "audio";

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
  const base = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
  if (!base) return "";
  const normalized = path
    .replace(/^image\//, "images/")
    .replace(/^performance\//, "performances/");
  return `${base}/${encodePath(normalized)}`;
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

async function listFolder(kind: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/bunny/list?folder=${kind}`);
    if (!res.ok) return [];
    const data: { files: string[] } = await res.json();
    return data.files ?? [];
  } catch {
    return [];
  }
}

export async function listBucketMedia() {
  const kinds: BucketKind[] = ["images", "video", "audio"];
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const names = await listFolder(kind);
      const files: BucketFile[] = names.map((name) => ({
        kind,
        path: `${kind}/${name}`,
        name,
        key: makeKey(name),
      }));
      return [kind, files] as const;
    })
  );

  const out: Record<BucketKind, BucketFile[]> = {
    images: [],
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
  return "images";
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

  if (kind === "images") return { kind: "image", src: chosen.path, alt: r.title };
  if (kind === "video") return { kind: "video", src: chosen.path };
  return { kind: "audio", src: chosen.path, title: r.title };
}
