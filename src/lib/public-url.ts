export const BUCKET = "tpl-web";

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
