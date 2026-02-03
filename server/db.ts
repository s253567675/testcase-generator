import bcrypt from "bcryptjs";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  documents,
  generationHistory,
  InsertDocument,
  InsertGenerationHistory,
  InsertTestCase,
  InsertTestCaseTemplate,
  InsertUser,
  testCases,
  testCaseTemplates,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== 用户相关 ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(data: {
  username: string;
  password: string;
  name?: string;
  email?: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserByUsername(data.username);
  if (existing) {
    throw new Error("用户名已存在");
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  await db.insert(users).values({
    openId,
    username: data.username,
    passwordHash,
    name: data.name || data.username,
    email: data.email,
    role: data.role || "user",
    loginMethod: "password",
    status: "active",
  } as any);
  return getUserByUsername(data.username);
}

export async function verifyPassword(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user || !(user as any).passwordHash) {
    return null;
  }
  if ((user as any).status === "disabled") {
    return null;
  }
  const isValid = await bcrypt.compare(password, (user as any).passwordHash);
  if (!isValid) {
    return null;
  }
  const db = await getDb();
  if (db) {
    await db.update(users).set({ lastSignedIn: new Date() } as any).where(eq(users.id, user.id));
  }
  return user;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUser(
  id: number,
  data: { name?: string; email?: string; role?: "user" | "admin"; status?: "active" | "disabled" }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data as any).where(eq(users.id, id));
}

export async function updateUserPassword(id: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash } as any).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

// ==================== 文档相关 ====================

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(data);
  return result[0].insertId;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDocumentsWithIsolation(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (isAdmin) {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documents).where(eq(documents.id, id));
}

// ==================== 测试用例相关 ====================

export async function createTestCase(data: InsertTestCase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(testCases).values(data);
  return result[0].insertId;
}

export async function createTestCases(dataList: InsertTestCase[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (dataList.length === 0) return [];
  await db.insert(testCases).values(dataList);
  return dataList.length;
}

export async function getTestCaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testCases).where(eq(testCases.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTestCasesWithIsolation(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (isAdmin) {
    return db.select().from(testCases).orderBy(desc(testCases.createdAt));
  }
  return db.select().from(testCases).where(eq(testCases.userId, userId)).orderBy(desc(testCases.createdAt));
}

export async function getTestCasesByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(testCases).where(eq(testCases.documentId, documentId)).orderBy(desc(testCases.createdAt));
}

export interface TestCaseFilter {
  keyword?: string;
  module?: string;
  priority?: string;
  caseType?: string;
  executionStatus?: string;
  generationMode?: string;
  documentId?: number;
}

export async function searchTestCasesWithIsolation(userId: number, isAdmin: boolean, filter: TestCaseFilter) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (!isAdmin) {
    conditions.push(eq(testCases.userId, userId));
  }
  if (filter.keyword) {
    conditions.push(
      or(
        like(testCases.scenario, `%${filter.keyword}%`),
        like(testCases.module, `%${filter.keyword}%`),
        like(testCases.caseNumber, `%${filter.keyword}%`)
      )
    );
  }
  if (filter.module) {
    conditions.push(eq(testCases.module, filter.module));
  }
  if (filter.priority) {
    conditions.push(eq(testCases.priority, filter.priority as any));
  }
  if (filter.caseType) {
    conditions.push(eq(testCases.caseType, filter.caseType as any));
  }
  if (filter.executionStatus) {
    conditions.push(eq(testCases.executionStatus, filter.executionStatus as any));
  }
  if (filter.generationMode) {
    conditions.push(eq(testCases.generationMode, filter.generationMode as any));
  }
  if (filter.documentId) {
    conditions.push(eq(testCases.documentId, filter.documentId));
  }
  if (conditions.length === 0) {
    return db.select().from(testCases).orderBy(desc(testCases.createdAt));
  }
  return db
    .select()
    .from(testCases)
    .where(and(...conditions))
    .orderBy(desc(testCases.createdAt));
}

export async function getDistinctModulesWithIsolation(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (isAdmin) {
    const result = await db
      .selectDistinct({ module: testCases.module })
      .from(testCases)
      .where(sql`${testCases.module} IS NOT NULL AND ${testCases.module} != ''`);
    return result.map((r) => r.module).filter(Boolean) as string[];
  }
  const result = await db
    .selectDistinct({ module: testCases.module })
    .from(testCases)
    .where(and(eq(testCases.userId, userId), sql`${testCases.module} IS NOT NULL AND ${testCases.module} != ''`));
  return result.map((r) => r.module).filter(Boolean) as string[];
}

export async function updateTestCase(id: number, data: Partial<InsertTestCase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testCases).set(data).where(eq(testCases.id, id));
}

export async function deleteTestCase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testCases).where(eq(testCases.id, id));
}

export async function deleteTestCasesByDocumentId(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testCases).where(eq(testCases.documentId, documentId));
}

// ==================== 模板相关 ====================

export async function createTemplate(data: InsertTestCaseTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(testCaseTemplates).values(data);
  return result[0].insertId;
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testCaseTemplates).where(eq(testCaseTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTemplatesWithIsolation(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (isAdmin) {
    return db.select().from(testCaseTemplates).orderBy(desc(testCaseTemplates.createdAt));
  }
  return db
    .select()
    .from(testCaseTemplates)
    .where(or(eq(testCaseTemplates.userId, userId), eq(testCaseTemplates.isSystem, 1)))
    .orderBy(desc(testCaseTemplates.createdAt));
}

export async function updateTemplate(id: number, data: Partial<InsertTestCaseTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testCaseTemplates).set(data).where(eq(testCaseTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testCaseTemplates).where(eq(testCaseTemplates.id, id));
}

// ==================== 生成历史相关 ====================

export async function createGenerationHistory(data: InsertGenerationHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(generationHistory).values(data);
  return result[0].insertId;
}

export async function getHistoryWithIsolation(userId: number, isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];
  if (isAdmin) {
    return db.select().from(generationHistory).orderBy(desc(generationHistory.createdAt));
  }
  return db
    .select()
    .from(generationHistory)
    .where(eq(generationHistory.userId, userId))
    .orderBy(desc(generationHistory.createdAt));
}

export async function updateGenerationHistory(id: number, data: Partial<InsertGenerationHistory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generationHistory).set(data).where(eq(generationHistory.id, id));
}

// ==================== 初始化默认管理员 ====================

export async function ensureAdminUser() {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserByUsername("admin");
  if (!existing) {
    try {
      await createUserWithPassword({
        username: "admin",
        password: "admin123",
        name: "管理员",
        role: "admin",
      });
      console.log("[Database] Default admin user created: admin/admin123");
    } catch (error) {
      console.error("[Database] Failed to create admin user:", error);
    }
  }
}
