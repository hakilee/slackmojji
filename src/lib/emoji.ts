import { formatDownloadFilename } from "./download-filename";
import { encode } from "modern-gif";

export const maxTextCharacters = 40;
export const motionFrameDelays = { 0.5: 120, 1: 60, 1.5: 40, 2: 30 } as const;

export const fonts: readonly string[] = ["Black Han Sans", "Jua", "Pretendard"];
export const motions = {
  none: "없음",
  scale: "두근두근",
  bounce: "통통",
  slide: "슬라이드",
  shake: "흔들흔들",
  roll: "빙글빙글",
  orbit: "둥실둥실",
  swing: "갸우뚱",
  jelly: "말랑말랑",
};
export type ImageLayer = {
  flipX?: boolean;
  flipY?: boolean;
  type: "image";
  id: string;
  name: string;
  source: HTMLCanvasElement;
  aspectRatio: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  fit: "contain" | "cover";
};
export type TextLayer = {
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  type: "text";
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  lineHeight: number;
  font: string;
  fontLabel?: string;
  color: string;
  gradient?: { end: string; direction: "horizontal" | "vertical" };
  characterColors?: Record<number, string>;
};
export type Layer = TextLayer | ImageLayer;
export type Settings = {
  layers: Layer[];
  background: string;
  backgroundGradient?: {
    end: string;
    direction: "horizontal" | "vertical" | "radial" | "diamond";
  };
  transparent: boolean;
  motion: keyof typeof motions;
  speed: keyof typeof motionFrameDelays;
  delay: number;
};
export const initialTextLayer: TextLayer = {
  type: "text",
  id: "text-1",
  text: "슬랙\n모찌",
  x: 64,
  y: 64,
  scale: 1,
  lineHeight: 85,
  font: "Black Han Sans",
  color: "#7555e8",
};
export const initialSettings: Settings = {
  layers: [initialTextLayer],
  background: "#ffffff",
  transparent: false,
  motion: "bounce",
  speed: 1,
  delay: 0,
};

export function textCharacters(text: string): string[] {
  return Array.from(
    new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(text),
    (part) => part.segment,
  );
}

export function constrainText(text: string): string {
  return textCharacters(text.replace(/\r\n?/g, "\n").split("\n").slice(0, 3).join("\n"))
    .slice(0, maxTextCharacters)
    .join("");
}

export function validateText(text: string): string | null {
  if (!text.trim()) return "이모지에 넣을 텍스트를 입력해 주세요.";
  if (textCharacters(text).length > maxTextCharacters)
    return `텍스트는 ${maxTextCharacters}자까지 입력할 수 있어요.`;
  if (text.split("\n").length > 3) return "줄은 3개까지 사용할 수 있어요.";
  return null;
}

export function validateSettings(settings: Settings): string | null {
  for (const layer of settings.layers) {
    if (layer.type !== "text" || !layer.text.trim()) continue;
    const error = validateText(layer.text);
    if (error) return error;
  }
  return settings.layers.some((layer) => layer.type === "image" || layer.text.trim())
    ? null
    : "텍스트나 이미지를 추가해 주세요.";
}

