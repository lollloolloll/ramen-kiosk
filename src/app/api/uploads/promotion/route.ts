import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const uploadDir = path.join(process.cwd(), "public/uploads/promotion");

export async function POST(req: NextRequest) {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    for (const file of files) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `File type not allowed: ${file.type}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File size exceeds limit: ${file.name}` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, file.name), buffer);
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
