import { Content, Item, Portal, Separator } from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";
import { forwardRef } from "react";

import { cn } from "../cn";

import styles from "./dropdown.module.css";

const renderDropdownMenuContent = (
  { className, sideOffset = 4, children, ...props }: ComponentPropsWithoutRef<typeof Content>,
  ref: Ref<ComponentRef<typeof Content>>,
) => (
  <Portal>
    <Content
      className={cn(
        styles.content,
        "min-w-24 rounded-control border border-stroke-neutral bg-bg-layer-default p-0.5",
        className,
      )}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    >
      {children}
    </Content>
  </Portal>
);

export const DropdownMenuContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(renderDropdownMenuContent);
DropdownMenuContent.displayName = Content.displayName;

const renderDropdownMenuItem = (
  { className, ...props }: ComponentPropsWithoutRef<typeof Item>,
  ref: Ref<ComponentRef<typeof Item>>,
) => (
  <Item
    className={cn(
      "flex min-h-9 cursor-pointer select-none items-center rounded-control-inset px-3 py-2 text-sm text-fg-neutral-primary leading-none outline-none transition duration-150",
      "data-highlighted:bg-bg-neutral-weak",
      className,
    )}
    ref={ref}
    {...props}
  />
);

export const DropdownMenuItem = forwardRef<
  ComponentRef<typeof Item>,
  ComponentPropsWithoutRef<typeof Item>
>(renderDropdownMenuItem);
DropdownMenuItem.displayName = Item.displayName;

const renderDropdownMenuSeparator = (
  { className, ...props }: ComponentPropsWithoutRef<typeof Separator>,
  ref: Ref<ComponentRef<typeof Separator>>,
) => (
  <Separator className={cn("h-px w-full border-none bg-divider", className)} ref={ref} {...props} />
);

export const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof Separator>,
  ComponentPropsWithoutRef<typeof Separator>
>(renderDropdownMenuSeparator);
DropdownMenuSeparator.displayName = Separator.displayName;
