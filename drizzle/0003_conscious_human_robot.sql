ALTER TABLE `chat_messages` RENAME TO `atom_messages`;--> statement-breakpoint
DROP TABLE `topic_nodes`;--> statement-breakpoint
DROP TABLE `view_groups`;--> statement-breakpoint
DROP TABLE `views`;--> statement-breakpoint
ALTER TABLE `atom_messages` ADD `session_id` text NOT NULL REFERENCES sessions(id);--> statement-breakpoint
ALTER TABLE `atom_messages` ADD `title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `atom_messages` ADD `embedding` text;--> statement-breakpoint
ALTER TABLE `atom_messages` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `atom_messages` DROP COLUMN `node_id`;--> statement-breakpoint
ALTER TABLE `atom_messages` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `atom_messages` DROP COLUMN `spawned_node_id`;