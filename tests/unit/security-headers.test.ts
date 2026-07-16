import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security-headers";

describe("buildSecurityHeaders", () => {
  it("embeds the given nonce in script-src and nowhere allows unsafe inline scripts", () => {
    const headers = buildSecurityHeaders("test-nonce-123");
    expect(headers["Content-Security-Policy"]).toContain("script-src 'self' 'nonce-test-nonce-123' 'strict-dynamic'");
    expect(headers["Content-Security-Policy"]).not.toContain("script-src 'unsafe-inline'");
    expect(headers["Content-Security-Policy"]).not.toContain("unsafe-eval");
  });

  it("blocks framing (clickjacking) via both CSP and X-Frame-Options", () => {
    const headers = buildSecurityHeaders("n");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("sets a long-lived HSTS policy with subdomains and preload", () => {
    const headers = buildSecurityHeaders("n");
    expect(headers["Strict-Transport-Security"]).toMatch(/max-age=\d+/);
    expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
    expect(headers["Strict-Transport-Security"]).toContain("preload");
  });

  it("disables MIME sniffing", () => {
    expect(buildSecurityHeaders("n")["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("produces a different nonce value each time it is called with a different argument", () => {
    const a = buildSecurityHeaders("aaa")["Content-Security-Policy"];
    const b = buildSecurityHeaders("bbb")["Content-Security-Policy"];
    expect(a).not.toEqual(b);
  });
});
