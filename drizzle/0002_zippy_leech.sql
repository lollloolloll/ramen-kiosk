CREATE TABLE IF NOT EXISTS `waiting_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`request_date` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`granted_date` integer,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `general_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `__new_rental_records` (
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
	`had_waiting_queue` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `general_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`items_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- 기존 데이터를 새 테이블로 복사 (기존 컬럼만 사용, 새 컬럼은 기본값)
INSERT INTO `__new_rental_records`(
	"id", 
	"user_id", 
	"items_id", 
	"rental_date",
	"male_count",
	"female_count",
	"is_returned"
) 
SELECT 
	"id", 
	"user_id", 
	"items_id", 
	"rental_date",
	0, -- male_count: 기존 데이터는 성별 구분 없음
	"people_count", -- female_count: 임시로 전체 인원을 여기에
	0 -- is_returned: 기존 데이터는 모두 미반납으로 처리
FROM `rental_records`;
--> statement-breakpoint
-- user_name, user_phone을 general_users에서 조인하여 업데이트
UPDATE `__new_rental_records`
SET 
	"user_name" = (SELECT name FROM general_users WHERE id = `__new_rental_records`.user_id),
	"user_phone" = (SELECT phone_number FROM general_users WHERE id = `__new_rental_records`.user_id)
WHERE user_id IS NOT NULL;
--> statement-breakpoint
-- item_name, item_category를 items에서 조인하여 업데이트
UPDATE `__new_rental_records`
SET 
	"item_name" = (SELECT name FROM items WHERE id = `__new_rental_records`.items_id),
	"item_category" = (SELECT category FROM items WHERE id = `__new_rental_records`.items_id)
WHERE items_id IS NOT NULL;
--> statement-breakpoint
DROP TABLE `rental_records`;--> statement-breakpoint
ALTER TABLE `__new_rental_records` RENAME TO `rental_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `general_users` ADD `consent_file_path` text;--> statement-breakpoint
ALTER TABLE `items` ADD `is_time_limited` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `items` ADD `rental_time_minutes` integer;--> statement-breakpoint
ALTER TABLE `items` ADD `max_rentals_per_user` integer;