export function measureEmojiText(ctx: CanvasRenderingContext2D, settings: TextLayer) {
  const lines = settings.text.split("\n");
  ctx.font = `100px "${settings.font}"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let characterIndex = 0;
  const runs = lines.map((line) => {
    let advance = 0;
    const characters = textCharacters(line).map((character) => {
      const metric = ctx.measureText(character);
      const run = {
        character,
        metric,
        x: advance,
        color: settings.characterColors?.[characterIndex] ?? settings.color,
      };
      advance += metric.width;
      characterIndex += 1;
      return run;
    });
    characterIndex += 1;
    return characters;
  });
  const metrics = lines.map((line, index) =>
    settings.characterColors && !settings.gradient && runs[index].length
      ? {
          actualBoundingBoxLeft: -Math.min(
            ...runs[index].map((run) => run.x - run.metric.actualBoundingBoxLeft),
          ),
          actualBoundingBoxRight: Math.max(
            ...runs[index].map((run) => run.x + run.metric.actualBoundingBoxRight),
          ),
          actualBoundingBoxAscent: Math.max(
            ...runs[index].map((run) => run.metric.actualBoundingBoxAscent),
          ),
          actualBoundingBoxDescent: Math.max(
            ...runs[index].map((run) => run.metric.actualBoundingBoxDescent),
          ),
        }
      : ctx.measureText(line),
  );
  const width = Math.max(
    1,
    ...metrics.map((metric) => metric.actualBoundingBoxLeft + metric.actualBoundingBoxRight),
  );
  const top = Math.min(
    ...metrics.map((metric, index) => index * settings.lineHeight - metric.actualBoundingBoxAscent),
  );
  const bottom = Math.max(
    ...metrics.map(
      (metric, index) => index * settings.lineHeight + metric.actualBoundingBoxDescent,
    ),
  );
  const height = Math.max(1, bottom - top);
  return { lines, runs, metrics, width, height, top, bottom };
}

function applyMotion(ctx: CanvasRenderingContext2D, motion: Settings["motion"], progress: number) {
  const phase = progress * Math.PI * 2;
  switch (motion) {
    case "scale": {
      const scale = 0.85 + Math.sin(phase) * 0.12;
      ctx.scale(scale, scale);
      break;
    }
    case "bounce":
      ctx.translate(0, -Math.abs(Math.sin(phase)) * 12 + 6);
      break;
    case "slide":
      ctx.translate(Math.sin(phase) * 14, 0);
      break;
    case "shake":
      ctx.rotate(Math.sin(phase * 3) * 0.12);
      break;
    case "roll":
      ctx.rotate(phase);
      break;
    case "orbit":
      ctx.translate(Math.cos(phase) * 8, Math.sin(phase) * 8);
      break;
    case "swing":
      ctx.rotate(Math.sin(phase) * 0.25);
      break;
    case "jelly":
      ctx.scale(0.88 + Math.sin(phase) * 0.1, 0.88 - Math.sin(phase) * 0.1);
      break;
  }
}

export function drawEmoji(ctx: CanvasRenderingContext2D, settings: Settings, progress: number) {
  ctx.clearRect(0, 0, 128, 128);
  if (!settings.transparent) {
    if (settings.backgroundGradient?.direction === "diamond") {
      // Each quadrant projects onto its diagonal: t = (abs(x - 64) + abs(y - 64)) / 64.
      for (const x of [-1, 1]) {
        for (const y of [-1, 1]) {
          const gradient = ctx.createLinearGradient(64, 64, 64 + x * 32, 64 + y * 32);
          gradient.addColorStop(0, settings.background);
          gradient.addColorStop(1, settings.backgroundGradient.end);
          ctx.fillStyle = gradient;
          ctx.fillRect(x < 0 ? 0 : 64, y < 0 ? 0 : 64, 64, 64);
        }
      }
    } else {
      if (settings.backgroundGradient) {
        const gradient =
          settings.backgroundGradient.direction === "radial"
            ? ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
            : ctx.createLinearGradient(
                0,
                0,
                settings.backgroundGradient.direction === "horizontal" ? 128 : 0,
                settings.backgroundGradient.direction === "vertical" ? 128 : 0,
              );
        gradient.addColorStop(0, settings.background);
        gradient.addColorStop(1, settings.backgroundGradient.end);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = settings.background;
      }
      ctx.fillRect(0, 0, 128, 128);
    }
  }
  for (const layer of settings.layers) {
    if (layer.type === "text" && !layer.text.trim()) continue;
    ctx.save();
    try {
      ctx.translate(layer.x, layer.y);
      if (layer.type === "text") ctx.scale(layer.scale, layer.scale);
      applyMotion(ctx, settings.motion, progress);
      ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
      ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1);
      if (layer.type === "image") {
        if (layer.fit === "cover") {
          const width = Number(layer.source.width);
          const height = Number(layer.source.height);
          const side = Math.min(width, height);
          ctx.drawImage(
            layer.source,
            (width - side) / 2,
            (height - side) / 2,
            side,
            side,
            -layer.size / 2,
            -layer.size / 2,
            layer.size,
            layer.size,
          );
        } else {
          const width = layer.size * Math.min(1, layer.aspectRatio);
          const height = layer.size * Math.min(1, 1 / layer.aspectRatio);
          ctx.drawImage(layer.source, -width / 2, -height / 2, width, height);
        }
        continue;
      }
      const { lines, runs, metrics, width, height, top, bottom } = measureEmojiText(ctx, layer);
      ctx.scale(Math.min(126 / width, 126 / height), Math.min(126 / width, 126 / height));
      if (layer.gradient) {
        const gradient = ctx.createLinearGradient(
          layer.gradient.direction === "horizontal" ? -width / 2 : 0,
          layer.gradient.direction === "vertical" ? -height / 2 : 0,
          layer.gradient.direction === "horizontal" ? width / 2 : 0,
          layer.gradient.direction === "vertical" ? height / 2 : 0,
        );
        gradient.addColorStop(0, layer.color);
        gradient.addColorStop(1, layer.gradient.end);
        ctx.fillStyle = gradient;
      } else ctx.fillStyle = layer.color;
      lines.forEach((line, index) => {
        const x =
          (metrics[index].actualBoundingBoxLeft - metrics[index].actualBoundingBoxRight) / 2;
        const y = index * layer.lineHeight - (top + bottom) / 2;
        if (layer.characterColors && !layer.gradient) {
          runs[index].forEach((run) => {
            ctx.fillStyle = run.color;
            ctx.fillText(run.character, x + run.x, y);
          });
        } else ctx.fillText(line, x, y);
      });
    } finally {
      ctx.restore();
    }
  }
}

export async function exportGif(ctx: CanvasRenderingContext2D, settings: Settings): Promise<Blob> {
  const error = validateSettings(settings);
  if (error) throw new Error(error);
  const frames = [];
  const count = settings.motion === "none" ? 1 : 20;
  for (let index = 0; index < count; index += 1) {
    drawEmoji(ctx, settings, index / count);
    frames.push({
      data: ctx.getImageData(0, 0, 128, 128).data,
      delay:
        settings.motion === "none"
          ? 60
          : motionFrameDelays[settings.speed] + (index === 0 ? settings.delay : 0),
      disposal: 2 as const,
    });
  }
  let blob = await encode({
    width: 128,
    height: 128,
    frames,
    looped: true,
    loopCount: 0,
    format: "blob",
  });
  for (const maxColors of [128, 64, 32]) {
    if (blob.size <= 128 * 1024) break;
    const candidate = await encode({
      width: 128,
      height: 128,
      frames,
      looped: true,
      loopCount: 0,
      format: "blob",
      maxColors,
    });
    if (candidate.size < blob.size) blob = candidate;
  }
  if (blob.size > 128 * 1024)
    throw new Error("파일이 128KB를 넘었어요. 텍스트·이미지를 줄이거나 모션을 바꿔 주세요.");
  return blob;
}

export async function exportEmoji(
  ctx: CanvasRenderingContext2D,
  settings: Settings,
): Promise<Blob> {
  if (settings.motion !== "none") return exportGif(ctx, settings);
  const error = validateSettings(settings);
  if (error) throw new Error(error);
  drawEmoji(ctx, settings, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    ctx.canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("PNG 생성에 실패했어요. 다시 시도해 주세요."));
    }, "image/png");
  });
  if (blob.size > 128 * 1024)
    throw new Error("파일이 128KB를 넘었어요. 텍스트·이미지를 줄여 주세요.");
  return blob;
}

export function downloadFilename(layers: Layer[], format: "png" | "gif"): string {
  const text = layers
    .flatMap((layer) => (layer.type === "text" && layer.text.trim() ? [layer.text.trim()] : []))
    .join(" ");
  const image = layers.find((layer) => layer.type === "image");
  return formatDownloadFilename(
    text || (image?.type === "image" ? image.name.replace(/\.[^.]+$/, "") : ""),
    format,
  );
}
