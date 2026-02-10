import { describe, it, expect, beforeEach } from "vitest";
import { AccountManager } from "./accounts";
import type { OAuthAuthDetails } from "./types";

describe("Model-specific Gemini quota", () => {
  let manager: AccountManager;
  const auth: OAuthAuthDetails = {
    type: "oauth",
    refresh: "test-refresh",
    access: "test-access",
    expires: Date.now() + 3600000,
  };

  beforeEach(() => {
    manager = new AccountManager(auth);
  });

  it("blocks only the specific Gemini model when markRateLimited is called with a model", () => {
    const account = manager.getCurrentAccountForFamily("gemini")!;
    const modelPro = "gemini-1.5-pro";
    const modelFlash = "gemini-1.5-flash";

    // Mark gemini-1.5-pro as rate limited on antigravity
    manager.markRateLimited(account, 60000, "gemini", "antigravity", modelPro);

    // gemini-1.5-pro should be rate limited for antigravity
    expect(manager.isRateLimitedForHeaderStyle(account, "gemini", "antigravity", modelPro)).toBe(true);

    // gemini-1.5-flash should NOT be rate limited for antigravity
    expect(manager.isRateLimitedForHeaderStyle(account, "gemini", "antigravity", modelFlash)).toBe(false);

    // General gemini (no model) should NOT be rate limited
    expect(manager.isRateLimitedForHeaderStyle(account, "gemini", "antigravity")).toBe(false);
  });

  it("falls back to gemini-cli only for the specific model", () => {
    const account = manager.getCurrentAccountForFamily("gemini")!;
    const modelPro = "gemini-1.5-pro";
    const modelFlash = "gemini-1.5-flash";

    // Mark gemini-1.5-pro as rate limited on antigravity
    manager.markRateLimited(account, 60000, "gemini", "antigravity", modelPro);

    // Available header style for Pro should be gemini-cli
    expect(manager.getAvailableHeaderStyle(account, "gemini", modelPro)).toBe("gemini-cli");

    // Available header style for Flash should still be antigravity
    expect(manager.getAvailableHeaderStyle(account, "gemini", modelFlash)).toBe("antigravity");
  });

  it("returns null when all header styles are exhausted for the specific model on a single account", () => {
    const manager2 = new AccountManager(auth);
    
    const account = manager2.getCurrentAccountForFamily("gemini")!;
    const modelPro = "gemini-1.5-pro";
    const modelFlash = "gemini-1.5-flash";

    manager2.markRateLimited(account, 60000, "gemini", "antigravity", modelPro);
    manager2.markRateLimited(account, 60000, "gemini", "gemini-cli", modelPro);

    // No other account available, so returns null for the rate-limited model
    expect(manager2.getCurrentOrNextForFamily("gemini", modelPro)).toBeNull();
    
    // Flash should still return the same account since it's not rate-limited
    const flashAccount = manager2.getCurrentOrNextForFamily("gemini", modelFlash);
    expect(flashAccount).toBe(account);
  });

  it("base family rate limit blocks all models in that family", () => {
    const account = manager.getCurrentAccountForFamily("gemini")!;
    const modelPro = "gemini-1.5-pro";

    // Mark base gemini-antigravity as rate limited
    manager.markRateLimited(account, 60000, "gemini", "antigravity");

    // All Gemini models should now be blocked for antigravity on this account
    expect(manager.isRateLimitedForHeaderStyle(account, "gemini", "antigravity", modelPro)).toBe(true);
    expect(manager.isRateLimitedForHeaderStyle(account, "gemini", "antigravity", "gemini-1.5-flash")).toBe(true);
  });
});
