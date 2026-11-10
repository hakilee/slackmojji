"use client";

import { ChevronDownIcon } from "~/components/design-system/icons";
import {
  Content,
  Icon,
  Item,
  ItemText,
  Portal,
  Root,
  Trigger,
  Viewport,
} from "@radix-ui/react-select";
import type { ComponentPropsWithoutRef, ComponentRef, Ref } from "react";
import { createContext, forwardRef, useContext } from "react";

import { cn } from "../cn";

import styles from "./select.module.css";

export type SelectSize = "x-small" | "small" | "medium";

const SelectSizeContext = createContext<SelectSize>("medium");

const triggerSizes: Record<SelectSize, string> = {
  medium: "mt-1.5 h-9 px-3 rounded-[10px] text-md",
  small: "h-[34px] px-2.5 rounded-[7px] text-sm",
  "x-small": "h-7 px-2 rounded-lg text-[13px]",
};

const iconSizes: Record<SelectSize, number> = {
  medium: 14,
  small: 13,
  "x-small": 12,
};

const itemSizes: Record<SelectSize, string> = {
  medium: "h-8 text-sm",
  small: "h-8 text-sm",
  "x-small": "h-7 text-[13px]",
};

export const SelectTriggerRender = (
  { className, children, ...props }: ComponentPropsWithoutRef<typeof Trigger>,
  ref: Ref<ComponentRef<typeof Trigger>>,
) => {
  const size = useContext(SelectSizeContext);
  return (
    <Trigger
      className={cn(
        "flex cursor-pointer items-center justify-between border border-neutral-200 bg-bg-layer-default text-text-primary",
        "hover:border-neutral-300 focus:border-primary disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        triggerSizes[size],
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
      <Icon asChild>
        <ChevronDownIcon className="text-text-tertiary" size={iconSizes[size]} />
      </Icon>
    </Trigger>
  );
};

const renderSelectContent = function renderSelectContent(
  { className, children, ...props }: ComponentPropsWithoutRef<typeof Content>,
  ref: Ref<ComponentRef<typeof Content>>,
) {
  return (
    <Portal>
      <Content
        className={cn(
          styles.content,
          "w-full min-w-(--radix-select-trigger-width) z-popover max-h-[min(20rem,var(--radix-select-content-available-height))] overflow-y-auto rounded-control bg-bg-layer-default p-0.5 ring-1 ring-inset ring-neutral-200",
          className,
        )}
        position="popper"
        ref={ref}
        sideOffset={4}
        {...props}
      >
        <Viewport className="w-full">{children}</Viewport>
      </Content>
    </Portal>
  );
};

export const SelectItemRender = (
  { className, children, value, ...props }: ComponentPropsWithoutRef<typeof Item>,
  ref: Ref<ComponentRef<typeof Item>>,
) => {
  const size = useContext(SelectSizeContext);
  return (
    <Item
      className={cn(
        "flex cursor-pointer select-none items-center rounded-control-inset px-2 text-text-primary leading-none outline-none transition duration-150",
        "data-[highlighted]:bg-black/5 data-[state=checked]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        itemSizes[size],
        className,
      )}
      ref={ref}
      value={value}
      {...props}
    >
      <ItemText>{children}</ItemText>
    </Item>
  );
};

export const SelectTrigger = forwardRef<
  ComponentRef<typeof Trigger>,
  ComponentPropsWithoutRef<typeof Trigger>
>(SelectTriggerRender);
SelectTrigger.displayName = Trigger.displayName;

export const SelectContent = forwardRef<
  ComponentRef<typeof Content>,
  ComponentPropsWithoutRef<typeof Content>
>(renderSelectContent);
SelectContent.displayName = Content.displayName;

export const SelectItem = forwardRef<
  ComponentRef<typeof Item>,
  ComponentPropsWithoutRef<typeof Item>
>(SelectItemRender);
SelectItem.displayName = Item.displayName;

export const SelectRoot = ({
  size = "medium",
  ...props
}: ComponentPropsWithoutRef<typeof Root> & { size?: SelectSize }) => (
  <SelectSizeContext.Provider value={size}>
    <Root {...props} />
  </SelectSizeContext.Provider>
);
