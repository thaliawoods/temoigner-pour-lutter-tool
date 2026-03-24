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

  const base = process.env.NEXT_PUBLIC_BUNNY_CDN_URL ?? "";
  if (!base) return "";

  const normalized = path
    .replace(/^image\//, "images/")
    .replace(/^performance\//, "performances/");
  const url = `${base}/${encodePath(normalized)}`;
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
