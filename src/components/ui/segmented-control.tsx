import * as React from "react";
import { cn } from "@/lib/utils";
import { SegmentThumb, useSlidingIndicator } from "./sliding-indicator";

/**
 * Classic pill controls: a button group with aria-pressed, not a tablist.
 * Muted track with a raised background-colored selected item.
 * 选中块是一块单独的滑块（SegmentThumb），切换时从上一项滑过去。
 */
export interface SegmentedItem<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{
    className?: string;
    strokeWidth?: number | string;
  }>;
  /** 跟在文字后面的附加内容（例如模式 tab 的「生效中」圆点） */
  trailing?: React.ReactNode;
  /** 选中项以外的附加样式（例如生效但没在看的模式格用模式 soft 底） */
  className?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  items: SegmentedItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  /** 40px for mode navigation; 32px for compact in-panel controls. */
  size?: "md" | "sm";
  className?: string;
}

export function SegmentedControl<T extends string>({
  items,
  value,
  onValueChange,
  size = "md",
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const indicator = useSlidingIndicator<HTMLDivElement>(
    '[aria-pressed="true"]',
    value,
  );
  return (
    <div
      ref={indicator.ref}
      role="group"
      aria-label={rest["aria-label"]}
      className={cn(
        "relative inline-flex items-stretch gap-1 bg-muted p-1",
        size === "md" ? "h-10 rounded-xl" : "h-8 rounded-lg",
        className,
      )}
    >
      <SegmentThumb
        rect={indicator.rect}
        animate={indicator.animate}
        className={size === "md" ? "rounded-lg" : "rounded-md"}
      />
      {items.map((item) => {
        const pressed = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={pressed}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium text-fg-2 transition-colors duration-150 hover:text-fg-1 disabled:cursor-not-allowed disabled:opacity-45",
              size === "md"
                ? "rounded-lg px-3 text-body"
                : "rounded-md px-2.5 text-caption",
              item.className,
              pressed && "text-fg-1",
            )}
          >
            {Icon ? (
              <Icon
                className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"}
                strokeWidth={2}
              />
            ) : null}
            {item.label}
            {item.trailing}
          </button>
        );
      })}
    </div>
  );
}
