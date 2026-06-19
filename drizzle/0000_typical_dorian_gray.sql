CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`node_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`spawned_node_id` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `topic_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`root_topic` text NOT NULL,
	`user_id` text DEFAULT 'anonymous' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topic_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`parent_id` text,
	`depth` integer DEFAULT 0 NOT NULL,
	`embedding` text,
	`status` text DEFAULT 'untouched' NOT NULL,
	`source` text DEFAULT 'ai-init' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
