import { Popover } from "./meki/popover";
import { useId, useState } from "react";
import { Button } from "./meki/button";
import { CheckIcon } from "./icons/components/check-icon";
import { Input } from "./meki/input";

const colors = [
  { value: "#1a1c20", label: "차콜" },
  { value: "#ffffff", label: "흰색" },
  { value: "#ef4444", label: "빨강" },
  { value: "#f97316", label: "주황" },
  { value: "#eab308", label: "노랑" },
  { value: "#22c55e", label: "초록" },
  { value: "#14b8a6", label: "청록" },
  { value: "#0ea5e9", label: "하늘" },
  { value: "#3b82f6", label: "파랑" },
  { value: "#7555e8", label: "보라" },
  { value: "#ec4899", label: "분홍" },
  { value: "#8b5e3c", label: "갈색" },
];

export function ColorPicker({
  label,
  displayLabel = label,
  value,
  onChange,
  disabled = false,
  swatch = false,
}: {
  label: string;
  displayLabel?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  swatch?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && !/^#?[\da-f]{6}$/i.test(draft);

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setDraft(null);
      }}
    >
      <Popover.Trigger
        disabled={disabled}
        aria-label={`${label} 선택`}
        className={
          swatch
            ? "flex size-8 shrink-0 items-center justify-center rounded-full border border-stroke-neutral bg-bg-layer-default p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed"
            : "flex min-h-control-size min-w-0 cursor-pointer items-center justify-between gap-control rounded-control border border-stroke-neutral bg-bg-layer-default px-inset py-control text-label text-fg-neutral-secondary shadow-control transition-colors duration-150 enabled:hover:border-stroke-neutral-strong enabled:active:bg-bg-neutral-weak-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus data-[state=open]:border-stroke-brand disabled:cursor-not-allowed disabled:bg-bg-disabled disabled:text-fg-disabled motion-reduce:transition-none"
        }
      >
        {!swatch && <span>{displayLabel}</span>}
        <span
          aria-hidden="true"
          className={
            swatch
              ? "size-full rounded-full"
              : "size-5 shrink-0 rounded-control-inset border border-stroke-neutral-strong"
          }
          style={{ backgroundColor: value }}
        />
      </Popover.Trigger>
      <Popover.Provider>
        <Popover.Content
          sideOffset={8}
          collisionPadding={12}
          align="start"
          aria-labelledby={`${id}-title`}
          className="max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain w-64 max-w-[calc(100vw-24px)] space-y-inset rounded-panel border border-stroke-neutral bg-bg-layer-default p-inset text-fg-neutral shadow-floating outline-none"
        >
          <div className="flex items-center justify-between gap-control">
            <h2 id={`${id}-title`} className="text-label font-semibold">
              {label}
            </h2>
            <Popover.Close aria-label="색상 선택 닫기" asChild>
              <Button
                variant="neutral"
                size="small"
                svgOnly
                className="shrink-0 bg-transparent hover:bg-bg-neutral-weak"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-3.5"
                  aria-hidden="true"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </Button>
            </Popover.Close>
          </div>
          <div
            role="radiogroup"
            aria-label={`${label} 팔레트`}
            className="grid grid-cols-4 gap-control"
          >
            {colors.map((color) => (
              <label
                key={color.value}
                className="flex min-h-control-size cursor-pointer items-center justify-center rounded-control-inset p-0.5 transition-colors duration-150 hover:bg-bg-neutral-weak has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-stroke-focus motion-reduce:transition-none"
              >
                <input
                  type="radio"
                  name={`${id}-palette`}
                  value={color.value}
                  checked={value.toLowerCase() === color.value}
                  aria-label={`${color.label} ${color.value}`}
                  className="sr-only"
                  onChange={() => {
                    setDraft(null);
                    onChange(color.value);
                  }}
                />
                <span
                  className={`flex size-8 items-center justify-center rounded-control-inset ${color.value === "#ffffff" ? "border border-stroke-neutral text-black" : "text-white"}`}
                  style={{ backgroundColor: color.value }}
                >
                  {value.toLowerCase() === color.value && (
                    <CheckIcon className="size-4" aria-hidden="true" />
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="space-y-control">
            <label htmlFor={id} className="block text-caption text-fg-neutral-muted">
              HEX
            </label>
            <div className="flex items-center gap-control rounded-control bg-bg-neutral-weak p-1">
              <Input
                type="color"
                aria-label={`${label} 직접 선택`}
                value={value}
                onChange={(event) => {
                  setDraft(null);
                  onChange(event.target.value);
                }}
                className="size-8 shrink-0 cursor-pointer rounded-control-inset border-0 bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-control-inset [&::-webkit-color-swatch]:border-stroke-neutral [&::-moz-color-swatch]:rounded-control-inset [&::-moz-color-swatch]:border-stroke-neutral"
              />
              <Input
                id={id}
                aria-label={`${label} HEX`}
                aria-invalid={invalid}
                aria-describedby={invalid ? `${id}-error` : undefined}
                value={draft ?? value}
                spellCheck={false}
                autoComplete="off"
                maxLength={7}
                onChange={(event) => {
                  const text = event.target.value;
                  setDraft(text);
                  if (/^#?[\da-f]{6}$/i.test(text))
                    onChange(`#${text.replace(/^#/, "").toLowerCase()}`);
                }}
                onBlur={() => setDraft(null)}
                className="flex-1 border-0 bg-transparent tabular-nums"
              />
            </div>
            {invalid && (
              <p id={`${id}-error`} className="text-caption text-fg-critical">
                6자리 HEX 색상을 입력해 주세요.
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Provider>
    </Popover>
  );
}
