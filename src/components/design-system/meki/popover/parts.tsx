"use client";

import { Arrow, Content, Portal, Root, Trigger } from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";
import { forwardRef } from "react";

import { cn } from "../cn";

import styles from "./popover.module.css";

export const PopoverProvider = Portal;

export const PopoverImpl = Root;

export const PopoverTrigger = Trigger;

export const PopoverArrow = Arrow;

const renderPopoverContent = function renderPopoverContent(
  { className, sideOffset = 4, ...props }: ComponentPropsWithoutRef<typeof Content>,
  ref: Ref<ComponentRef<typeof Content>>,
) {
  return (
    <Content
      className={cn(
        styles.content,
        "z-[var(--z-index-popover)] max-w-90 overflow-hidden break-keep rounded-md border border-neutral-100 bg-bg-layer-default px-3 py-1.5 font-medium text-text-primary text-xs shadow-sm",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  );
};

export const PopoverContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(renderPopoverContent);
PopoverContent.displayName = Content.displayName;
