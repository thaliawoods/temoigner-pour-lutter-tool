import { NextRequest, NextResponse } from "next/server";

const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY ?? "";
const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE ?? "tpl-media";
const STORAGE_BASE = "https://storage.bunnycdn.com";

export async function POST(req: NextRequest) {
  if (!STORAGE_API_KEY) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const rawName = formData.get("name");
  const name = typeof rawName === "string" && rawName.trim()
    ? rawName.trim().slice(0, 80).replace(/[^a-zA-Z0-9À-ÖØ-öø-ÿ _\-]/g, "")
    : "";

  const ext = file.type === "video/webm" ? "webm" : "png";
  const timestamp = Date.now();
  const slug = name
    ? `${timestamp}-${name.toLowerCase().replace(/\s+/g, "-")}`
    : `${timestamp}`;
  const filename = `${slug}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const res = await fetch(
    `${STORAGE_BASE}/${STORAGE_ZONE}/creations/${filename}`,
    {
      method: "PUT",
      headers: {
        AccessKey: STORAGE_API_KEY,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: arrayBuffer,
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[upload] Bunny error", res.status, body);
    return NextResponse.json(
      { error: `Upload failed (${res.status}): ${body}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ filename });
}
