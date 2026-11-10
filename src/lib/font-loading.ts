import type { Layer } from "./emoji";

export class LayerFontError extends Error {
  constructor(
    readonly layerId: string,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : "글꼴을 불러오지 못했어요.", { cause });
  }
}

export async function loadLayerFonts(layers: readonly Layer[]): Promise<void> {
  await Promise.all(
    layers.map(async (layer) => {
      if (layer.type !== "text" || !layer.text.trim()) return;
      try {
        await loadFont(layer.font, layer.text);
      } catch (cause) {
        throw new LayerFontError(layer.id, cause);
      }
    }),
  );
}

export async function loadFont(font: string, text: string): Promise<FontFace[]> {
  if (!text.trim()) return [];
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      document.fonts.load(`${font === "Pretendard" ? "600 " : ""}100px "${font}"`, text),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("font load timeout")), 15000);
      }),
    ]);
  } catch (cause) {
    throw new Error(
      "선택한 글꼴을 불러오지 못했어요. 연결을 확인하거나 다른 글꼴을 선택해 주세요.",
      { cause },
    );
  } finally {
    clearTimeout(timeout);
  }
}
