// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@drizzle/schema";

// 환경변수에서 경로 가져오기 (기본값 포함)
function getDatabasePath(): string {
  // 프로덕션(컨테이너)에서는 네임드 볼륨 경로를 강제 고정
  if (process.env.NODE_ENV === "production") {
    const fixedPath = "/app/data/local.db";
    console.log(`[DB] Production mode: forcing database path -> ${fixedPath}`);
    return fixedPath;
  }

  // 개발 환경에서는 환경변수 우선, 없으면 기본값 사용
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    const defaultPath = "/app/data/local.db";
    console.log(`[DB] DATABASE_URL not set, using default: ${defaultPath}`);
    return defaultPath;
  }

  const path = dbUrl.replace("file:", "");
  console.log(`[DB] Using DATABASE_URL: ${path}`);
  return path;
}

const DATABASE_PATH = getDatabasePath();

// 개발 환경에서 파일 존재 확인 (선택사항)
try {
  const fs = require("fs");
  if (!fs.existsSync(DATABASE_PATH)) {
    console.warn(
      `[DB] Warning: Database file does not exist: ${DATABASE_PATH}`
    );
  }
} catch (e) {
  // 파일 시스템 체크 실패해도 계속 진행
}

const sqlite = new Database(DATABASE_PATH);

export const db = drizzle(sqlite, { schema });
