ALTER TABLE `ramens` RENAME TO `items`;--> statement-breakpoint
ALTER TABLE `items` RENAME COLUMN "manufacturer" TO "category";--> statement-breakpoint
ALTER TABLE `items` DROP COLUMN `stock`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rental_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`items_id` integer NOT NULL,
	`rental_date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `general_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`items_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_rental_records`("id", "user_id", "items_id", "rental_date") 
SELECT "id", "user_id", "ramen_id" AS "items_id", "rental_date" FROM `rental_records`;--> statement-breakpoint
DROP TABLE `rental_records`;--> statement-breakpoint
ALTER TABLE `__new_rental_records` RENAME TO `rental_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;