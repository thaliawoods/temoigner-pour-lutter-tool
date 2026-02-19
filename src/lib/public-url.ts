export const BUCKET = "tpl-web";

function encodePath(path: string) {
  return path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
}

const urlCache = new Map<string, string>();

export function buildPublicUrl(path?: string | null) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const cached = urlCache.get(path);
  if (cached) return cached;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!base) return "";

  const url = `${base}/storage/v1/object/public/${BUCKET}/${encodePath(path)}`;
  urlCache.set(path, url);
  return url;
}

export function preloadPublicImage(path?: string | null) {
  const url = buildPublicUrl(path);
  if (!url) return;

  const img = new Image();
  img.decoding = "async";
  img.src = url;
}
