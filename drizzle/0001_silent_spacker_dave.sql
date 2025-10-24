PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rental_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`ramen_id` integer NOT NULL,
	`rental_date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `general_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ramen_id`) REFERENCES `ramens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_rental_records`("id", "user_id", "ramen_id", "rental_date") SELECT "id", "user_id", "ramen_id", "rental_date" FROM `rental_records`;--> statement-breakpoint
DROP TABLE `rental_records`;--> statement-breakpoint
ALTER TABLE `__new_rental_records` RENAME TO `rental_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_general_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone_number` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text,
	`school` text,
	`personal_info_consent` integer
);
--> statement-breakpoint
INSERT INTO `__new_general_users`("id", "name", "phone_number", "gender", "birth_date", "school", "personal_info_consent") SELECT "id", "name", "phone_number", "gender", "birth_date", "school", "personal_info_consent" FROM `general_users`;--> statement-breakpoint
DROP TABLE `general_users`;--> statement-breakpoint
ALTER TABLE `__new_general_users` RENAME TO `general_users`;--> statement-breakpoint
CREATE UNIQUE INDEX `general_users_phone_number_unique` ON `general_users` (`phone_number`);