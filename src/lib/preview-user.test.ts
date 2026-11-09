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

  test("supports the final name and avatar choices", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect((await import("./preview-user")).previewUser).toEqual({
      name: "Cola (콜라)",
      avatar: "/preview-avatars/leaf-crown-light.svg",
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
