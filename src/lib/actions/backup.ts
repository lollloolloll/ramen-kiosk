"use server";

import { promises as fs } from "fs";
import fsStats from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util"; // exec를 Promise처럼 사용하기 위함

const execAsync = promisify(exec);

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
      type: "db", // ✅ DB 다운로드 타입
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

/**
 * ✅ [추가] 이미지 포함 전체 백업 (DB + public/uploads)
 * 도커 명령어를 실행하여 볼륨 전체를 백업합니다. (서버에 Docker CLI가 설치되어 있어야 함)
 */
export async function downloadFullBackup() {
  const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
  const backupFileName = `full_backup_${timestamp}.tar.gz`;

  // OS 확인
  const isWindows = process.platform === "win32";

  // 1. 실제 파일이 저장될 절대 경로 (Node.js 파일 읽기용)
  let backupFilePath: string;

  // 2. tar 명령어에 전달할 경로 (tar 명령어용)
  let tarOutputPayload: string;

  if (isWindows) {
    // [Windows] 현재 폴더(cwd)에 저장.
    // 절대 경로(C:\...)를 쓰면 tar가 콜론(:)을 인식 못해 에러 발생함.
    backupFilePath = path.join(process.cwd(), backupFileName);
    tarOutputPayload = backupFileName; // 파일명만 전달 (상대 경로)
  } else {
    // [Linux/Docker] 시스템 임시 폴더(/tmp)에 저장.
    // 앱 루트(/app)는 권한이 없을 수 있으므로 /tmp 사용.
    backupFilePath = path.join(os.tmpdir(), backupFileName);
    tarOutputPayload = backupFilePath; // 절대 경로 전달
  }

  try {
    // 3. 백업할 대상 폴더 확인
    const targets = [];
    if (fsStats.existsSync(path.join(process.cwd(), "data"))) {
      targets.push("data");
    }
    if (fsStats.existsSync(path.join(process.cwd(), "public", "uploads"))) {
      targets.push("public/uploads");
    }

    if (targets.length === 0) {
      return {
        success: false,
        error: "백업할 데이터 폴더(data 또는 uploads)가 없습니다.",
      };
    }

    // 4. tar 명령어 실행
    const targetString = targets.join(" ");
    // tarOutputPayload에는 Windows면 "파일명.tar.gz", Linux면 "/tmp/파일명.tar.gz"가 들어감
    const command = `tar -czf "${tarOutputPayload}" ${targetString}`;

    console.log(`백업 시작: ${command}`);

    // cwd 옵션을 주어 항상 프로젝트 루트에서 실행되도록 함
    await execAsync(command, { cwd: process.cwd() });

    // 5. 생성된 파일 읽기 (항상 절대 경로인 backupFilePath 사용)
    const fileBuffer = await fs.readFile(backupFilePath);

    // 6. 임시 파일 삭제
    await fs.unlink(backupFilePath);

    console.log("백업 완료 및 임시 파일 삭제됨");

    return {
      success: true,
      type: "full",
      buffer: fileBuffer.toString("base64"),
      fileName: backupFileName,
      mimeType: "application/gzip",
    };
  } catch (error) {
    console.error("전체 백업 처리 중 오류:", error);

    // 에러 발생 시 청소
    try {
      if (fsStats.existsSync(backupFilePath)) {
        await fs.unlink(backupFilePath);
      }
    } catch (e) {
      /* 무시 */
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
