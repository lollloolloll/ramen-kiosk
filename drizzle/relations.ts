import { relations } from "drizzle-orm/relations";
import { ramens, rentalRecords, generalUsers } from "./schema";

export const rentalRecordsRelations = relations(rentalRecords, ({one}) => ({
	ramen: one(ramens, {
		fields: [rentalRecords.ramenId],
		references: [ramens.id]
	}),
	generalUser: one(generalUsers, {
		fields: [rentalRecords.userId],
		references: [generalUsers.id]
	}),
}));

export const ramensRelations = relations(ramens, ({many}) => ({
	rentalRecords: many(rentalRecords),
}));

export const generalUsersRelations = relations(generalUsers, ({many}) => ({
	rentalRecords: many(rentalRecords),
}));