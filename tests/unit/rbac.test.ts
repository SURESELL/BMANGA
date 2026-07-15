import { describe, expect, it } from "vitest";
import { canAccess, requirePermission } from "@/lib/rbac";

describe("canAccess role hierarchy", () => {
  it("allows a role that meets the minimum requirement", () => {
    expect(canAccess("EMPLOYEE", "risks", "create")).toBe(true);
    expect(canAccess("SITE_MANAGER", "risks", "create")).toBe(true);
    expect(canAccess("SUPER_ADMIN", "risks", "create")).toBe(true);
  });

  it("denies a role below the minimum requirement", () => {
    expect(canAccess("VIEWER", "risks", "create")).toBe(false);
    expect(canAccess("EMPLOYEE", "risks", "delete")).toBe(false); // requires SITE_MANAGER
  });

  it("denies read-only roles from mutating DUERP", () => {
    expect(canAccess("VIEWER", "duerp", "create")).toBe(false);
    expect(canAccess("EMPLOYEE", "duerp", "create")).toBe(false); // requires SITE_MANAGER
    expect(canAccess("SITE_MANAGER", "duerp", "create")).toBe(true);
  });

  it("requires a higher role to validate (lock) a DUERP than to update it", () => {
    expect(canAccess("SITE_MANAGER", "duerp", "update")).toBe(true);
    expect(canAccess("SITE_MANAGER", "duerp", "validate")).toBe(false); // requires ORG_ADMIN
    expect(canAccess("ORG_ADMIN", "duerp", "validate")).toBe(true);
  });

  it("only ORG_ADMIN+ can create/update sites", () => {
    expect(canAccess("SITE_MANAGER", "sites", "create")).toBe(false);
    expect(canAccess("ORG_ADMIN", "sites", "create")).toBe(true);
  });

  it("returns false for an unknown module/action combination", () => {
    // @ts-expect-error - deliberately invalid module to prove no silent allow
    expect(canAccess("SUPER_ADMIN", "not_a_real_module", "create")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("returns null (continue) when the role is allowed", () => {
    expect(requirePermission("ORG_ADMIN", "sites", "create")).toBeNull();
  });

  it("returns a 403 response when the role is not allowed", async () => {
    const res = requirePermission("EMPLOYEE", "sites", "create");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBeTruthy();
  });

  it("returns a 403 response when no role is provided", () => {
    const res = requirePermission(undefined, "risks", "create");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
