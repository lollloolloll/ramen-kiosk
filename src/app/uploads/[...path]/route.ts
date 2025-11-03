import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const uploadsBaseDir = path.join(process.cwd(), "public", "uploads");

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  props: { params: Promise<{ path: string[] }> } // ⭐ Promise로 변경
) {
  try {
    const params = await props.params; // ⭐ await 추가
    const requestedSegments = params.path || [];
    const unsafePath = requestedSegments.join("/");
    const resolved = path.resolve(uploadsBaseDir, unsafePath);

    if (!resolved.startsWith(uploadsBaseDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const data = await readFile(resolved);
    const contentType = getContentType(resolved);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
