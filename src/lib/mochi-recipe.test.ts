import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { decode } from "modern-gif";
import { describe, expect, onTestFinished, test } from "vitest";
import { createRecipe, recipeSchema, restoreRecipe } from "./mochi-recipe";
import { drawEmoji, exportGif, initialSettings, initialTextLayer } from "./emoji-v1";

describe("versioned text recipes [E6g]", () => {
  test.each(["tremble", "squash", "float"] as const)(
    "keeps new editor effect %s on the GIF fallback [E5bv]",
    (motion) => {
      expect(createRecipe({ ...initialSettings, motion })).toBeNull();
      const recipe = createRecipe(initialSettings)!;
      expect(
        recipeSchema.safeParse({ ...recipe, settings: { ...recipe.settings, motion } }).success,
      ).toBe(false);
    },
  );
  test.each([
    { schemaVersion: 2 },
    { rendererVersion: 2 },
    { fontVersion: 2 },
    { unknown: true },
    { settings: { ...initialSettings, layers: [] } },
  ])("rejects unsupported record %j", (patch) => {
    expect(recipeSchema.safeParse({ ...createRecipe(initialSettings), ...patch }).success).toBe(
      false,
    );
  });
  test.each([
    { text: "😀" },
    { text: "a\u0301" },
    { text: "\u0000" },
    { text: " " },
    { text: "가".repeat(41) },
    { text: "a\nb\nc\nd" },
    { font: "Remote" },
    { x: NaN },
    { y: Infinity },
    { x: -1 },
    { scale: 0 },
    { lineHeight: 201 },
    { rotation: 181 },
    { color: "red" },
    { color: "#123456;" },
    { source: "url" },
    { characterColors: { 39: "#ffffff" } },
    { characterColors: { __proto__: "bad", 99: "#ffffff" } },
    { gradient: { direction: "radial", end: "#ffffff" } },
  ])("rejects invalid public layer %j", (patch) => {
    const recipe = createRecipe(initialSettings)!;
    expect(
      recipeSchema.safeParse({
        ...recipe,
        settings: { ...recipe.settings, layers: [{ ...recipe.settings.layers[0], ...patch }] },
      }).success,
    ).toBe(false);
  });
  test("canonicalizes public identity and excludes editor-only fields", () => {
    const recipe = createRecipe(initialSettings)!;
    const reversed = Object.fromEntries(Object.entries(recipe).reverse());
    expect(JSON.stringify(recipeSchema.parse(reversed))).toBe(JSON.stringify(recipe));
    expect(recipe.settings.layers[0]).not.toHaveProperty("id");
    expect(
      createRecipe({ ...initialSettings, layers: [{ ...initialTextLayer, fontLabel: "upload" }] }),
    ).toBeNull();
    expect(
      createRecipe({ ...initialSettings, layers: Array(13).fill(initialTextLayer) }),
    ).toBeNull();
    expect(
      recipeSchema.parse({
        ...recipe,
        settings: {
          ...recipe.settings,
          layers: [{ ...recipe.settings.layers[0], color: "#ABCDEF" }],
        },
      }).settings.layers[0].color,
    ).toBe("#abcdef");
  });
  test("restores transforms/colors, draws identical pixels and exports a timed GIF", async () => {
    for (const family of ["Pretendard", "Mochi v1 Pretendard"]) {
      const key = GlobalFonts.registerFromPath(
        "node_modules/pretendard/dist/public/static/Pretendard-Regular.otf",
        family,
      );
      if (!key) throw new Error("Test font unavailable");
      onTestFinished(() => {
        GlobalFonts.remove(key);
      });
    }
    const settings = {
      ...initialSettings,
      transparent: true,
      layers: [
        {
          ...initialTextLayer,
          font: "Pretendard",
          rotation: 30,
          flipX: true,
          gradient: { end: "#00ffff", direction: "horizontal" as const },
        },
      ],
    };
    expect(createRecipe(settings)).toBeNull();
    const restored = restoreRecipe(
      recipeSchema.parse({
        ...createRecipe(initialSettings),
        settings: {
          ...settings,
          layers: settings.layers.map(({ id: _id, type: _type, ...layer }) => layer),
        },
      }),
    );
    settings.layers[0].font = "Mochi v1 Pretendard";
    const original = createCanvas(128, 128).getContext("2d");
    const target = createCanvas(128, 128).getContext("2d");
    const layout = new Map();
    for (const progress of [0, 0.25, 0.5]) {
      drawEmoji(original as unknown as CanvasRenderingContext2D, settings, progress);
      drawEmoji(target as unknown as CanvasRenderingContext2D, restored, progress, layout);
      expect(target.getImageData(0, 0, 128, 128).data).toEqual(
        original.getImageData(0, 0, 128, 128).data,
      );
    }
    const blob = await exportGif(target as unknown as CanvasRenderingContext2D, restored);
    const gif = decode(await blob.arrayBuffer());
    expect(gif.width).toBe(128);
    expect(gif.height).toBe(128);
    expect(gif.frames).toHaveLength(20);
    expect(gif.frames.map((frame) => frame.delay)).toEqual(Array(20).fill(60));
  });
});
