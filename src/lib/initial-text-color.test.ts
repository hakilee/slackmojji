import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("page-load text color [E5bs]", () => {
  beforeEach(() => {
    vi.resetModules();
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  test("is stable within the page but excludes the preceding color on reload", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { initialTextColor } = await import("./initial-text-color");
    expect((await import("./initial-text-color")).initialTextColor).toBe(initialTextColor);
    vi.resetModules();
    expect((await import("./initial-text-color")).initialTextColor).not.toBe(initialTextColor);
  });

  test.each(Array.from({ length: 8 }, (_, index) => index))(
    "chooses a legible color against the default white background (%i)",
    async (index) => {
      vi.spyOn(Math, "random").mockReturnValue((index + 0.5) / 8);
      const { initialTextColor } = await import("./initial-text-color");
      expect(initialTextColor).toMatch(/^#[0-9a-f]{6}$/);
      const [red, green, blue] = [1, 3, 5].map((offset) => {
        const channel = Number.parseInt(initialTextColor.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      expect(1.05 / (0.2126 * red + 0.7152 * green + 0.0722 * blue + 0.05)).toBeGreaterThanOrEqual(
        4.5,
      );
    },
  );

  test("does not block editing when storage is unavailable", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect((await import("./initial-text-color")).initialTextColor).toBe("#7555e8");
  });
});
