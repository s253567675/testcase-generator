import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 支持账号密码登录
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 50 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("userStatus", ["active", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 需求文档表 - 存储上传的需求文档信息
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 20 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  parsedContent: text("parsedContent"),
  status: mysqlEnum("status", ["uploaded", "parsing", "parsed", "error"]).default("uploaded").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * 测试用例表 - 存储生成的测试用例
 */
export const testCases = mysqlTable("testCases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId").notNull(),
  caseNumber: varchar("caseNumber", { length: 50 }).notNull(),
  module: varchar("module", { length: 255 }),
  scenario: text("scenario").notNull(),
  precondition: text("precondition"),
  steps: json("steps").$type<string[]>(),
  expectedResult: text("expectedResult").notNull(),
  priority: mysqlEnum("priority", ["P0", "P1", "P2", "P3"]).default("P2").notNull(),
  caseType: mysqlEnum("caseType", ["functional", "boundary", "exception", "performance"]).default("functional").notNull(),
  generationMode: mysqlEnum("generationMode", ["ai", "template", "import"]).notNull(),
  executionStatus: mysqlEnum("executionStatus", ["pending", "passed", "failed"]).default("pending").notNull(),
  executionResult: text("executionResult"),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TestCase = typeof testCases.$inferSelect;
export type InsertTestCase = typeof testCases.$inferInsert;

/**
 * 生成历史记录表
 */
export const generationHistory = mysqlTable("generationHistory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId").notNull(),
  mode: mysqlEnum("mode", ["ai", "template"]).notNull(),
  caseCount: int("caseCount").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  generatorName: varchar("generatorName", { length: 100 }),
  modelName: varchar("modelName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GenerationHistory = typeof generationHistory.$inferSelect;
export type InsertGenerationHistory = typeof generationHistory.$inferInsert;

/**
 * 测试用例模板表
 */
export const testCaseTemplates = mysqlTable("testCaseTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  moduleType: varchar("moduleType", { length: 100 }),
  templateContent: json("templateContent").$type<TemplateContent[]>(),
  isSystem: int("isSystem").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export interface TemplateContent {
  scenario: string;
  precondition: string;
  steps: string[];
  expectedResult: string;
  priority: "P0" | "P1" | "P2" | "P3";
  caseType: "functional" | "boundary" | "exception" | "performance";
}

export type TestCaseTemplate = typeof testCaseTemplates.$inferSelect;
export type InsertTestCaseTemplate = typeof testCaseTemplates.$inferInsert;

/**
 * AI模型配置表 - 存储自定义AI模型配置
 */
export const aiModels = mysqlTable("aiModels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  modelId: varchar("modelId", { length: 100 }).notNull(),
  apiUrl: text("apiUrl").notNull(),
  apiKey: text("apiKey").notNull(),
  isDefault: int("isDefault").default(0).notNull(),
  isSystem: int("isSystem").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AIModel = typeof aiModels.$inferSelect;
export type InsertAIModel = typeof aiModels.$inferInsert;
