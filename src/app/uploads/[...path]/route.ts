import { NextResponse } from "next/server";
import { readFile, stat, open } from "fs/promises";
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
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".avi":
      return "video/x-msvideo";
    case ".mkv":
      return "video/x-matroska";
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

function isVideoFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".mp4", ".webm", ".mov", ".avi", ".mkv"].includes(ext);
}

export async function GET(
  request: Request,
  props: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await props.params;
    const requestedSegments = params.path || [];
    const unsafePath = requestedSegments.join("/");
    const resolved = path.resolve(uploadsBaseDir, unsafePath);

    // 보안 검증
    if (!resolved.startsWith(uploadsBaseDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const contentType = getContentType(resolved);
    const fileSize = fileStat.size;

    // 동영상 파일인 경우 Range Request 처리
    if (isVideoFile(resolved)) {
      const rangeHeader = request.headers.get("range");

      // Range 요청이 없으면 전체 파일 반환 (첫 요청)
      if (!rangeHeader) {
        const data = await readFile(resolved);
        return new NextResponse(data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": fileSize.toString(),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }

      // Range 파싱
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // 범위 검증
      if (start >= fileSize || end >= fileSize) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      // 파일의 특정 부분만 읽기
      const fileHandle = await open(resolved, "r");
      const buffer = Buffer.alloc(chunkSize);
      await fileHandle.read(buffer, 0, chunkSize, start);
      await fileHandle.close();

      return new NextResponse(buffer, {
        status: 206, // Partial Content
        headers: {
          "Content-Type": contentType,
          "Content-Length": chunkSize.toString(),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 이미지 등 일반 파일은 전체 반환
    const data = await readFile(resolved);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileSize.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File serving error:", error);
    return new NextResponse("Not Found", { status: 404 });
  }
}
