// drizzle.config.ts

import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // .env 파일 경로를 명시해주는 것이 더 안전합니다.
export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    // 애플리케이션과 동일한 DB 경로를 사용하도록 수정합니다.
    url: "./data/local.db",
  },
} satisfies Config;
