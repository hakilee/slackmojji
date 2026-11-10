"use client";

import { Content, Provider, Root, Trigger } from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";
import { forwardRef } from "react";

import { cn } from "../cn";
import styles from "../popover/popover.module.css";

export const TooltipProvider = Provider;

export const TooltipImpl = Root;

export const TooltipTrigger = Trigger;

const renderTooltipContent = function renderTooltipContent(
  { className, sideOffset = 4, ...props }: ComponentPropsWithoutRef<typeof Content>,
  ref: Ref<ComponentRef<typeof Content>>,
) {
  return (
    <Content
      className={cn(
        styles.content,
        "z-[var(--z-index-popover)] overflow-hidden rounded-md border border-neutral-100 bg-bg-layer-default px-3 py-1.5 font-medium text-text-primary text-xs shadow-md",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  );
};

export const TooltipContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(renderTooltipContent);
TooltipContent.displayName = Content.displayName;
