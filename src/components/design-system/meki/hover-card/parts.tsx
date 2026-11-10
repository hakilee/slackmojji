import { Content, Portal } from "@radix-ui/react-hover-card";
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";
import { forwardRef } from "react";

import { cn } from "../cn";

import styles from "./hover-card.module.css";

const renderHoverCardContent = function renderHoverCardContent(
  {
    className,
    sideOffset = 4,
    align = "center",
    ...props
  }: ComponentPropsWithoutRef<typeof Content>,
  ref: Ref<ComponentRef<typeof Content>>,
) {
  return (
    <Portal>
      <Content
        align={align}
        className={cn(
          styles.content,
          "rounded-2xl border border-neutral-100 bg-bg-layer-default shadow-xl outline-none",
          className,
        )}
        ref={ref}
        sideOffset={sideOffset}
        {...props}
      />
    </Portal>
  );
};

export const HoverCardContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(renderHoverCardContent);
HoverCardContent.displayName = Content.displayName;
