import "./recipe-fonts-v1/fonts.css";
import { drawEmoji, motionFrameDelays } from "./emoji-v1";
import type { Settings, TextLayer, measureEmojiText } from "./emoji-v1";
import { loadFont } from "./font-loading";
import { recipeSchema, restoreRecipe } from "./mochi-recipe";
import type { MochiRecipe } from "./mochi-recipe";

const loads = new Map<string, Promise<FontFace[]>>();
export async function loadRecipe(value: unknown): Promise<Settings> {
  const parsed = recipeSchema.safeParse(value);
  if (!parsed.success) throw new Error("지원하지 않는 모찌 설정이에요.");
  const settings = restoreRecipe(parsed.data);
  await Promise.all(
    settings.layers.map(async (layer) => {
      if (layer.type !== "text") throw new Error("지원하지 않는 레이어예요.");
      const key = `${layer.font}:${layer.text}`;
      let pending = loads.get(key);
      if (!pending) {
        pending = loadFont(layer.font, layer.text)
          .then((faces) => {
            if (!faces.length) throw new Error("모찌의 원본 글꼴을 찾을 수 없어요.");
            return faces;
          })
          .catch((cause) => {
            loads.delete(key);
            throw cause;
          });
        if (loads.size >= 128) loads.delete(loads.keys().next().value!);
        loads.set(key, pending);
      }
      await pending;
    }),
  );
  return settings;
}

type Entry = {
  recipe: MochiRecipe;
  settings?: Settings;
  visible: boolean;
  loading: boolean;
  failed: boolean;
  drawn: boolean;
  last: number;
  started: number;
  layout: Map<TextLayer, ReturnType<typeof measureEmojiText>>;
  onError: (cause: unknown) => void;
};
const entries = new Map<HTMLCanvasElement, Entry>();
let frame = 0;
let observer: IntersectionObserver | undefined;
let preference: MediaQueryList | undefined;
function schedule() {
  if (
    frame ||
    document.hidden ||
    ![...entries.values()].some(
      (entry) =>
        entry.visible &&
        entry.settings &&
        (!entry.drawn || (!preference?.matches && entry.settings.motion !== "none")),
    )
  )
    return;
  frame = requestAnimationFrame(render);
}
function render(time: number) {
  frame = 0;
  for (const [canvas, entry] of entries) {
    if (!entry.visible || !entry.settings || document.hidden) continue;
    const settings = entry.settings;
    const animate = !preference?.matches && settings.motion !== "none";
    if (entry.drawn && (!animate || time - entry.last < motionFrameDelays[settings.speed]))
      continue;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("미리보기를 그리지 못했어요.");
      const duration = motionFrameDelays[settings.speed] * 20;
      drawEmoji(
        ctx,
        settings,
        animate
          ? Math.max(0, ((time - entry.started) % (duration + settings.delay)) - settings.delay) /
              duration
          : 0,
        entry.layout,
      );
      entry.last = time;
      entry.drawn = true;
    } catch (cause) {
      entry.settings = undefined;
      entry.failed = true;
      entry.onError(cause);
    }
  }
  schedule();
}
function visibilityChanged() {
  if (document.hidden && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
  schedule();
}
function motionChanged() {
  for (const entry of entries.values()) entry.drawn = false;
  schedule();
}

export function observeRecipeCanvas(
  canvas: HTMLCanvasElement,
  recipe: MochiRecipe,
  onError: (cause: unknown) => void,
): () => void {
  if (!observer) {
    preference = matchMedia("(prefers-reduced-motion: reduce)");
    preference.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    observer = new IntersectionObserver((changes) => {
      for (const change of changes) {
        const target = change.target as HTMLCanvasElement;
        const entry = entries.get(target);
        if (!entry) continue;
        entry.visible = change.isIntersecting;
        if (entry.visible && !entry.settings && !entry.loading && !entry.failed) {
          entry.loading = true;
          void loadRecipe(entry.recipe)
            .then((settings) => {
              if (entries.get(target) !== entry) return;
              entry.settings = settings;
              entry.started = performance.now();
              schedule();
            })
            .catch((cause) => {
              if (entries.get(target) === entry) {
                entry.failed = true;
                entry.onError(cause);
              }
            })
            .finally(() => {
              entry.loading = false;
            });
        }
      }
      schedule();
    });
  }
  entries.set(canvas, {
    recipe,
    visible: false,
    loading: false,
    failed: false,
    drawn: false,
    last: 0,
    started: 0,
    layout: new Map(),
    onError,
  });
  observer.observe(canvas);
  return () => {
    if (!entries.has(canvas)) return;
    observer?.unobserve(canvas);
    entries.delete(canvas);
    if (!entries.size) {
      observer?.disconnect();
      observer = undefined;
      preference?.removeEventListener("change", motionChanged);
      preference = undefined;
      document.removeEventListener("visibilitychange", visibilityChanged);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}
