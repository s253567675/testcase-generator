import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import {
  createDocument,
  createGenerationHistory,
  createTemplate,
  createTestCases,
  createUserWithPassword,
  deleteDocument,
  deleteGenerationHistory,
  deleteTemplate,
  deleteTestCase,
  deleteTestCasesByDocumentId,
  deleteTestCasesByIds,
  deleteUser,
  ensureAdminUser,
  getAllUsers,
  getDistinctModulesWithIsolation,
  getDocumentById,
  getDocumentsWithIsolation,
  getHistoryById,
  getHistoryWithIsolation,
  getTemplateById,
  getTemplatesWithIsolation,
  getTestCaseById,
  getTestCasesByDocumentId,
  getTestCasesWithIsolation,
  searchTestCasesWithIsolation,
  TestCaseFilter,
  updateDocument,
  updateGenerationHistory,
  updateTemplate,
  updateTestCase,
  updateUser,
  updateUserPassword,
  verifyPassword,
} from "./db";
import { parseDocument, parseDocumentFromBase64 } from "./documentParser";
import { exportTestCasesToExcel } from "./excelExporter";
import { importTestCasesFromExcel, importTemplateFromExcel } from "./excelImporter";
import { storagePut, storageGet } from "./storage";
import {
  generateTestCasesWithAI,
  generateTestCasesWithCustomTemplate,
  generateTestCasesWithTemplate,
} from "./testCaseGenerator";

