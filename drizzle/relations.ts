import { relations } from "drizzle-orm/relations";
import {
  items,
  rentalRecords,
  generalUsers,
  itemAutoHideSchedules,
} from "./schema";

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
  autoHideSchedules: many(itemAutoHideSchedules),
}));

export const itemAutoHideSchedulesRelations = relations(
  itemAutoHideSchedules,
  ({ one }) => ({
    item: one(items, {
      fields: [itemAutoHideSchedules.itemId],
      references: [items.id],
    }),
  })
);

export const generalUsersRelations = relations(generalUsers, ({ many }) => ({
  rentalRecords: many(rentalRecords),
}));
