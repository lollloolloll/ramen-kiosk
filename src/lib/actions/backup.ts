"use server";

import { promises as fs } from "fs";
import fsStats from "fs";
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
  // 임시 파일명 (확장자는 tar.gz)
  const backupFileName = `full_backup_${timestamp}.tar.gz`;
  const backupFilePath = path.join(process.cwd(), backupFileName);

  try {
    // 1. 백업할 대상 폴더 경로 설정 (상대 경로 권장)
    // process.cwd() 기준: "data" 폴더와 "public/uploads" 폴더
    const targets = [];

    // data 폴더 확인
    if (fsStats.existsSync(path.join(process.cwd(), "data"))) {
      targets.push("data");
    }

    // uploads 폴더 확인
    if (fsStats.existsSync(path.join(process.cwd(), "public", "uploads"))) {
      // tar 명령어에서 경로 문제를 피하기 위해 윈도우/리눅스 공통적으로 'public/uploads' 형태로 전달
      targets.push("public/uploads");
    }

    if (targets.length === 0) {
      return {
        success: false,
        error: "백업할 데이터 폴더(data 또는 uploads)가 없습니다.",
      };
    }

    // 2. OS 내장 tar 명령어로 압축 실행
    // -c: 생성, -z: gzip 압축, -f: 파일명 지정
    // 윈도우 PowerShell/CMD 및 리눅스 쉘 모두에서 작동하도록 명령어 구성
    const targetString = targets.join(" ");
    const command = `tar -czf "${backupFileName}" ${targetString}`;

    console.log(`백업 시작: ${command}`);

    // 명령어 실행 (cwd 옵션으로 현재 프로젝트 루트에서 실행)
    await execAsync(command, { cwd: process.cwd() });

    // 3. 생성된 압축 파일 읽기
    const fileBuffer = await fs.readFile(backupFilePath);

    // 4. 임시 파일 삭제 (청소)
    await fs.unlink(backupFilePath);

    console.log("백업 완료 및 임시 파일 삭제됨");

    // 5. 다운로드 정보 반환 (Base64)
    return {
      success: true,
      type: "full",
      buffer: fileBuffer.toString("base64"),
      fileName: backupFileName,
      mimeType: "application/gzip", // .tar.gz의 MIME 타입
    };
  } catch (error) {
    console.error("전체 백업 처리 중 오류:", error);

    // 에러 발생 시에도 혹시 생성된 임시 파일이 있다면 삭제 시도
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
