import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB (비디오 파일을 위해 증가)
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

// 확장자 기반 검증 (MIME 타입이 정확하지 않을 수 있으므로)
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
];

const uploadDir = path.join(process.cwd(), "public/uploads/promotion");

// 파일 확장자 확인 함수
function hasAllowedExtension(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// 파일명 sanitization (경로 탐색 공격 방지)
function sanitizeFileName(fileName: string): string {
  // 경로 구분자 제거 및 위험한 문자 제거
  const sanitized = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || "uploaded_file";
}

// 큰 파일 업로드를 위한 설정
export const runtime = "nodejs";
export const maxDuration = 300; // 5분 (비디오 파일 업로드 시간 고려)

export async function POST(req: NextRequest) {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    for (const file of files) {
      // 확장자 기반 검증 (더 안전함)
      if (!hasAllowedExtension(file.name)) {
        return NextResponse.json(
          {
            success: false,
            error: `File extension not allowed: ${path.extname(file.name)}`,
          },
          { status: 400 }
        );
      }

      // MIME 타입 검증 (선택적, 빈 문자열이거나 허용된 타입이면 통과)
      if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
        // MIME 타입이 제공되었지만 허용 목록에 없으면 경고만 (확장자 검증이 더 중요)
        console.warn(`MIME type mismatch: ${file.type} for file ${file.name}`);
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File size exceeds limit: ${file.name}` },
          { status: 400 }
        );
      }

      // 파일명 sanitization 및 중복 처리
      const sanitizedFileName = sanitizeFileName(file.name);
      let finalFileName = sanitizedFileName;
      let counter = 1;

      // 파일명 중복 시 번호 추가
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
    return NextResponse.json({ files });
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
