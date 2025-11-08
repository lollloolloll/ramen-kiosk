ALTER TABLE `items` ADD `is_deleted` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `waiting_queue` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `waiting_queue` DROP COLUMN `granted_date`;