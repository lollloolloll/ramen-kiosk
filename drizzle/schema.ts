import { sqliteTable, AnySQLiteColumn, integer, text, uniqueIndex, foreignKey } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const ramens = sqliteTable("ramens", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	manufacturer: text().notNull(),
	stock: integer().default(0).notNull(),
	imageUrl: text("image_url"),
});

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	username: text().notNull(),
	hashedPassword: text("hashed_password").notNull(),
	role: text().default("USER").notNull(),
},
(table) => [
	uniqueIndex("users_username_unique").on(table.username),
]);

export const generalUsers = sqliteTable("general_users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	phoneNumber: text("phone_number").notNull(),
	gender: text(),
	age: integer(),
	hashedPin: text("hashed_pin").notNull(),
},
(table) => [
	uniqueIndex("general_users_phone_number_unique").on(table.phoneNumber),
]);

export const rentalRecords = sqliteTable("rental_records", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").notNull().references(() => generalUsers.id),
	ramenId: integer("ramen_id").notNull().references(() => ramens.id),
	rentalDate: integer("rental_date").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

