CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(20) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`parsedContent` text,
	`status` enum('uploaded','parsing','parsed','error') NOT NULL DEFAULT 'uploaded',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`mode` enum('ai','template') NOT NULL,
	`caseCount` int NOT NULL DEFAULT 0,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testCaseTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`moduleType` varchar(100),
	`templateContent` json,
	`isSystem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testCaseTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`documentId` int NOT NULL,
	`caseNumber` varchar(50) NOT NULL,
	`module` varchar(255),
	`scenario` text NOT NULL,
	`precondition` text,
	`steps` json,
	`expectedResult` text NOT NULL,
	`priority` enum('P0','P1','P2','P3') NOT NULL DEFAULT 'P2',
	`caseType` enum('functional','boundary','exception','performance') NOT NULL DEFAULT 'functional',
	`generationMode` enum('ai','template','import') NOT NULL,
	`executionStatus` enum('pending','passed','failed') NOT NULL DEFAULT 'pending',
	`executionResult` text,
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `userStatus` enum('active','disabled') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_username_unique` UNIQUE(`username`);