import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Classic appearance, preserving all upstream variant names.
        default:
          "border border-transparent bg-action font-semibold text-action-fg hover:bg-action-hover",
        destructive:
          "border border-transparent bg-danger text-white hover:brightness-110",
        outline:
          "border border-border-strong bg-surface text-fg-1 hover:bg-subtle",
        secondary: "text-fg-2 hover:bg-subtle hover:text-fg-1",
        ghost: "text-fg-2 hover:bg-subtle hover:text-fg-1",
        mcp: "border border-transparent bg-emerald-500 font-semibold text-white hover:bg-emerald-600",
        link: "text-action-text underline-offset-4 hover:underline",
        // v4 callers keep their semantic button variants.
        solid:
          "border border-transparent bg-action font-semibold text-action-fg hover:bg-action-hover",
        // 中性描边：卡片上的「切换」「添加」「设为默认」等
        neutral:
          "border border-border-strong bg-surface text-fg-1 hover:bg-subtle disabled:opacity-100 disabled:border-border disabled:bg-transparent disabled:text-fg-3",
        // 透明：页头里带 ⌄ / › 的次要操作
        quiet: "border border-transparent text-fg-1 hover:bg-subtle",
        // 模式色实心：只用于模式切换的主操作
        direct:
          "border border-transparent bg-direct-solid text-direct-on font-semibold hover:brightness-110",
        route:
          "border border-transparent bg-route-solid text-route-on font-semibold hover:brightness-110",
        stack:
          "border border-transparent bg-stack-solid text-stack-on font-semibold hover:brightness-110",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-10 px-8",
        icon: "h-9 w-9 p-0",
        compact: "h-8 px-3 text-sm",
        regular: "h-9 px-4 text-sm",
        "icon-compact": "h-8 w-8 p-0 text-fg-2 hover:text-fg-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
