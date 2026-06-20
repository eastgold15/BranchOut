CREATE TABLE `view_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`view_id` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`node_ids` text DEFAULT '[]' NOT NULL,
	`color` text DEFAULT '#60A5FA' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`view_id`) REFERENCES `views`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `topic_nodes` ADD `offset` text DEFAULT '[0,0,0]';