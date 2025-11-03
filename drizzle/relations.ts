import { relations } from "drizzle-orm/relations";
import { items, rentalRecords, generalUsers } from "./schema";

export const rentalRecordsRelations = relations(rentalRecords, ({ one }) => ({
  item: one(items, {
    fields: [rentalRecords.itemsId],
    references: [items.id],
  }),
  generalUser: one(generalUsers, {
    fields: [rentalRecords.userId],
    references: [generalUsers.id],
  }),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  rentalRecords: many(rentalRecords),
}));

export const generalUsersRelations = relations(generalUsers, ({ many }) => ({
  rentalRecords: many(rentalRecords),
}));
