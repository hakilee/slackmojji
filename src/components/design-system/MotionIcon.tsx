import type { Settings } from "../../lib/emoji";

const paths: Record<Settings["motion"], string> = {
  none: "M7 7h10v10H7z",
  scale: "M4 14v6h6M14 4h6v6M4 20l6-6M20 4l-6 6",
  bounce: "M8 7l4-4 4 4M12 3v12M5 20h14M8 15a4 4 0 0 0 8 0",
  slide: "M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4",
  shake: "M4 9l-1 3 1 3M20 9l1 3-1 3M8 7h8v10H8z",
  roll: "M19 9a7 7 0 1 0 0 6M19 4v5h-5",
  orbit: "M8 8c-4 2-6 6-4 9s7 2 11-1 7-7 5-10-6-2-9 0M13 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  swing: "M12 4l-5 12M4 19a12 12 0 0 0 16 0M12 4l5 12M12 3v2M5 16l4 2M15 18l4-2",
  jelly:
    "M7 5c-4 0-1 4-1 7s-3 7 1 7c3 0 3-2 5-2s2 2 5 2c4 0 1-4 1-7s3-7-1-7c-3 0-3 2-5 2S10 5 7 5Z",
  tremble: "M3 9l2 3-2 3M21 9l-2 3 2 3M8 7h8v10H8z",
  squash: "M6 10h12v4H6zM12 3v4M9 5l3 2 3-2M12 21v-4M9 19l3-2 3 2",
  float: "M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3M4 10h3M17 14h3",
};

/** 24px grid, 2px optical inset, 2px rounded strokes. */
export function MotionIcon({ motion }: { motion: Settings["motion"] }) {
  return (
    <svg
      className="size-6 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[motion]} />
    </svg>
  );
}
