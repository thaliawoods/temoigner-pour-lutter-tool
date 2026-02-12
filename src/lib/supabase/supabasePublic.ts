const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUCKET = "tpl-web";

function isAbsoluteUrl(s: string) {
  return /^https?:\/\//i.test(s) || s.startsWith("data:");
}

function inferFolder(path: string): string {
  if (path.includes("/")) return path;

  const lower = path.toLowerCase();

  if (/\.(mp3|m4a|wav|ogg|aac)$/i.test(lower)) return `audio/${path}`;
  if (/\.(mp4|webm|mov|m4v)$/i.test(lower)) return `video/${path}`;
  if (/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(lower)) return `image/${path}`;

  return path;
}

export function resolvePublicMediaUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return "";
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;
  if (!SUPABASE_URL) return pathOrUrl;

  const clean = pathOrUrl.replace(/^\/+/, "");
  const inferred = inferFolder(clean);
  const base = SUPABASE_URL.replace(/\/+$/, "");

  return `${base}/storage/v1/object/public/${BUCKET}/${encodeURI(inferred)}`;
}
