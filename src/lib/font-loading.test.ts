import { describe, expect, onTestFinished, test, vi } from "vitest";
import { initialTextLayer } from "./emoji";
import { LayerFontError, loadFont, loadLayerFonts } from "./font-loading";

describe("text font loading [E2d]", () => {
  test("bounds a stalled browser font request to fifteen seconds", async () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    vi.stubGlobal("document", { fonts: { load: () => new Promise(() => {}) } });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    const rejected = expect(loadFont("Jua", "확인")).rejects.toThrow(
      "선택한 글꼴을 불러오지 못했어요.",
    );
    await vi.advanceTimersByTimeAsync(15000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });

  test("loads each visible text layer with its own family and content [E5y]", async () => {
    const load = vi.fn().mockResolvedValue([]);
    vi.stubGlobal("document", { fonts: { load } });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    await loadLayerFonts([
      initialTextLayer,
      { ...initialTextLayer, id: "second", font: "Jua", text: "두번째" },
      { ...initialTextLayer, id: "blank", font: "Unavailable", text: " \n" },
    ]);

    expect(load.mock.calls).toEqual([
      ['100px "Black Han Sans"', "슬랙\n모찌"],
      ['100px "Jua"', "두번째"],
    ]);
  });

  test("identifies a failed layer and permits recovery without changing other fonts [E5y]", async () => {
    const cause = new Error("network unavailable");
    const load = vi
      .fn()
      .mockImplementation((font: string) =>
        font.includes("Unavailable") ? Promise.reject(cause) : Promise.resolve([]),
      );
    vi.stubGlobal("document", { fonts: { load } });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const layers = [
      initialTextLayer,
      { ...initialTextLayer, id: "failed", font: "Unavailable", text: "복구" },
    ];

    const failed = loadLayerFonts(layers);
    await expect(failed).rejects.toBeInstanceOf(LayerFontError);
    await expect(failed).rejects.toMatchObject({ layerId: "failed", cause: { cause } });
    await expect(
      loadLayerFonts([layers[0], { ...layers[1], font: "Jua" }]),
    ).resolves.toBeUndefined();
    expect(layers[0].font).toBe("Black Han Sans");
    expect(load).toHaveBeenCalledWith('100px "Jua"', "복구");
  });
});
