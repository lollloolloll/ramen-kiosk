import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (PDF/문서 파일을 위해 증가)
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

// 확장자 기반 검증 (MIME 타입이 정확하지 않을 수 있으므로)
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
];

const uploadDir = path.join(process.cwd(), "public/uploads/consent");

// 파일 확장자 확인 함수
function hasAllowedExtension(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// 문서 파일 업로드를 위한 설정
export const runtime = "nodejs";
export const maxDuration = 60; // 1분

export async function POST(req: NextRequest) {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided." },
        { status: 400 }
      );
    }

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

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, file.name), buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error uploading file:", error);
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
