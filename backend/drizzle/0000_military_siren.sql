CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`source_directory_id` text NOT NULL,
	`filename` text NOT NULL,
	`filepath` text NOT NULL,
	`file_size` integer NOT NULL,
	`file_type` text NOT NULL,
	`hash` text,
	`width` integer,
	`height` integer,
	`duration` real,
	`make` text,
	`model` text,
	`date_taken` text,
	`latitude` real,
	`longitude` real,
	`metadata` text,
	`thumbnail_path` text,
	`status` text DEFAULT 'active',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scan_checkpoint` (
	`id` text PRIMARY KEY NOT NULL,
	`source_directory_id` text NOT NULL,
	`last_scanned_file` text,
	`status` text DEFAULT 'idle',
	`progress` real DEFAULT 0,
	`total_files` integer DEFAULT 0,
	`scanned_files` integer DEFAULT 0,
	`error_count` integer DEFAULT 0,
	`started_at` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scan_checkpoint_source_directory_id_unique` ON `scan_checkpoint` (`source_directory_id`);--> statement-breakpoint
CREATE TABLE `setting` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setting_key_unique` ON `setting` (`key`);--> statement-breakpoint
CREATE TABLE `source_directory` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true,
	`last_scanned` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_directory_path_unique` ON `source_directory` (`path`);