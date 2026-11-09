import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("preview author lifecycle [E5br]", () => {
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

  test("keeps the author stable within a page and changes both choices on reload", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const first = (await import("./preview-user")).previewUser;
    expect((await import("./preview-user")).previewUser).toBe(first);

    vi.resetModules();
    const reloaded = (await import("./preview-user")).previewUser;
    expect(reloaded.name).not.toBe(first.name);
    expect(reloaded.avatar).not.toBe(first.avatar);
    expect(reloaded.avatar).toMatch(/^\/preview-avatars\/[a-z-]+\.webp$/);
  });

  test.each([
    [0, "Gene (진)", "gene"],
    [1, "Izy (이지)", "izy"],
    [2, "Rubato (루바토)", "rubato"],
    [3, "Loopy (루피)", "loopy"],
    [4, "Everett (에버렛)", "everett"],
    [5, "Orra (오라)", "orra"],
    [6, "Coke (코크)", "coke"],
    [7, "Cola (콜라)", "cola"],
    [8, "Ria (리아)", "ria"],
    [9, "Crong (크롱)", "crong"],
    [10, "Chloe (클로이)", "chloe"],
    [11, "Hailey (헤일리)", "hailey"],
  ] as const)("keeps profile %i mapped to %s", async (index, name, avatar) => {
    vi.spyOn(Math, "random").mockReturnValue((index + 0.5) / 12);
    expect((await import("./preview-user")).previewUser).toEqual({
      name,
      avatar: `/preview-avatars/${avatar}.webp`,
    });
  });

  test("still loads when session storage is blocked", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("storage blocked");
      },
      setItem: () => {
        throw new Error("storage blocked");
      },
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect((await import("./preview-user")).previewUser).toEqual({
      name: "Gene (진)",
      avatar: "/preview-avatars/gene.webp",
    });
  });
});
