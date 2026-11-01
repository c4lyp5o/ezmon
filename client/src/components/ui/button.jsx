import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// ez house style: pill buttons; the one filled primary is the INK inverted,
// never the accent (which belongs to data).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13px] font-medium transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-ink bg-ink text-bg hover:border-dim hover:bg-dim",
        destructive: "border border-bad/50 bg-transparent text-bad hover:bg-bad-dim",
        outline: "border border-line-strong bg-transparent text-ink hover:bg-hover",
        secondary: "border border-line-strong bg-transparent text-ink hover:bg-hover",
        ghost: "text-mute hover:bg-hover hover:text-ink",
        link: "border-b border-transparent rounded-none px-0.5 text-ink hover:border-accent",
      },
      size: {
        default: "h-[34px] px-4",
        sm: "h-7 gap-1.5 px-3 text-[12px]",
        lg: "h-10 px-6",
        icon: "size-[34px]",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
