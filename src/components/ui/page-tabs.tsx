import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Classic blue page tabs with the upstream keyboard and tabpanel contract.
 */
export interface PageTabItem<T extends string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface PageTabsProps<T extends string> {
  items: PageTabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  "aria-label": string;
  /** 页签行右侧的附加内容（筛选、操作按钮） */
  trailing?: React.ReactNode;
  /** 给 tab 按钮生成 id，方便 tabpanel 用 aria-labelledby 指回来 */
  idPrefix?: string;
  /** 与 tabpanel 关联时传入 */
  controls?: string;
  /**
   * default: primary navigation (40px); sm: nested navigation (36px).
   */
  size?: "default" | "sm";
  className?: string;
}

export function PageTabs<T extends string>({
  items,
  value,
  onValueChange,
  trailing,
  idPrefix,
  controls,
  size = "default",
  className,
  ...rest
}: PageTabsProps<T>) {
  const small = size === "sm";
  const refs = React.useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const enabled = items.filter((item) => !item.disabled);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (enabled.length === 0) return;
    const index = enabled.findIndex((item) => item.value === value);
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const target = enabled[next].value;
    onValueChange(target);
    refs.current[target]?.focus();
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="tablist"
        aria-label={rest["aria-label"]}
        className={cn(
          "inline-flex items-center gap-1 rounded-xl bg-muted p-1",
          small ? "min-h-9" : "min-h-10",
        )}
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              ref={(element) => {
                refs.current[item.value] = element;
              }}
              type="button"
              role="tab"
              id={idPrefix ? `${idPrefix}-${item.value}` : undefined}
              aria-selected={selected}
              aria-controls={controls}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onValueChange(item.value)}
              onKeyDown={onKeyDown}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                small ? "h-7 text-caption" : "h-8 min-w-[120px] text-body",
                selected
                  ? "bg-action font-semibold text-action-fg shadow-sm"
                  : "font-medium text-fg-2 hover:bg-muted hover:text-fg-1",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {trailing && (
        <>
          <div className="flex-1" />
          <div className="flex h-full items-center">{trailing}</div>
        </>
      )}
    </div>
  );
}
