import {
  sqliteTable,
  AnySQLiteColumn,
  integer,
  text,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const items = sqliteTable("items", {
  id: integer().primaryKey({ autoIncrement: true }).notNull(),
  name: text().notNull(),
  category: text().notNull(),
  imageUrl: text("image_url"),
  // Task 20: 아이템 숨김 기능
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false).notNull(),

  // Task 23: 시간제 대여 관련 (닌텐도 같은 수요가 높은 물품)
  isTimeLimited: integer("is_time_limited", { mode: "boolean" })
    .default(false)
    .notNull(),
  rentalTimeMinutes: integer("rental_time_minutes"), // 시간제 대여인 경우만 설정 (예: 30)
  maxRentalsPerUser: integer("max_rentals_per_user"), // 시간제 대여인 경우만 설정 (예: 3, 하루 최대 횟수)
});

export const users = sqliteTable(
  "users",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    username: text().notNull(),
    hashedPassword: text("hashed_password").notNull(),
    role: text().default("USER").notNull(),
  },
  (table) => [uniqueIndex("users_username_unique").on(table.username)]
);

export const generalUsers = sqliteTable(
  "general_users",
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    name: text().notNull(),
    phoneNumber: text("phone_number").notNull(),
    // Task 21: 성별 컬럼
    gender: text().notNull(),
    birthDate: text("birth_date"),
    school: text(),
    personalInfoConsent: integer("personal_info_consent", { mode: "boolean" }),
    // Task 24: 개인정보 동의서 파일 경로 (addUserForm에서 업로드되어 저장됨)
    consentFilePath: text("consent_file_path"),
  },
  (table) => [
    uniqueIndex("general_users_phone_number_unique").on(table.phoneNumber),
  ]
);

export const rentalRecords = sqliteTable("rental_records", {
  id: integer().primaryKey({ autoIncrement: true }).notNull(),

  // Task 22: 삭제 시 대여 기록 보존
  // set null로 변경하되, 사용자/아이템 정보는 별도로 저장
  userId: integer("user_id").references(() => generalUsers.id, {
    onDelete: "set null",
  }),
  // 사용자 삭제 시에도 기록을 위해 기본 정보 저장
  userName: text("user_name"), // 대여 시점의 사용자 이름
  userPhone: text("user_phone"), // 대여 시점의 전화번호

  itemsId: integer("items_id").references(() => items.id, {
    onDelete: "set null",
  }),
  // 아이템 삭제 시에도 기록을 위해 기본 정보 저장
  itemName: text("item_name"), // 대여 시점의 아이템 이름
  itemCategory: text("item_category"), // 대여 시점의 카테고리

  rentalDate: integer("rental_date")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  // 대여 인원 정보
  maleCount: integer("male_count").default(0).notNull(), // 남자 인원 수
  femaleCount: integer("female_count").default(0).notNull(), // 여자 인원 수

  // 시간제 대여 관련 (isTimeLimited=true인 아이템만 사용)
  // 닌텐도 같은 수요 높은 물품에만 적용
  returnDueDate: integer("return_due_date"), // 시간제 대여인 경우만 설정됨 (rentalDate + rentalTimeMinutes)

  // 반납 관리 - 시간제 대여 아이템만 관리
  // 일반 아이템은 반납 관리 안함 (대부분 false로 유지)
  isReturned: integer("is_returned", { mode: "boolean" })
    .default(false)
    .notNull(),
  // 실제 반납 시간
  // 1) 30분 지나면 자동으로 반납 처리 (returnDate = returnDueDate, 자동)
  // 2) 중도 포기 시 관리자가 수동 반납 (returnDate = 관리자 처리 시간, 수동)
  returnDate: integer("return_date"),
  // 수동 반납 여부 (중도 포기로 관리자가 처리한 경우 true)
  isManualReturn: integer("is_manual_return", { mode: "boolean" })
    .default(false)
    .notNull(),
});

// Task 23: 대기자 명단 테이블
// 닌텐도 같은 인기 있는 시간제 대여 아이템 전용 (사용자 경험 개선)
// 30분 대기 시스템으로 공평한 이용 기회 제공
export const waitingQueue = sqliteTable("waiting_queue", {
  id: integer().primaryKey({ autoIncrement: true }).notNull(),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => generalUsers.id, { onDelete: "cascade" }),
  requestDate: integer("request_date")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  status: text().default("pending").notNull(), // 'pending', 'granted', 'cancelled'
  grantedDate: integer("granted_date"),
});
