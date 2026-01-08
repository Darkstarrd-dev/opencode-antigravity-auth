import { beforeEach, describe, expect, it, vi } from "vitest";

import { AccountManager, type ModelFamily, type HeaderStyle } from "./accounts";
import type { AccountStorageV3 } from "./storage";
import type { OAuthAuthDetails } from "./types";

describe("AccountManager", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal("process", { ...process, pid: 0 });
  });

  it("treats on-disk storage as source of truth, even when empty", () => {
    const fallback: OAuthAuthDetails = {
      type: "oauth",
      refresh: "r1|p1",
      access: "access",
      expires: 123,
    };

    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [],
      activeIndex: 0,
    };

    const manager = new AccountManager(fallback, stored);
    expect(manager.getAccountCount()).toBe(0);
  });

  it("returns current account when not rate-limited for family", () => {
    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const account = manager.getCurrentOrNextForFamily(family);

    expect(account).not.toBeNull();
    expect(account?.index).toBe(0);
  });

  it("switches to next account when current is rate-limited for family", () => {
    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const firstAccount = manager.getCurrentOrNextForFamily(family);
    manager.markRateLimited(firstAccount!, 60000, family);

    const secondAccount = manager.getCurrentOrNextForFamily(family);
    expect(secondAccount?.index).toBe(1);
  });

  it("returns null when all accounts are rate-limited for family", () => {
    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const accounts = manager.getAccounts();
    accounts.forEach((acc) => manager.markRateLimited(acc, 60000, family));

    const next = manager.getCurrentOrNextForFamily(family);
    expect(next).toBeNull();
  });

  it("un-rate-limits accounts after timeout expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";
    const account = manager.getCurrentOrNextForFamily(family);

    account!.rateLimitResetTimes[family] = Date.now() - 10000;

    const next = manager.getCurrentOrNextForFamily(family);
    expect(next?.parts.refreshToken).toBe("r1");
  });

  it("returns minimum wait time for family", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";
    const accounts = manager.getAccounts();

    manager.markRateLimited(accounts[0]!, 30000, family);
    manager.markRateLimited(accounts[1]!, 60000, family);

    expect(manager.getMinWaitTimeForFamily(family)).toBe(30000);
  });

  it("tracks rate limits per model family independently", () => {
    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);

    const account = manager.getCurrentOrNextForFamily("claude");
    expect(account?.index).toBe(0);

    manager.markRateLimited(account!, 60000, "claude");

    expect(manager.getMinWaitTimeForFamily("claude")).toBeGreaterThan(0);
    expect(manager.getMinWaitTimeForFamily("gemini")).toBe(0);

    const geminiOnAccount0 = manager.getNextForFamily("gemini");
    expect(geminiOnAccount0?.index).toBe(0);

    const claudeBlocked = manager.getNextForFamily("claude");
    expect(claudeBlocked).toBeNull();
  });

  it("getCurrentOrNextForFamily sticks to same account until rate-limited", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const first = manager.getCurrentOrNextForFamily(family);
    expect(first?.parts.refreshToken).toBe("r1");

    const second = manager.getCurrentOrNextForFamily(family);
    expect(second?.parts.refreshToken).toBe("r1");

    const third = manager.getCurrentOrNextForFamily(family);
    expect(third?.parts.refreshToken).toBe("r1");

    manager.markRateLimited(first!, 60_000, family);

    const fourth = manager.getCurrentOrNextForFamily(family);
    expect(fourth?.parts.refreshToken).toBe("r2");

    const fifth = manager.getCurrentOrNextForFamily(family);
    expect(fifth?.parts.refreshToken).toBe("r2");
  });

  it("removes an account and keeps cursor consistent", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 1,
    };

    const manager = new AccountManager(undefined, stored);
    const family: ModelFamily = "claude";

    const picked = manager.getCurrentOrNextForFamily(family);
    expect(picked?.parts.refreshToken).toBe("r2");

    manager.removeAccount(picked!);
    expect(manager.getAccountCount()).toBe(2);

    const next = manager.getNextForFamily(family);
    expect(next?.parts.refreshToken).toBe("r3");
  });

  it("attaches fallback access tokens only to the matching stored account", () => {
    const fallback: OAuthAuthDetails = {
      type: "oauth",
      refresh: "r2|p2",
      access: "access-2",
      expires: 123,
    };

    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(fallback, stored);
    const snapshot = manager.getAccountsSnapshot();

    expect(snapshot[0]?.access).toBeUndefined();
    expect(snapshot[0]?.expires).toBeUndefined();
    expect(snapshot[1]?.access).toBe("access-2");
    expect(snapshot[1]?.expires).toBe(123);
  });

  it("debounces toast display for same account", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));

    const stored: AccountStorageV3 = {
      version: 3,
      accounts: [
        { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
      ],
      activeIndex: 0,
    };

    const manager = new AccountManager(undefined, stored);

    expect(manager.shouldShowAccountToast(0)).toBe(true);
    manager.markToastShown(0);

    expect(manager.shouldShowAccountToast(0)).toBe(false);

    expect(manager.shouldShowAccountToast(1)).toBe(true);

    vi.setSystemTime(new Date(31000));
    expect(manager.shouldShowAccountToast(0)).toBe(true);
  });

  describe("header style fallback for Gemini", () => {
    it("tracks rate limits separately for each header style", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 60000, "gemini", "antigravity");

      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "antigravity")).toBe(true);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "gemini-cli")).toBe(false);
    });

    it("getAvailableHeaderStyle returns antigravity first for Gemini", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBe("antigravity");
    });

    it("getAvailableHeaderStyle returns gemini-cli when antigravity is rate-limited", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 60000, "gemini", "antigravity");

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBe("gemini-cli");
    });

    it("getAvailableHeaderStyle returns null when both header styles are rate-limited", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 60000, "gemini", "antigravity");
      manager.markRateLimited(account!, 60000, "gemini", "gemini-cli");

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBeNull();
    });

    it("getAvailableHeaderStyle always returns antigravity for Claude", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      expect(manager.getAvailableHeaderStyle(account!, "claude")).toBe("antigravity");
    });

    it("getAvailableHeaderStyle returns null for Claude when rate-limited", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markRateLimited(account!, 60000, "claude", "antigravity");

      expect(manager.getAvailableHeaderStyle(account!, "claude")).toBeNull();
    });

    it("Gemini rate limits expire independently per header style", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 30000, "gemini", "antigravity");
      manager.markRateLimited(account!, 60000, "gemini", "gemini-cli");

      vi.setSystemTime(new Date(35000));

      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "antigravity")).toBe(false);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "gemini-cli")).toBe(true);

      expect(manager.getAvailableHeaderStyle(account!, "gemini")).toBe("antigravity");
    });

    it("getMinWaitTimeForFamily considers both Gemini header styles", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markRateLimited(account!, 30000, "gemini", "antigravity");

      expect(manager.getMinWaitTimeForFamily("gemini")).toBe(0);

      manager.markRateLimited(account!, 60000, "gemini", "gemini-cli");

      expect(manager.getMinWaitTimeForFamily("gemini")).toBe(30000);
    });
  });

  describe("per-family account tracking", () => {
    it("tracks current account independently per model family", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);

      const claudeAccount = manager.getCurrentOrNextForFamily("claude");
      expect(claudeAccount?.parts.refreshToken).toBe("r1");

      manager.markRateLimited(claudeAccount!, 60000, "claude");

      const nextClaude = manager.getCurrentOrNextForFamily("claude");
      expect(nextClaude?.parts.refreshToken).toBe("r2");

      const geminiAccount = manager.getCurrentOrNextForFamily("gemini");
      expect(geminiAccount?.parts.refreshToken).toBe("r1");
    });

    it("switching Claude account does not affect Gemini account selection", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);

      expect(manager.getCurrentOrNextForFamily("gemini")?.parts.refreshToken).toBe("r1");

      const claude1 = manager.getCurrentOrNextForFamily("claude");
      manager.markRateLimited(claude1!, 60000, "claude");

      expect(manager.getCurrentOrNextForFamily("claude")?.parts.refreshToken).toBe("r2");
      expect(manager.getCurrentOrNextForFamily("gemini")?.parts.refreshToken).toBe("r1");

      const claude2 = manager.getCurrentOrNextForFamily("claude");
      manager.markRateLimited(claude2!, 60000, "claude");

      expect(manager.getCurrentOrNextForFamily("claude")?.parts.refreshToken).toBe("r3");
      expect(manager.getCurrentOrNextForFamily("gemini")?.parts.refreshToken).toBe("r1");
    });

    it("persists per-family indices to storage", async () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);

      const claude = manager.getCurrentOrNextForFamily("claude");
      manager.markRateLimited(claude!, 60000, "claude");
      manager.getCurrentOrNextForFamily("claude");

      expect(manager.getCurrentAccountForFamily("claude")?.index).toBe(1);
      expect(manager.getCurrentAccountForFamily("gemini")?.index).toBe(0);
    });

    it("loads per-family indices from storage", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
        activeIndexByFamily: {
          claude: 2,
          gemini: 1,
        },
      };

      const manager = new AccountManager(undefined, stored);

      expect(manager.getCurrentAccountForFamily("claude")?.parts.refreshToken).toBe("r3");
      expect(manager.getCurrentAccountForFamily("gemini")?.parts.refreshToken).toBe("r2");
    });

    it("falls back to activeIndex when activeIndexByFamily is not present", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 1,
      };

      const manager = new AccountManager(undefined, stored);

      expect(manager.getCurrentAccountForFamily("claude")?.parts.refreshToken).toBe("r2");
      expect(manager.getCurrentAccountForFamily("gemini")?.parts.refreshToken).toBe("r2");
    });
  });

  describe("account cooldown (non-429 errors)", () => {
    it("marks account as cooling down with reason", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account!, 30000, "auth-failure");

      expect(manager.isAccountCoolingDown(account!)).toBe(true);
    });

    it("cooldown expires after duration", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(0));

      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account!, 30000, "network-error");

      expect(manager.isAccountCoolingDown(account!)).toBe(true);

      vi.setSystemTime(new Date(35000));

      expect(manager.isAccountCoolingDown(account!)).toBe(false);
    });

    it("clearAccountCooldown removes cooldown state", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account!, 30000, "auth-failure");
      expect(manager.isAccountCoolingDown(account!)).toBe(true);

      manager.clearAccountCooldown(account!);
      expect(manager.isAccountCoolingDown(account!)).toBe(false);
    });

    it("cooling down account is skipped in getCurrentOrNextForFamily", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
          { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account1 = manager.getCurrentOrNextForFamily("claude");

      manager.markAccountCoolingDown(account1!, 30000, "project-error");

      const next = manager.getCurrentOrNextForFamily("claude");
      expect(next?.parts.refreshToken).toBe("r2");
    });

    it("cooldown is independent from rate limits", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getCurrentOrNextForFamily("gemini");

      manager.markAccountCoolingDown(account!, 30000, "auth-failure");

      expect(manager.isAccountCoolingDown(account!)).toBe(true);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "antigravity")).toBe(false);
      expect(manager.isRateLimitedForHeaderStyle(account!, "gemini", "gemini-cli")).toBe(false);
    });
  });

  describe("account selection strategies", () => {
    describe("sticky strategy (default)", () => {
      it("returns same account on consecutive calls", () => {
        const stored: AccountStorageV3 = {
          version: 3,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        const second = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        const third = manager.getCurrentOrNextForFamily("claude", null, "sticky");

        expect(first?.index).toBe(0);
        expect(second?.index).toBe(0);
        expect(third?.index).toBe(0);
      });

      it("switches account only when current is rate-limited", () => {
        const stored: AccountStorageV3 = {
          version: 3,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        expect(first?.index).toBe(0);

        manager.markRateLimited(first!, 60000, "claude");

        const second = manager.getCurrentOrNextForFamily("claude", null, "sticky");
        expect(second?.index).toBe(1);
      });
    });

    describe("round-robin strategy", () => {
      it("rotates to next account on each call", () => {
        const stored: AccountStorageV3 = {
          version: 3,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const second = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const third = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const fourth = manager.getCurrentOrNextForFamily("claude", null, "round-robin");

        const indices = [first?.index, second?.index, third?.index, fourth?.index];
        expect(new Set(indices).size).toBeGreaterThanOrEqual(2);
      });

      it("skips rate-limited accounts", () => {
        const stored: AccountStorageV3 = {
          version: 3,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);
        const accounts = manager.getAccounts();
        manager.markRateLimited(accounts[1]!, 60000, "claude");

        const first = manager.getCurrentOrNextForFamily("claude", null, "round-robin");
        const second = manager.getCurrentOrNextForFamily("claude", null, "round-robin");

        expect(first?.index).not.toBe(1);
        expect(second?.index).not.toBe(1);
      });
    });

    describe("hybrid strategy", () => {
      it("returns fresh (untouched) accounts first", () => {
        const stored: AccountStorageV3 = {
          version: 3,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r3", projectId: "p3", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        const first = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        const second = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        const third = manager.getCurrentOrNextForFamily("claude", null, "hybrid");

        const indices = [first?.index, second?.index, third?.index];
        expect(indices).toContain(0);
        expect(indices).toContain(1);
        expect(indices).toContain(2);
      });

      it("falls back to sticky when all accounts touched", () => {
        const stored: AccountStorageV3 = {
          version: 3,
          accounts: [
            { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
            { refreshToken: "r2", projectId: "p2", addedAt: 1, lastUsed: 0 },
          ],
          activeIndex: 0,
        };

        const manager = new AccountManager(undefined, stored);

        manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        manager.getCurrentOrNextForFamily("claude", null, "hybrid");

        const fourth = manager.getCurrentOrNextForFamily("claude", null, "hybrid");
        const fifth = manager.getCurrentOrNextForFamily("claude", null, "hybrid");

        expect(fourth?.index).toBe(fifth?.index);
      });
    });
  });

  describe("touchedForQuota tracking", () => {
    it("marks account as touched with timestamp", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1000));

      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      manager.markTouchedForQuota(account, "claude:antigravity");

      expect(account.touchedForQuota["claude:antigravity"]).toBe(1000);
    });

    it("isFreshForQuota returns true for untouched accounts", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      expect(manager.isFreshForQuota(account, "claude:antigravity")).toBe(true);
    });

    it("isFreshForQuota returns false for recently touched accounts", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1000));

      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      manager.markTouchedForQuota(account, "claude:antigravity");

      expect(manager.isFreshForQuota(account, "claude:antigravity")).toBe(false);
    });

    it("isFreshForQuota returns true after quota reset time passes", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(1000));

      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      manager.markTouchedForQuota(account, "claude");
      expect(manager.isFreshForQuota(account, "claude")).toBe(false);
      
      manager.markRateLimited(account, 60000, "claude", "antigravity");
      
      vi.setSystemTime(new Date(70000));
      expect(manager.isFreshForQuota(account, "claude")).toBe(true);
    });
  });

  describe("consecutiveFailures tracking", () => {
    it("initializes consecutiveFailures as undefined", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      expect(account.consecutiveFailures).toBeUndefined();
    });

    it("can increment and reset consecutiveFailures", () => {
      const stored: AccountStorageV3 = {
        version: 3,
        accounts: [
          { refreshToken: "r1", projectId: "p1", addedAt: 1, lastUsed: 0 },
        ],
        activeIndex: 0,
      };

      const manager = new AccountManager(undefined, stored);
      const account = manager.getAccounts()[0]!;

      account.consecutiveFailures = (account.consecutiveFailures ?? 0) + 1;
      expect(account.consecutiveFailures).toBe(1);

      account.consecutiveFailures = (account.consecutiveFailures ?? 0) + 1;
      expect(account.consecutiveFailures).toBe(2);

      account.consecutiveFailures = 0;
      expect(account.consecutiveFailures).toBe(0);
    });
  });
});
