"use server";

import { promises as fs } from "fs";
import path from "path";

export async function downloadDatabase() {
  // 1. 환경변수에서 경로 가져오기 (file:/app/data/local.db)
  let dbUrl = process.env.DATABASE_URL || "local.db";

  // 'file:' 접두어 제거 -> /app/data/local.db
  if (dbUrl.startsWith("file:")) {
    dbUrl = dbUrl.replace("file:", "");
  }

  // 파일명만 추출 (local.db)
  const fileName = path.basename(dbUrl);

  // 2. 찾아볼 경로 후보들 설정 (우선순위 순)
  const candidatePaths = [
    dbUrl, // 1순위: 환경변수 경로 그대로 (Docker용: /app/data/local.db)
    path.join(process.cwd(), "data", fileName), // 2순위: 현재폴더/data/파일명 (Local용: .../ramen-kiosk/data/local.db)
    path.join(process.cwd(), fileName), // 3순위: 현재폴더/파일명 (비상용)
  ];

  let fileBuffer: Buffer | null = null;
  let usedPath = "";

  // 3. 순서대로 파일을 찾아봄
  for (const p of candidatePaths) {
    try {
      fileBuffer = await fs.readFile(p);
      usedPath = p;
      break; // 파일을 찾으면 반복 중단
    } catch (error) {
      // 해당 경로에 없으면 다음 후보로 넘어감
      continue;
    }
  }

  // 4. 모든 경로를 다 뒤져도 없으면 에러 리턴
  if (!fileBuffer) {
    console.error(
      `DB 파일을 찾을 수 없음. 시도한 경로들: ${candidatePaths.join(", ")}`
    );
    return {
      success: false,
      error: `서버에서 데이터베이스 파일을 찾을 수 없습니다. (경로 확인 필요)`,
    };
  }

  try {
    console.log(`백업 성공 경로: ${usedPath}`); // 디버깅용: 어디서 찾았는지 로그 출력

    // 5. 현재 시간으로 파일명 생성
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const downloadFileName = `local_${timestamp}.db`;

    // 6. 엑셀 다운로드 방식(Base64)으로 반환
    return {
      success: true,
      buffer: fileBuffer.toString("base64"),
      fileName: downloadFileName,
      mimeType: "application/x-sqlite3",
    };
  } catch (error) {
    console.error("데이터베이스 백업 처리 중 오류:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
