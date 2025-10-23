import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").notNull().primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  role: text("role").notNull().default("USER"), // 'USER' or 'ADMIN'
});

export const generalUsers = sqliteTable("general_users", {
  id: integer("id").notNull().primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  gender: text("gender"), // e.g., 'MALE', 'FEMALE', 'OTHER'
  age: integer("age"),
  hashedPin: text("hashed_pin").notNull(), // Store hashed 4-digit PIN
});

export const ramens = sqliteTable("ramens", {
  id: integer("id").notNull().primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
});

export const rentalRecords = sqliteTable("rental_records", {
  id: integer("id").notNull().primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => generalUsers.id),
  ramenId: integer("ramen_id")
    .notNull()
    .references(() => ramens.id),
  rentalDate: integer("rental_date", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
