// drizzle.config.ts

import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" }); // .env 파일 경로를 명시해주는 것이 더 안전합니다.

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    // 하드코딩된 url 대신 환경 변수를 사용합니다.
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
