import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
];

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".pdf",
];

const uploadDir = path.join(process.cwd(), "public/uploads/promotion");
const urlsFile = path.join(uploadDir, "urls.json");

// URL 데이터 타입
interface VideoUrl {
  type: "url";
  name: string;
  url: string;
}

// URL 목록 읽기
async function readUrls(): Promise<VideoUrl[]> {
  try {
    const data = await fs.readFile(urlsFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// URL 목록 저장
async function writeUrls(urls: VideoUrl[]): Promise<void> {
  await fs.writeFile(urlsFile, JSON.stringify(urls, null, 2), "utf-8");
}

function hasAllowedExtension(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

function sanitizeFileName(fileName: string): string {
  const sanitized = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || "uploaded_file";
}

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    for (const file of files) {
      if (!hasAllowedExtension(file.name)) {
        return NextResponse.json(
          {
            success: false,
            error: `File extension not allowed: ${path.extname(file.name)}`,
          },
          { status: 400 }
        );
      }

      if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
        console.warn(`MIME type mismatch: ${file.type} for file ${file.name}`);
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File size exceeds limit: ${file.name}` },
          { status: 400 }
        );
      }

      const sanitizedFileName = sanitizeFileName(file.name);
      let finalFileName = sanitizedFileName;
      let counter = 1;

      while (
        await fs
          .access(path.join(uploadDir, finalFileName))
          .then(() => true)
          .catch(() => false)
      ) {
        const ext = path.extname(sanitizedFileName);
        const nameWithoutExt = path.basename(sanitizedFileName, ext);
        finalFileName = `${nameWithoutExt}_${counter}${ext}`;
        counter++;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, finalFileName), buffer);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { success: false, error: "File upload failed." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const files = await fs.readdir(uploadDir);

    // urls.json 제외
    const actualFiles = files.filter((f) => f !== "urls.json");

    // URL 목록 읽기
    const urls = await readUrls();

    return NextResponse.json({ files: actualFiles, urls });
  } catch (error) {
    console.error("Error reading upload directory:", error);
    return NextResponse.json(
      { success: false, error: "Could not read upload directory." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: "File name is required." },
        { status: 400 }
      );
    }

    await fs.unlink(path.join(uploadDir, fileName));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { success: false, error: "File deletion failed." },
      { status: 500 }
    );
  }
}
