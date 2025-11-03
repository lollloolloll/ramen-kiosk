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
    gender: text().notNull(),
    birthDate: text("birth_date"),
    school: text(),
    personalInfoConsent: integer("personal_info_consent", { mode: "boolean" }),
  },
  (table) => [
    uniqueIndex("general_users_phone_number_unique").on(table.phoneNumber),
  ]
);

export const rentalRecords = sqliteTable("rental_records", {
  id: integer().primaryKey({ autoIncrement: true }).notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => generalUsers.id, { onDelete: "cascade" }), // 사용자 삭제 시 관련 기록도 삭제

  itemsId: integer("items_id")
    .notNull()
    .references(() => items.id, {
      onDelete: "cascade", // 👈 이 옵션을 추가!
    }),

  rentalDate: integer("rental_date")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  peopleCount: integer("people_count").default(1).notNull(),
});
