CREATE TABLE `ramens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`image_url` text
);
--> statement-breakpoint
CREATE TABLE `rental_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ramen_id` text NOT NULL,
	`rental_date` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ramen_id`) REFERENCES `ramens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`hashed_password` text NOT NULL,
	`role` text DEFAULT 'USER' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);