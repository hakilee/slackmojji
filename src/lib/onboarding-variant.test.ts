import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("onboarding assignment [E5bx]", () => {
  beforeEach(() => {
    vi.resetModules();
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });
  test.each([
    { random: 0, expected: "spotlight" },
    { random: 0.4999, expected: "spotlight" },
    { random: 0.5, expected: "overview" },
    { random: 0.9999, expected: "overview" },
  ])("assigns $random to $expected and retains it on reload", async ({ random, expected }) => {
    vi.spyOn(Math, "random").mockReturnValue(random);
    expect((await import("./onboarding-variant")).onboardingVariant).toBe(expected);
    expect(localStorage.getItem("slackmojji:onboarding:variant:v1")).toBe(expected);
    vi.mocked(Math.random).mockReturnValue(random < 0.5 ? 0.9 : 0.1);
    vi.resetModules();
    expect((await import("./onboarding-variant")).onboardingVariant).toBe(expected);
  });
  test("replaces invalid assignments without touching completion", async () => {
    localStorage.setItem("slackmojji:onboarding:variant:v1", "invalid");
    localStorage.setItem("slackmojji:onboarding:v1", "completed");
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    expect((await import("./onboarding-variant")).onboardingVariant).toBe("overview");
    expect(localStorage.getItem("slackmojji:onboarding:v1")).toBe("completed");
  });
  test("keeps an in-memory assignment with blocked storage", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    expect((await import("./onboarding-variant")).onboardingVariant).toBe("overview");
    vi.mocked(Math.random).mockReturnValue(0.1);
    expect((await import("./onboarding-variant")).onboardingVariant).toBe("overview");
  });
});
