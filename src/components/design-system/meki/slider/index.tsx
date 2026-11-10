import { Range, Root, Thumb, Track } from "@radix-ui/react-slider";
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";
import { forwardRef } from "react";

import { cn } from "../cn";

const renderSlider = function renderSlider(
  {
    className,
    id,
    "aria-label": label,
    "aria-valuetext": valueText,
    ...props
  }: ComponentPropsWithoutRef<typeof Root>,
  ref: Ref<ComponentRef<typeof Root>>,
) {
  return (
    <Root
      data-slider-root=""
      className={cn(
        "relative flex h-5 w-full cursor-pointer touch-none select-none items-center",
        className,
      )}
      ref={ref}
      {...props}
    >
      <Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-neutral-200">
        <Range className="absolute h-full bg-neutral-600" />
      </Track>
      <Thumb
        id={id}
        aria-label={label}
        aria-valuetext={valueText}
        className="block h-5 w-5 cursor-grab rounded-full border border-neutral-200 bg-bg-layer-default shadow-md transition-colors duration-150 motion-reduce:transition-none hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
      />
    </Root>
  );
};

const Slider = forwardRef<ComponentRef<typeof Root>, ComponentPropsWithoutRef<typeof Root>>(
  renderSlider,
);
Slider.displayName = Root.displayName;

export { Slider };
