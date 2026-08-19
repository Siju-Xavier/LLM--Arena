"use client";

import * as PopoverPrimitive from "radix-ui";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Popover.Root;
const PopoverTrigger = PopoverPrimitive.Popover.Trigger;

function PopoverContent({
  className,
  align = "start",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popover.Content>) {
  return (
    <PopoverPrimitive.Popover.Portal>
      <PopoverPrimitive.Popover.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-80 rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Popover.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
