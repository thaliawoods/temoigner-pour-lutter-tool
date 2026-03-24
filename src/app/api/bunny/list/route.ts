import { NextRequest, NextResponse } from "next/server";

const STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY ?? "";
const STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE ?? "tpl-media";
const STORAGE_BASE = "https://storage.bunnycdn.com";

const ALLOWED_FOLDERS = ["images", "video", "audio", "performances", "mix"];

type BunnyFile = {
  ObjectName: string;
  IsDirectory: boolean;
};

export async function GET(req: NextRequest) {
  const folder = req.nextUrl.searchParams.get("folder") ?? "";

  if (!ALLOWED_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }

  if (!STORAGE_API_KEY) {
    return NextResponse.json({ files: [] });
  }

  try {
    const res = await fetch(`${STORAGE_BASE}/${STORAGE_ZONE}/${folder}/`, {
      headers: {
        AccessKey: STORAGE_API_KEY,
        accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ files: [] });
    }

    const data: BunnyFile[] = await res.json();
    const files = data
      .filter((f) => !f.IsDirectory && f.ObjectName)
      .map((f) => f.ObjectName)
      .sort();

    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
