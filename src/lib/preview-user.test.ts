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
    expect(reloaded.avatar).toMatch(/^\/preview-avatars\/[a-z-]+-light\.svg$/);
  });

  test.each([
    [0, "Gene (진)", "triple-lens"],
    [1, "Izy (이지)", "pearl-leaves"],
    [2, "Rubato (루바토)", "tri-axial-weave"],
    [3, "Loopy (루피)", "braided-disc"],
    [4, "Everett (에버렛)", "crossed-petals"],
    [5, "Orra (오라)", "five-lobe-vortex"],
    [6, "Coke (코크)", "six-tile-halo"],
    [7, "Cola (콜라)", "pillow-braid"],
    [8, "Ria (리아)", "four-lens-orbit"],
    [9, "Crong (크롱)", "five-cushions"],
    [10, "Chloe (클로이)", "five-capsule-star"],
    [11, "Hailey (헤일리)", "leaf-crown"],
  ] as const)("keeps profile %i mapped to %s", async (index, name, avatar) => {
    vi.spyOn(Math, "random").mockReturnValue((index + 0.5) / 12);
    expect((await import("./preview-user")).previewUser).toEqual({
      name,
      avatar: `/preview-avatars/${avatar}-light.svg`,
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
      avatar: "/preview-avatars/triple-lens-light.svg",
    });
  });
});
