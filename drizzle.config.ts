// drizzle.config.ts

import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // .env 파일 경로를 명시해주는 것이 더 안전합니다.
export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    // 루트의 local.db를 사용하도록 직접 지정합니다.
    url: "local.db",
  },
} satisfies Config;