// 确保默认管理员存在
ensureAdminUser();

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    login: publicProcedure
      .input(
        z.object({
          username: z.string().min(1, "用户名不能为空"),
          password: z.string().min(1, "密码不能为空"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await verifyPassword(input.username, input.password);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
        }
        const token = await sdk.createSessionToken(user.openId, { name: user.name || '' });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user };
      }),
  }),

  user: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权访问" });
      }
      return getAllUsers();
    }),
    create: protectedProcedure
      .input(
        z.object({
          username: z.string().min(3, "用户名至少3个字符"),
          password: z.string().min(6, "密码至少6个字符"),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.enum(["user", "admin"]).default("user"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权操作" });
        }
        return createUserWithPassword(input);
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().optional(),
          role: z.enum(["user", "admin"]).optional(),
          status: z.enum(["active", "disabled"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权操作" });
        }
        const { id, ...data } = input;
        await updateUser(id, data);
        return { success: true };
      }),
    resetPassword: protectedProcedure
      .input(z.object({ id: z.number(), newPassword: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权操作" });
        }
        await updateUserPassword(input.id, input.newPassword);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权操作" });
      }
      await deleteUser(input.id);
      return { success: true };
    }),
  }),

  document: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      return getDocumentsWithIsolation(ctx.user.id, isAdmin);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const document = await getDocumentById(input.id);
      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "文档不存在" });
      }
      if (ctx.user.role !== "admin" && document.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此文档" });
      }
      return document;
    }),
    download: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const document = await getDocumentById(input.id);
      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "文档不存在" });
      }
      if (ctx.user.role !== "admin" && document.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此文档" });
      }
      // 如果有fileUrl直接返回，否则尝试生成签名URL
      if (document.fileUrl) {
        return { url: document.fileUrl, fileName: document.fileName };
      }
      if (document.fileKey) {
        const { url } = await storageGet(document.fileKey);
        return { url, fileName: document.fileName };
      }
      throw new TRPCError({ code: "NOT_FOUND", message: "文档文件不存在" });
    }),
    upload: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileType: z.string(),
          fileData: z.string(), // base64
        })
      )
      .mutation(async ({ ctx, input }) => {
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileKey = `documents/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, getMimeType(input.fileType));

        const documentId = await createDocument({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileType: input.fileType,
          fileUrl: url,
          fileKey: fileKey,
          status: "uploaded",
        });

        // 异步解析文档
        (async () => {
          try {
            await updateDocument(documentId, { status: "parsing" });
            const parsedContent = await parseDocumentFromBase64(input.fileData, input.fileType);
            await updateDocument(documentId, { parsedContent, status: "parsed" });
          } catch (error) {
            console.error("[Document] Parse error:", error);
            await updateDocument(documentId, { status: "error" });
          }
        })();

        return { id: documentId, success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const document = await getDocumentById(input.id);
      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "文档不存在" });
      }
      if (ctx.user.role !== "admin" && document.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权删除此文档" });
      }
      await deleteTestCasesByDocumentId(input.id);
      await deleteDocument(input.id);
      return { success: true };
    }),
  }),

  testCase: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      return getTestCasesWithIsolation(ctx.user.id, isAdmin);
    }),
    search: protectedProcedure
      .input(
        z.object({
          keyword: z.string().optional(),
          module: z.string().optional(),
          priority: z.string().optional(),
          caseType: z.string().optional(),
          executionStatus: z.string().optional(),
          generationMode: z.string().optional(),
          documentId: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin";
        return searchTestCasesWithIsolation(ctx.user.id, isAdmin, input as TestCaseFilter);
      }),
    getModules: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      return getDistinctModulesWithIsolation(ctx.user.id, isAdmin);
    }),
    getDocuments: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      return getDocumentsWithIsolation(ctx.user.id, isAdmin);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const testCase = await getTestCaseById(input.id);
      if (!testCase) {
        throw new TRPCError({ code: "NOT_FOUND", message: "测试用例不存在" });
      }
      if (ctx.user.role !== "admin" && testCase.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权访问" });
      }
      return testCase;
    }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          scenario: z.string().optional(),
          module: z.string().optional(),
          precondition: z.string().optional(),
          steps: z.array(z.string()).optional(),
          expectedResult: z.string().optional(),
          priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
          caseType: z.enum(["functional", "boundary", "exception", "performance"]).optional(),
          executionStatus: z.enum(["pending", "passed", "failed"]).optional(),
          executionResult: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const testCase = await getTestCaseById(input.id);
        if (!testCase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "测试用例不存在" });
        }
        if (ctx.user.role !== "admin" && testCase.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权修改" });
        }
        const { id, ...data } = input;
        if (data.executionStatus && data.executionStatus !== "pending") {
          (data as any).executedAt = new Date();
        }
        await updateTestCase(id, data);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const testCase = await getTestCaseById(input.id);
      if (!testCase) {
        throw new TRPCError({ code: "NOT_FOUND", message: "测试用例不存在" });
      }
      if (ctx.user.role !== "admin" && testCase.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权删除" });
      }
      await deleteTestCase(input.id);
      return { success: true };
    }),
    batchDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        // 验证权限
        const allCases = await getTestCasesWithIsolation(ctx.user.id, ctx.user.role === "admin");
        const allowedIds = allCases.map((tc) => tc.id);
        const validIds = input.ids.filter((id) => allowedIds.includes(id));
        
        if (validIds.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "没有可删除的测试用例" });
        }
        
        await deleteTestCasesByIds(validIds);
        return { success: true, count: validIds.length };
      }),
    import: protectedProcedure
      .input(
        z.object({
          fileData: z.string(), // base64
          documentId: z.number().optional(), // 可选关联到某个需求文档
        })
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const importedCases = await importTestCasesFromExcel(buffer);

        const testCasesToInsert = importedCases.map((tc, index) => ({
          userId: ctx.user.id,
          documentId: input.documentId || 0,
          caseNumber: tc.caseNumber || `IMP-${Date.now()}-${index + 1}`,
          module: tc.module || null,
          scenario: tc.scenario,
          precondition: tc.precondition || null,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          priority: tc.priority,
          caseType: tc.caseType,
          generationMode: "import" as const,
        }));

        await createTestCases(testCasesToInsert);
        return { success: true, count: testCasesToInsert.length };
      }),
    generateWithTemplate: protectedProcedure
      .input(z.object({ documentId: z.number(), templateId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const document = await getDocumentById(input.documentId);
        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND", message: "文档不存在" });
        }
        if (ctx.user.role !== "admin" && document.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此文档" });
        }
        if (document.status !== "parsed" || !document.parsedContent) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "文档尚未解析完成" });
        }

        const historyId = await createGenerationHistory({
          userId: ctx.user.id,
          documentId: input.documentId,
          mode: "template",
          status: "pending",
        });

        try {
          let generatedCases;
          if (input.templateId) {
            const template = await getTemplateById(input.templateId);
            if (!template || !template.templateContent) {
              throw new TRPCError({ code: "NOT_FOUND", message: "模板不存在" });
            }
            generatedCases = generateTestCasesWithCustomTemplate(
              document.parsedContent,
              document.fileName,
              template.templateContent
            );
          } else {
            generatedCases = generateTestCasesWithTemplate(document.parsedContent, document.fileName);
          }

          const testCasesToInsert = generatedCases.map((tc) => ({
            userId: ctx.user.id,
            documentId: input.documentId,
            caseNumber: tc.caseNumber,
            module: tc.module,
            scenario: tc.scenario,
            precondition: tc.precondition,
            steps: tc.steps,
            expectedResult: tc.expectedResult,
            priority: tc.priority,
            caseType: tc.caseType,
            generationMode: "template" as const,
          }));

          await createTestCases(testCasesToInsert);
          await updateGenerationHistory(historyId, { status: "completed", caseCount: generatedCases.length });

          return { success: true, count: generatedCases.length };
        } catch (error) {
          await updateGenerationHistory(historyId, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "未知错误",
          });
          throw error;
        }
      }),
    generateWithAI: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const document = await getDocumentById(input.documentId);
        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND", message: "文档不存在" });
        }
        if (ctx.user.role !== "admin" && document.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权访问此文档" });
        }
        if (document.status !== "parsed" || !document.parsedContent) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "文档尚未解析完成" });
        }

        const historyId = await createGenerationHistory({
          userId: ctx.user.id,
          documentId: input.documentId,
          mode: "ai",
          status: "pending",
        });

        try {
          const generatedCases = await generateTestCasesWithAI(document.parsedContent, document.fileName);

          const testCasesToInsert = generatedCases.map((tc) => ({
            userId: ctx.user.id,
            documentId: input.documentId,
            caseNumber: tc.caseNumber,
            module: tc.module,
            scenario: tc.scenario,
            precondition: tc.precondition,
            steps: tc.steps,
            expectedResult: tc.expectedResult,
            priority: tc.priority,
            caseType: tc.caseType,
            generationMode: "ai" as const,
          }));

          await createTestCases(testCasesToInsert);
          await updateGenerationHistory(historyId, { status: "completed", caseCount: generatedCases.length });

          return { success: true, count: generatedCases.length };
        } catch (error) {
          await updateGenerationHistory(historyId, {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "未知错误",
          });
          throw error;
        }
      }),
    export: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).optional(), documentId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        let testCases;
        if (input.ids && input.ids.length > 0) {
          const allCases = await getTestCasesWithIsolation(ctx.user.id, ctx.user.role === "admin");
          testCases = allCases.filter((tc) => input.ids!.includes(tc.id));
        } else if (input.documentId) {
          testCases = await getTestCasesByDocumentId(input.documentId);
          if (ctx.user.role !== "admin") {
            testCases = testCases.filter((tc) => tc.userId === ctx.user.id);
          }
        } else {
          testCases = await getTestCasesWithIsolation(ctx.user.id, ctx.user.role === "admin");
        }

        if (testCases.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "没有可导出的测试用例" });
        }

        const buffer = await exportTestCasesToExcel(testCases);
        const fileKey = `exports/${ctx.user.id}/${Date.now()}-test-cases.xlsx`;
        const { url } = await storagePut(fileKey, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        return { url, count: testCases.length };
      }),
  }),

  template: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      return getTemplatesWithIsolation(ctx.user.id, isAdmin);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const template = await getTemplateById(input.id);
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "模板不存在" });
      }
      return template;
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          moduleType: z.string().optional(),
          templateContent: z.array(
            z.object({
              scenario: z.string(),
              precondition: z.string(),
              steps: z.array(z.string()),
              expectedResult: z.string(),
              priority: z.enum(["P0", "P1", "P2", "P3"]),
              caseType: z.enum(["functional", "boundary", "exception", "performance"]),
            })
          ),
          isSystem: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          moduleType: input.moduleType,
          templateContent: input.templateContent,
          isSystem: ctx.user.role === "admin" ? input.isSystem || 0 : 0,
        });
        return { id, success: true };
      }),
    import: protectedProcedure
      .input(z.object({ fileData: z.string() })) // base64
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const importedTemplate = await importTemplateFromExcel(buffer);

        const id = await createTemplate({
          userId: ctx.user.id,
          name: importedTemplate.name,
          description: importedTemplate.description,
          moduleType: importedTemplate.moduleType,
          templateContent: importedTemplate.cases,
          isSystem: 0,
        });

        return { id, success: true, name: importedTemplate.name, caseCount: importedTemplate.cases.length };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          moduleType: z.string().optional(),
          templateContent: z
            .array(
              z.object({
                scenario: z.string(),
                precondition: z.string(),
                steps: z.array(z.string()),
                expectedResult: z.string(),
                priority: z.enum(["P0", "P1", "P2", "P3"]),
                caseType: z.enum(["functional", "boundary", "exception", "performance"]),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const template = await getTemplateById(input.id);
        if (!template) {
          throw new TRPCError({ code: "NOT_FOUND", message: "模板不存在" });
        }
        if (ctx.user.role !== "admin" && template.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "无权修改" });
        }
        const { id, ...data } = input;
        await updateTemplate(id, data);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const template = await getTemplateById(input.id);
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "模板不存在" });
      }
      if (ctx.user.role !== "admin" && template.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "无权删除" });
      }
      await deleteTemplate(input.id);
      return { success: true };
    }),
  }),

  history: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      return getHistoryWithIsolation(ctx.user.id, isAdmin);
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理员可以删除历史记录" });
      }
      const history = await getHistoryById(input.id);
      if (!history) {
        throw new TRPCError({ code: "NOT_FOUND", message: "历史记录不存在" });
      }
      await deleteGenerationHistory(input.id);
      return { success: true };
    }),
  }),

  stats: router({
    executionStats: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      const testCases = await getTestCasesWithIsolation(ctx.user.id, isAdmin);
      const total = testCases.length;
      const pending = testCases.filter((tc) => tc.executionStatus === "pending").length;
      const passed = testCases.filter((tc) => tc.executionStatus === "passed").length;
      const failed = testCases.filter((tc) => tc.executionStatus === "failed").length;
      return { total, pending, passed, failed };
    }),
  }),
});

function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pdf: "application/pdf",
    md: "text/markdown",
    txt: "text/plain",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[fileType.toLowerCase()] || "application/octet-stream";
}

export type AppRouter = typeof appRouter;
