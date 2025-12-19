// src/lib/db/index.ts
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@drizzle/schema";
import path from "path";
import fs from "fs";

function getDatabasePath(): string {
  // Docker 컨테이너 환경에서는 '/app/data' 경로를 사용
  if (process.env.DOCKER_CONTAINER) {
    return "/app/data/local.db";
  }

  // 로컬 환경에서는 프로젝트 루트의 'data' 폴더를 사용
  return path.resolve(process.cwd(), "data", "local.db");
}

const DATABASE_PATH = getDatabasePath();
const DATABASE_DIR = path.dirname(DATABASE_PATH);

// 데이터베이스 디렉토리가 없으면 생성
if (!fs.existsSync(DATABASE_DIR)) {
  // console.log(`[DB] Creating database directory: ${DATABASE_DIR}`);
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

// console.log(`[DB] Using database at: ${DATABASE_PATH}`);

const sqlite = new Database(DATABASE_PATH);

export const db = drizzle(sqlite, { schema });
