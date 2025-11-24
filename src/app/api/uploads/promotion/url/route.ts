import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "public/uploads/promotion");
const urlsFile = path.join(uploadDir, "urls.json");

interface VideoUrl {
  type: "url";
  name: string;
  url: string;
}

async function readUrls(): Promise<VideoUrl[]> {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const data = await fs.readFile(urlsFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeUrls(urls: VideoUrl[]): Promise<void> {
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(urlsFile, JSON.stringify(urls, null, 2), "utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const { url, title } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid URL is required." },
        { status: 400 }
      );
    }

    // URL 유효성 검사
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format." },
        { status: 400 }
      );
    }

    const urls = await readUrls();
    const name = title || url;

    // 중복 체크 (선택사항)
    const exists = urls.some((item) => item.url === url);
    if (exists) {
      return NextResponse.json(
        { success: false, error: "URL already exists." },
        { status: 400 }
      );
    }

    urls.push({
      type: "url",
      name,
      url,
    });

    await writeUrls(urls);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add URL." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title");

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required." },
        { status: 400 }
      );
    }

    const urls = await readUrls();
    const filteredUrls = urls.filter((item) => item.name !== title);

    if (urls.length === filteredUrls.length) {
      return NextResponse.json(
        { success: false, error: "URL not found." },
        { status: 404 }
      );
    }

    await writeUrls(filteredUrls);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete URL." },
      { status: 500 }
    );
  }
}
