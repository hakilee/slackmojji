import { z } from "zod";
import type { Settings } from "./emoji-v1";

const color = z
  .string()
  .regex(/^#[a-fA-F0-9]{6}$/)
  .transform((value) => value.toLowerCase());
const direction = z.enum(["horizontal", "vertical"]);
const layer = z
  .strictObject({
    text: z
      .string()
      .min(1)
      .max(40)
      .regex(/^[\x20-\x7e\n가-힣ㄱ-ㅎㅏ-ㅣ]+$/)
      .refine((value) => !!value.trim() && value.split("\n").length <= 3),
    font: z.enum(["Black Han Sans", "Jua", "Pretendard"]),
    x: z.number().min(0).max(128),
    y: z.number().min(0).max(128),
    scale: z.number().min(0.1).max(1.5),
    lineHeight: z.number().min(50).max(200),
    rotation: z.number().min(-180).max(180).default(0),
    flipX: z.boolean().default(false),
    flipY: z.boolean().default(false),
    color,
    gradient: z.strictObject({ end: color, direction }).optional(),
    characterColors: z.record(z.string().regex(/^(?:[0-9]|[1-3][0-9])$/), color).optional(),
  })
  .refine(
    (value) =>
      !value.characterColors ||
      (!value.gradient &&
        Object.keys(value.characterColors).every((index) => Number(index) < value.text.length)),
  );

export const recipeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  rendererVersion: z.literal(1),
  fontVersion: z.literal(1),
  settings: z.strictObject({
    layers: z.array(layer).min(1).max(12),
    background: color,
    transparent: z.boolean(),
    backgroundGradient: z
      .strictObject({
        end: color,
        direction: z.enum(["horizontal", "vertical", "radial", "diamond"]),
      })
      .optional(),
    motion: z.enum([
      "none",
      "scale",
      "bounce",
      "slide",
      "shake",
      "roll",
      "orbit",
      "swing",
      "jelly",
    ]),
    speed: z.union([z.literal(0.5), z.literal(1), z.literal(1.5), z.literal(2)]),
    delay: z.number().int().min(0).max(5000),
  }),
});
export type MochiRecipe = z.infer<typeof recipeSchema>;
export const maxRecipeBytes = 16384;

export function createRecipe(settings: Settings): MochiRecipe | null {
  if (settings.layers.some((item) => item.type !== "text" || item.fontLabel)) return null;
  const parsed = recipeSchema.safeParse({
    schemaVersion: 1,
    rendererVersion: 1,
    fontVersion: 1,
    settings: {
      ...settings,
      layers: settings.layers.map((item) => {
        if (item.type !== "text") throw new Error("Unsupported layer");
        const { id: _id, type: _type, fontLabel: _label, ...content } = item;
        return content;
      }),
    },
  });
  return parsed.success ? parsed.data : null;
}

export function restoreRecipe(recipe: MochiRecipe): Settings {
  return {
    ...recipe.settings,
    layers: recipe.settings.layers.map((item, index) => ({
      ...item,
      id: `recipe-${index}`,
      type: "text",
      font: `Mochi v1 ${item.font}`,
    })),
  };
}
