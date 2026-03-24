import { NextResponse } from "next/server";

const STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY ?? "";
const LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID ?? "";

export type StreamVideo = {
  guid: string;
  title: string;
  thumbnailFileName: string;
  length: number;
};

export async function GET() {
  if (!STREAM_API_KEY || !LIBRARY_ID) {
    return NextResponse.json({ videos: [] });
  }

  try {
    const res = await fetch(
      `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos?page=1&itemsPerPage=100&orderBy=date`,
      {
        headers: {
          AccessKey: STREAM_API_KEY,
          accept: "application/json",
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ videos: [] });
    }

    const data = await res.json();
    const videos: StreamVideo[] = (data.items ?? []).map((v: StreamVideo) => ({
      guid: v.guid,
      title: v.title,
      thumbnailFileName: v.thumbnailFileName ?? "thumbnail.jpg",
      length: v.length ?? 0,
    }));

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] });
  }
}
