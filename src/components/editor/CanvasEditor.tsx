import { CanvasHitTarget, CanvasResizeHandles } from "~/components/design-system";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { drawEmoji, measureEmojiText } from "~/lib/emoji";
import { LayerFontError, loadLayerFonts } from "~/lib/font-loading";
import type { Layer, Settings } from "~/lib/emoji";
import { Button, Spinner } from "~/components/design-system";

export function CanvasEditor({
  settings,
  selectedId,
  selectedAnchor,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onEditText,
  onChooseFont,
  renderAttempt,
  onRetry,
}: {
  settings: Settings;
  selectedId: string | null;
  selectedAnchor: RefObject<HTMLButtonElement | null>;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRotate: (id: string, rotation: number) => void;
  onResize: (
    id: string,
    patch: { x: number; y: number } & ({ scale: number } | { size: number }),
  ) => void;
  onEditText: (id: string) => void;
  onChooseFont: (id: string) => void;
  renderAttempt: number;
  onRetry: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<{
    id: string;
    pointerId: number;
    active: boolean;
    threshold: number;
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    rotate?: { angle: number; rotation: number; centerX: number; centerY: number };
    resize?: { type: Layer["type"]; size: number; diagonalX: number; diagonalY: number };
  } | null>(null);
  const [geometry, setGeometry] = useState<Record<string, { width: number; height: number }>>({});
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  useEffect(() => {
    const endDrag = () => {
      dragging.current = null;
      setGuides({});
    };
    window.addEventListener("blur", endDrag);
    return () => window.removeEventListener("blur", endDrag);
  }, []);
  const [error, setError] = useState<{ message: string; fontId: string | null } | null>(null);
  const [completedRender, setCompletedRender] = useState<{
    settings: Settings;
    attempt: number;
  } | null>(null);
  const rendering =
    completedRender?.settings !== settings || completedRender?.attempt !== renderAttempt;
  useEffect(() => {
    let active = true;
    async function render() {
      await loadLayerFonts(settings.layers);
      if (!active) return;
      const ctx = canvas.current?.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.save();
      try {
        ctx.scale(6, 6);
        drawEmoji(ctx, { ...settings, motion: "none" }, 0);
      } finally {
        ctx.restore();
      }
      const nextGeometry: Record<string, { width: number; height: number }> = {};
      for (const layer of settings.layers) {
        if (layer.type !== "text") continue;
        if (!layer.text.trim()) {
          nextGeometry[layer.id] = { width: 48, height: 24 };
          continue;
        }
        const { width, height } = measureEmojiText(ctx, layer);
        const fit = Math.min(126 / width, 126 / height);
        nextGeometry[layer.id] = { width: width * fit, height: height * fit };
      }
      setGeometry((previous) =>
        Object.keys(previous).length === Object.keys(nextGeometry).length &&
        Object.entries(nextGeometry).every(
          ([id, size]) =>
            previous[id]?.width === size.width && previous[id]?.height === size.height,
        )
          ? previous
          : nextGeometry,
      );
      setError(null);
    }
    void render()
      .catch((cause) => {
        if (active)
          setError({
            fontId: cause instanceof LayerFontError ? cause.layerId : null,
            message:
              cause instanceof LayerFontError
                ? cause.message
                : "캔버스를 그리지 못했어요. 다시 그리기를 눌러 주세요.",
          });
      })
      .finally(() => {
        if (active) setCompletedRender({ settings, attempt: renderAttempt });
      });
    return () => {
      active = false;
    };
  }, [settings, renderAttempt]);
  function layerSize(layer: Layer) {
    return layer.type === "text"
      ? {
          width: (geometry[layer.id]?.width ?? 48) * layer.scale,
          height: (geometry[layer.id]?.height ?? 24) * layer.scale,
        }
      : {
          width: layer.size * (layer.fit === "cover" ? 1 : Math.min(1, layer.aspectRatio)),
          height: layer.size * (layer.fit === "cover" ? 1 : Math.min(1, 1 / layer.aspectRatio)),
        };
  }
  function move(id: string, x: number, y: number) {
    onMove(
      id,
      Math.round(Math.max(0, Math.min(128, x))),
      Math.round(Math.max(0, Math.min(128, y))),
    );
  }
  function layerStyle(layer: Layer): CSSProperties {
    const { width, height } = layerSize(layer);
    return {
      left: `${(layer.x / 128) * 100}%`,
      top: `${(layer.y / 128) * 100}%`,
      width: `${(width / 128) * 100}%`,
      height: `${(height / 128) * 100}%`,
      transform: `translate(-50%, -50%) rotate(${layer.rotation ?? 0}deg)`,
    };
  }
  const layers = settings.layers;
  return (
    <div className="space-y-inset">
      <div
        role="group"
        id="work-canvas"
        tabIndex={0}
        aria-label="작업 캔버스"
        aria-busy={rendering}
        className="relative aspect-square outline-1 -outline-offset-1 outline-stroke-neutral-strong bg-bg-checker-base bg-[conic-gradient(var(--color-bg-checker-tile)_25%,transparent_0_50%,var(--color-bg-checker-tile)_0_75%,transparent_0)] bg-size-[16px_16px] [clip-path:inset(-30px)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-guide"
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary || dragging.current) return;
          const button = (event.target as HTMLElement).closest<HTMLElement>("[data-layer]");
          const id = button?.dataset.layer;
          if (!id || !button) {
            onSelect(null);
            return;
          }
          const layer = layers.find((item) => item.id === id);
          if (!layer) return;
          const handle = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-resize-corner], [data-rotate-corner]",
          );
          const corner = handle?.dataset.resizeCorner;
          const rotating = handle?.dataset.rotateCorner !== undefined;
          if (rotating && event.pointerType !== "mouse") return;
          const rect = canvas.current?.getBoundingClientRect();
          if (!rect) return;
          const centerX = rect.left + (layer.x / 128) * rect.width;
          const centerY = rect.top + (layer.y / 128) * rect.height;
          if (event.pointerType === "touch" && selectedId !== id && !handle) return;
          const { width, height } = layerSize(layer);
          const angle = ((layer.rotation ?? 0) * Math.PI) / 180;
          const horizontal = corner?.includes("e") ? 1 : -1;
          const vertical = corner?.includes("s") ? 1 : -1;
          onSelect(id);
          dragging.current = {
            id,
            pointerId: event.pointerId,
            active: false,
            threshold: event.pointerType === "touch" && !handle ? 10 : 3,
            clientX: event.clientX,
            clientY: event.clientY,
            x: layer.x,
            y: layer.y,
            rotate: rotating
              ? {
                  angle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
                  rotation: layer.rotation ?? 0,
                  centerX,
                  centerY,
                }
              : undefined,
            resize: corner
              ? {
                  type: layer.type,
                  size: layer.type === "text" ? layer.scale : layer.size,
                  diagonalX:
                    width * horizontal * Math.cos(angle) - height * vertical * Math.sin(angle),
                  diagonalY:
                    width * horizontal * Math.sin(angle) + height * vertical * Math.cos(angle),
                }
              : undefined,
          };
          if (handle) {
            event.preventDefault();
            selectedAnchor.current?.focus({ preventScroll: true });
          }
          (handle ?? button).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (
            !dragging.current ||
            dragging.current.id !== selectedId ||
            dragging.current.pointerId !== event.pointerId
          )
            return;
          const rect = canvas.current?.getBoundingClientRect();
          if (!rect) return;
          const drag = dragging.current;
          if (!drag.active) {
            if (
              Math.hypot(event.clientX - drag.clientX, event.clientY - drag.clientY) <=
              drag.threshold
            )
              return;
            drag.active = true;
          }
          if (drag.rotate) {
            const { angle, rotation, centerX, centerY } = drag.rotate;
            const next =
              rotation +
              ((Math.atan2(event.clientY - centerY, event.clientX - centerX) - angle) * 180) /
                Math.PI;
            const snapped = event.shiftKey ? Math.round(next / 15) * 15 : Math.round(next);
            onRotate(drag.id, ((((snapped + 180) % 360) + 360) % 360) - 180);
            return;
          }
          if (drag.resize) {
            const { size, type, diagonalX, diagonalY } = drag.resize;
            let minimum = (type === "text" ? 0.1 : 8) / size;
            let maximum = (type === "text" ? 1.5 : 256) / size;
            for (const [center, diagonal] of [
              [drag.x, diagonalX],
              [drag.y, diagonalY],
            ]) {
              if (Math.abs(diagonal) < 1e-8) continue;
              const start = 1 - (2 * center) / diagonal;
              const end = 1 + (2 * (128 - center)) / diagonal;
              minimum = Math.max(minimum, Math.min(start, end));
              maximum = Math.min(maximum, Math.max(start, end));
            }
            const step = type === "text" ? 0.01 : 1;
            const nextSize = Number(
              Math.max(
                Math.ceil((minimum * size) / step - 1e-8) * step,
                Math.min(
                  Math.floor((maximum * size) / step + 1e-8) * step,
                  Math.round(
                    (size *
                      (1 +
                        ((((event.clientX - drag.clientX) * 128) / rect.width) * diagonalX +
                          (((event.clientY - drag.clientY) * 128) / rect.height) * diagonalY) /
                          (diagonalX ** 2 + diagonalY ** 2))) /
                      step,
                  ) * step,
                ),
              ).toFixed(type === "text" ? 2 : 0),
            );
            onResize(drag.id, {
              x: Math.max(0, Math.min(128, drag.x + (diagonalX * (nextSize / size - 1)) / 2)),
              y: Math.max(0, Math.min(128, drag.y + (diagonalY * (nextSize / size - 1)) / 2)),
              ...(type === "text" ? { scale: nextSize } : { size: nextSize }),
            });
            return;
          }
          const bounds = (id: string) => {
            const image = layers.find((item) => item.id === id);
            if (!image) return { x: 64, y: 64, width: 0, height: 0 };
            const { width, height } = layerSize(image);
            const angle = ((image.rotation ?? 0) * Math.PI) / 180;
            return {
              x: image.x,
              y: image.y,
              width: Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle)),
              height: Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle)),
            };
          };
          const moving = bounds(drag.id);
          const targets = [
            { x: 64, y: 64, width: 128, height: 128 },
            ...layers.filter((layer) => layer.id !== drag.id).map((layer) => bounds(layer.id)),
          ];
          const next = {
            x: drag.x + ((event.clientX - drag.clientX) * 128) / rect.width,
            y: drag.y + ((event.clientY - drag.clientY) * 128) / rect.height,
          };
          const lines: { x?: number; y?: number } = {};
          if (!event.altKey)
            for (const axis of ["x", "y"] as const) {
              const size = axis === "x" ? "width" : "height";
              let distance = (5 * 128) / rect.width;
              for (const target of targets) {
                if (Math.abs(target[axis] - next[axis]) < distance) {
                  distance = Math.abs(target[axis] - next[axis]);
                  lines[axis] = target[axis];
                  moving[axis] = target[axis];
                }
              }
              if (lines[axis] === undefined)
                for (const target of targets)
                  for (const anchor of [-0.5, 0, 0.5])
                    for (const offset of [-0.5, 0, 0.5]) {
                      const line = target[axis] + target[size] * anchor;
                      const correction = line - (next[axis] + moving[size] * offset);
                      const position = next[axis] + correction;
                      if (Math.abs(correction) < distance && position >= 0 && position <= 128) {
                        distance = Math.abs(correction);
                        lines[axis] = line;
                        moving[axis] = position;
                      }
                    }
              if (lines[axis] !== undefined) next[axis] = moving[axis];
            }
          setGuides(lines);
          move(drag.id, next.x, next.y);
        }}
        onPointerUp={(event) => {
          if (dragging.current?.pointerId !== event.pointerId) return;
          dragging.current = null;
          setGuides({});
          if ((event.target as HTMLElement).hasPointerCapture(event.pointerId))
            (event.target as HTMLElement).releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (dragging.current?.pointerId !== event.pointerId) return;
          dragging.current = null;
          setGuides({});
        }}
        onLostPointerCapture={(event) => {
          if (dragging.current?.pointerId !== event.pointerId) return;
          dragging.current = null;
          setGuides({});
        }}
        onKeyDown={(event) => {
          if (event.metaKey || event.ctrlKey) {
            dragging.current = null;
            setGuides({});
            return;
          }
          if (event.key === "Escape") {
            dragging.current = null;
            setGuides({});
            onSelect(null);
            return;
          }
          const id = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-layer]")
            ?.dataset.layer;
          if (!id) return;
          const layer = layers.find((item) => item.id === id);
          if (!layer || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
            return;
          event.preventDefault();
          onSelect(id);
          const step = event.shiftKey ? 10 : 1;
          move(
            id,
            layer.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
            layer.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
          );
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <canvas
            ref={canvas}
            width={768}
            height={768}
            aria-label="이모지 작업 캔버스"
            className="absolute inset-0 size-full"
          />
          {guides.x !== undefined && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-10 border-l border-stroke-guide"
              style={{ left: `${(guides.x / 128) * 100}%` }}
            />
          )}
          {guides.y !== undefined && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-stroke-guide"
              style={{ top: `${(guides.y / 128) * 100}%` }}
            />
          )}
          {layers.map((layer) => {
            if (layer.type === "text" && !geometry[layer.id]) return null;
            const id = layer.id;
            return (
              <CanvasHitTarget
                key={id}
                ref={(element) => {
                  if (element && selectedId === id) selectedAnchor.current = element;
                }}
                data-layer={id}
                style={layerStyle(layer)}
                aria-label={
                  layer.type === "text"
                    ? `텍스트 레이어: ${layer.text.trim() || "빈 텍스트"}`
                    : `이미지 레이어: ${layer.name}`
                }
                aria-pressed={selectedId === id}
                aria-haspopup="dialog"
                aria-expanded={selectedId === id}
                aria-controls={selectedId === id ? "layer-controls" : undefined}
                onClick={(event) => {
                  if (selectedId !== id || event.detail === 0) onSelect(id);
                  if (event.detail === 0) {
                    requestAnimationFrame(() => {
                      document
                        .querySelector('#work-canvas [data-layer][aria-pressed="true"]')
                        ?.scrollIntoView({ block: "nearest" });
                      document.getElementById("layer-controls")?.focus({ preventScroll: true });
                    });
                  }
                }}
                onDoubleClick={layer.type === "text" ? () => onEditText(id) : undefined}
              />
            );
          })}
        </div>
        {layers.map(
          (layer) =>
            selectedId === layer.id &&
            (layer.type !== "text" || geometry[layer.id]) && (
              <CanvasResizeHandles
                key={layer.id}
                layerId={layer.id}
                rotation={layer.rotation ?? 0}
                style={layerStyle(layer)}
              />
            ),
        )}
      </div>
      {error && (
        <div className="space-y-control">
          <p role="alert" className="text-caption text-fg-critical">
            {error.message}
          </p>
          <div className="flex flex-wrap gap-control">
            <Button
              variant="white"
              size="small"
              disabled={rendering}
              aria-busy={rendering}
              onClick={onRetry}
            >
              {rendering && <Spinner />}
              다시 그리기
            </Button>
            {error.fontId && (
              <Button variant="neutral" size="small" onClick={() => onChooseFont(error.fontId!)}>
                글꼴 설정 열기
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
