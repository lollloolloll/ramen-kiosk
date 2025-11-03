CREATE TABLE `general_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone_number` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text,
	`school` text,
	`personal_info_consent` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `general_users_phone_number_unique` ON `general_users` (`phone_number`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`image_url` text
);
--> statement-breakpoint
CREATE TABLE `rental_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`items_id` integer NOT NULL,
	`rental_date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`people_count` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `general_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`items_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`hashed_password` text NOT NULL,
	`role` text DEFAULT 'USER' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);