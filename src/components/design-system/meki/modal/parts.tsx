import { Content, Overlay, Portal, Title } from "@radix-ui/react-dialog";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { forwardRef } from "react";

import { cn } from "../cn";

import styles from "./modal.module.css";

const renderModalContent = (
  { className, children, ...props }: ComponentPropsWithoutRef<typeof Content>,
  ref: React.Ref<ComponentRef<typeof Content>>,
) => (
  <Portal>
    <div className="pointer-events-none fixed inset-0 isolate z-modal">
      <Overlay
        className={cn(styles.overlay, "pointer-events-auto absolute inset-0 bg-bg-overlay")}
      />
      <Content
        className={cn(
          styles.content,
          "pointer-events-auto absolute flex max-h-[85vh] w-full max-w-240 flex-col overflow-hidden rounded-2xl bg-bg-layer-default p-6 shadow-[0_1px_0_rgba(0,0,0,0.05)]",
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Content>
    </div>
  </Portal>
);

export const ModalContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(renderModalContent);
ModalContent.displayName = Content.displayName;

const renderModalTitle = (
  { className, children, ...props }: ComponentPropsWithoutRef<typeof Title>,
  ref: React.Ref<ComponentRef<typeof Title>>,
) => (
  <Title className={cn("font-semibold text-text-primary text-xl", className)} ref={ref} {...props}>
    {children}
  </Title>
);

export const ModalTitle = forwardRef<
  ComponentRef<typeof Title>,
  ComponentPropsWithoutRef<typeof Title>
>(renderModalTitle);
ModalTitle.displayName = Title.displayName;
