import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared Classic field appearance, retaining v4 invalid and disabled states.
 */
export const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus-visible:outline-none aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:opacity-50";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          fieldClass,
          "flex h-9 py-1 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-fg-1",
          className,
        )}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
