import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").notNull().primaryKey(),
  username: text("username").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  role: text("role").notNull().default("USER"), // 'USER' or 'ADMIN'
});

export const ramens = sqliteTable("ramens", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
});

export const rentalRecords = sqliteTable("rental_records", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  ramenId: text("ramen_id")
    .notNull()
    .references(() => ramens.id),
  rentalDate: integer("rental_date", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
