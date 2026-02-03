CREATE TABLE `aiModels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`modelId` varchar(100) NOT NULL,
	`apiUrl` text NOT NULL,
	`apiKey` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`isSystem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiModels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `generationHistory` ADD `generatorName` varchar(100);--> statement-breakpoint
ALTER TABLE `generationHistory` ADD `modelName` varchar(100);