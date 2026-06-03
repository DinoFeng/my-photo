CREATE TABLE `queue_config` (
	`name` text PRIMARY KEY NOT NULL,
	`consumer_count` integer DEFAULT 1,
	`enabled` integer DEFAULT true,
	`polling_interval` integer DEFAULT 1000,
	`max_concurrent_tasks` integer DEFAULT 10,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending',
	`consumer_id` text,
	`retry_count` integer DEFAULT 0,
	`max_retries` integer DEFAULT 3,
	`priority` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
