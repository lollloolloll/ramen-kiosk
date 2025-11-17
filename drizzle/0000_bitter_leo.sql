CREATE TABLE IF NOT EXISTS `general_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone_number` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text,
	`school` text,
	`personal_info_consent` integer,
	`consent_file_path` text
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `general_users_phone_number_unique`
ON `general_users` (`phone_number`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`image_url` text,
	`is_hidden` integer DEFAULT false NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_time_limited` integer DEFAULT false NOT NULL,
	`rental_time_minutes` integer,
	`max_rentals_per_user` integer,
	`enable_participant_tracking` integer DEFAULT false NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `rental_record_people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rental_record_id` integer NOT NULL,
	`name` text NOT NULL,
	`gender` text NOT NULL,
	FOREIGN KEY (`rental_record_id`)
        REFERENCES `rental_records`(`id`)
        ON UPDATE no action
        ON DELETE cascade
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `rental_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`user_name` text,
	`user_phone` text,
	`items_id` integer,
	`item_name` text,
	`item_category` text,
	`rental_date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`male_count` integer DEFAULT 0 NOT NULL,
	`female_count` integer DEFAULT 0 NOT NULL,
	`return_due_date` integer,
	`is_returned` integer DEFAULT false NOT NULL,
	`return_date` integer,
	`is_manual_return` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`)
        REFERENCES `general_users`(`id`)
        ON UPDATE no action
        ON DELETE set null,
	FOREIGN KEY (`items_id`)
        REFERENCES `items`(`id`)
        ON UPDATE no action
        ON DELETE set null
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`hashed_password` text NOT NULL,
	`role` text DEFAULT 'USER' NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `users_username_unique`
ON `users` (`username`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `waiting_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`request_date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`male_count` integer DEFAULT 0 NOT NULL,
	`female_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`)
        REFERENCES `items`(`id`)
        ON UPDATE no action
        ON DELETE cascade,
	FOREIGN KEY (`user_id`)
        REFERENCES `general_users`(`id`)
        ON UPDATE no action
        ON DELETE cascade
);
