import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    passwordHash: "hashed",
    loginMethod: "password",
    role: role,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns user info when authenticated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
    expect(result?.role).toBe("user");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});

describe("stats.executionStats", () => {
  it("returns execution statistics for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stats.executionStats();

    expect(result).toBeDefined();
    expect(typeof result.total).toBe("number");
    expect(typeof result.pending).toBe("number");
    expect(typeof result.passed).toBe("number");
    expect(typeof result.failed).toBe("number");
  });
});

describe("testCase.getModules", () => {
  it("returns modules list for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.testCase.getModules();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("template.list", () => {
  it("returns templates for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.template.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("history.list", () => {
  it("returns generation history for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.history.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("document.list", () => {
  it("returns documents for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.document.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("user.list (admin only)", () => {
  it("returns users list for admin", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("throws forbidden error for non-admin", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.user.list()).rejects.toThrow();
  });
});
