-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `ramens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`image_url` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`hashed_password` text NOT NULL,
	`role` text DEFAULT 'USER' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `general_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone_number` text NOT NULL,
	`gender` text,
	`age` integer,
	`hashed_pin` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `general_users_phone_number_unique` ON `general_users` (`phone_number`);--> statement-breakpoint
CREATE TABLE `rental_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`ramen_id` integer NOT NULL,
	`rental_date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`ramen_id`) REFERENCES `ramens`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `general_users`(`id`) ON UPDATE no action ON DELETE no action
);

*/