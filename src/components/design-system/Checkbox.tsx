import { CheckIcon } from "./icons";

export function Checkbox({
  label,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-control-size cursor-pointer items-center gap-control text-label text-text-secondary has-disabled:cursor-not-allowed has-disabled:text-fg-disabled">
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="peer size-5 cursor-pointer appearance-none rounded-md border border-neutral-300 bg-bg-layer-default transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-100 motion-reduce:transition-none"
        />
        <CheckIcon
          size={16}
          className="pointer-events-none absolute text-fg-on-brand-solid opacity-0 peer-checked:opacity-100 peer-disabled:text-neutral-400"
        />
      </span>
      {label}
    </label>
  );
}
