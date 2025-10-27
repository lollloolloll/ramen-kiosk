import { drizzle } from "drizzle-orm/better-sqlite3";
// src/lib/db/index.ts

import Database from "better-sqlite3";
import * as schema from "@drizzle/schema";

// .env 파일에 DATABASE_URL이 설정되어 있는지 확인합니다.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다.");
}

// .env 파일에 정의된 DATABASE_URL 경로로 데이터베이스에 연결합니다.
const sqlite = new Database(process.env.DATABASE_URL);

export const db = drizzle(sqlite, { schema });
