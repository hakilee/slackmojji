import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";

import { cn } from "./cn";

import { sizes } from "./input-sizes";
import type { InputSize } from "./input-sizes";
export type { InputSize } from "./input-sizes";

type InputProps = Omit<ComponentPropsWithoutRef<"input">, "size"> & {
  size?: InputSize;
};

const InputComponent = (
  { className, size = "medium", ...props }: InputProps,
  ref: React.Ref<HTMLInputElement>,
) => (
  <input
    className={cn(
      "block min-w-0 w-full border border-neutral-200 bg-bg-layer-default text-text-primary transition-colors duration-150 motion-reduce:transition-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 aria-invalid:border-fg-critical file:mr-2 file:cursor-pointer file:rounded-[7px] file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:font-medium",
      "hover:border-neutral-300 focus:border-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
      sizes[size],
      className,
    )}
    ref={ref}
    {...props}
  />
);

export const Input = forwardRef<HTMLInputElement, InputProps>(InputComponent);
Input.displayName = "Input";
