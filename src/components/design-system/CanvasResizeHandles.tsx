import { Fragment, type CSSProperties } from "react";

export function CanvasResizeHandles({
  layerId,
  rotation,
  style,
}: {
  layerId: string;
  rotation: number;
  style: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      data-layer={layerId}
      className="pointer-events-none absolute z-20"
      style={style}
    >
      {[
        { corner: "nw", x: 0, y: 0 },
        { corner: "ne", x: 100, y: 0 },
        { corner: "sw", x: 0, y: 100 },
        { corner: "se", x: 100, y: 100 },
      ].map(({ corner, x, y }) => (
        <Fragment key={corner}>
          <span
            data-rotate-corner={corner}
            title="드래그하여 회전 · Shift: 15° 단위"
            className="pointer-events-auto absolute hidden size-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full hover:bg-stroke-guide/15 active:cursor-grabbing [@media(hover:hover)_and_(pointer:fine)]:block"
            style={{
              left: `calc(${x}% + ${x === 0 ? -18 : 18}px)`,
              top: `calc(${y}% + ${y === 0 ? -18 : 18}px)`,
            }}
          />
          <span
            data-resize-corner={corner}
            className="pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              cursor: ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][
                ((Math.round((rotation + (x === y ? 45 : 135)) / 45) % 4) + 4) % 4
              ],
            }}
          >
            <span className="pointer-events-none size-2 rounded-[2px] border border-stroke-guide bg-bg-layer-default" />
          </span>
        </Fragment>
      ))}
    </div>
  );
}
