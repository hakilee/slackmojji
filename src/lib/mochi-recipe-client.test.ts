import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import { initialSettings, initialTextLayer } from "./emoji-v1";
import { createRecipe } from "./mochi-recipe";
import { loadRecipe, observeRecipeCanvas } from "./mochi-recipe-client";

describe("recipe preview lifecycle [E6g]", () => {
  test("shares one frame loop, defers offscreen loads, stops hidden/reduced-motion work and cleans up", async () => {
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    let intersection: IntersectionObserverCallback;
    const disconnect = vi.fn();
    const documentState = Object.assign(new EventTarget(), {
      hidden: false,
      fonts: { load: vi.fn().mockResolvedValue([{}]) },
    });
    const preference = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal("document", documentState);
    vi.stubGlobal("matchMedia", () => preference);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersection = callback;
        }
        observe() {}
        unobserve() {}
        disconnect = disconnect;
      },
    );
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const first = createCanvas(128, 128) as unknown as HTMLCanvasElement;
    const second = createCanvas(128, 128) as unknown as HTMLCanvasElement;
    const error = vi.fn();
    const recipe = createRecipe(initialSettings)!;
    const stopFirst = observeRecipeCanvas(first, recipe, error);
    onTestFinished(stopFirst);
    const stopSecond = observeRecipeCanvas(second, recipe, error);
    onTestFinished(stopSecond);
    expect(frames.size).toBe(0);
    expect(documentState.fonts.load).not.toHaveBeenCalled();
    intersection!(
      [
        { target: first, isIntersecting: true },
        { target: second, isIntersecting: true },
      ] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
    await vi.waitFor(() => expect(frames.size).toBe(1));
    expect(documentState.fonts.load).toHaveBeenCalledTimes(1);
    let frame = [...frames.entries()][0];
    frames.delete(frame[0]);
    frame[1](performance.now());
    expect(frames.size).toBe(1);
    documentState.hidden = true;
    documentState.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(0);
    documentState.hidden = false;
    documentState.dispatchEvent(new Event("visibilitychange"));
    expect(frames.size).toBe(1);
    preference.matches = true;
    preference.dispatchEvent(new Event("change"));
    frame = [...frames.entries()][0];
    frames.delete(frame[0]);
    frame[1](performance.now() + 100);
    expect(frames.size).toBe(0);
    preference.matches = false;
    preference.dispatchEvent(new Event("change"));
    expect(frames.size).toBe(1);
    intersection!(
      [
        { target: first, isIntersecting: false },
        { target: second, isIntersecting: false },
      ] as unknown as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    );
    frame = [...frames.entries()][0];
    frames.delete(frame[0]);
    frame[1](performance.now() + 200);
    expect(frames.size).toBe(0);
    stopFirst();
    stopSecond();
    expect(disconnect).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
  test("rejects an unavailable pinned face instead of silently falling back, and permits retry", async () => {
    const load = vi.fn().mockResolvedValue([]);
    vi.stubGlobal("document", { fonts: { load } });
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const recipe = createRecipe({
      ...initialSettings,
      layers: [{ ...initialTextLayer, text: "재시도" }],
    })!;
    await expect(loadRecipe(recipe)).rejects.toThrow("원본 글꼴");
    load.mockResolvedValue([{}]);
    await expect(loadRecipe(recipe)).resolves.toMatchObject({
      layers: [{ font: "Mochi v1 Black Han Sans" }],
    });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
