import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "./cn";

export type ButtonSize = "medium" | "small" | "x-small";

export type ButtonVariant = "black" | "white" | "neutral";

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
  disabled?: boolean;
  size?: ButtonSize;
  suffix?: ReactNode;
  svgOnly?: boolean;
  variant?: ButtonVariant;
}

const renderButton = (
  {
    asChild,
    className,
    children,
    size = "medium",
    variant = "black",
    disabled = false,
    svgOnly = false,
    suffix,
    ...props
  }: ButtonProps,
  ref: React.Ref<HTMLButtonElement>,
) => {
  const hasSuffix = suffix !== null && suffix !== undefined;

  if (asChild === true && hasSuffix) {
    throw new Error("button: asChild and suffix cannot be used together.");
  }

  const baseStyles =
    "flex items-center justify-center cursor-pointer touch-manipulation gap-2 leading-none transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none [-webkit-tap-highlight-color:transparent]";

  const variantStyles: { style: string; disabledStyle: string } = {
    black: {
      disabledStyle: "bg-neutral-200 text-neutral-400",
      style: "text-fg-on-brand-solid bg-neutral-900 hover:bg-neutral-700",
    },
    neutral: {
      disabledStyle: "text-neutral-300 bg-neutral-100",
      style: "text-neutral-900 bg-neutral-100 hover:bg-neutral-200",
    },
    white: {
      disabledStyle: "text-neutral-300 border border-neutral-200 bg-bg-layer-default",
      style: "text-neutral-900 border border-neutral-200 bg-bg-layer-default hover:bg-neutral-50",
    },
  }[variant];

  const sizeStyles = {
    medium: "px-6 min-w-[40px] min-h-[40px] rounded-xl font-semibold text-sm",
    small: "px-3 min-w-[34px] min-h-[34px] rounded-[7px] font-medium text-sm",
    "x-small":
      "px-2 min-w-[28px] min-h-[28px] rounded-lg font-medium text-[13px] shadow-[0_1px_0_rgba(0,0,0,0.05)]",
  }[size];

  const buttonStyles = cn(
    baseStyles,
    sizeStyles,
    disabled ? variantStyles.disabledStyle : variantStyles.style,
    disabled && "cursor-not-allowed",
    svgOnly && "aspect-square p-0",
    className,
  );

  const Comp = asChild === true ? Slot : "button";

  if (asChild === true) {
    return (
      <Comp className={buttonStyles} disabled={disabled} ref={ref} {...props}>
        {children}
      </Comp>
    );
  }

  return (
    <button className={buttonStyles} disabled={disabled} ref={ref} type="button" {...props}>
      {children}
      {hasSuffix && (
        <>
          <span className="mx-1.5 h-3 border-neutral-200 border-l" />
          <span>{suffix}</span>
        </>
      )}
    </button>
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(renderButton);

Button.displayName = "Button";
