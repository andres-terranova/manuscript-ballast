import * as React from "react"
import { cn } from "@/lib/utils"

const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("inline-flex rounded-md shadow-sm", className)}
    role="group"
    {...props}
  />
))
ButtonGroup.displayName = "ButtonGroup"

const ButtonGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    position?: "first" | "middle" | "last" | "only"
  }
>(({ className, position = "middle", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:pointer-events-none disabled:opacity-50",
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      "px-3 py-2",
      // Border radius based on position
      {
        "rounded-l-md": position === "first" || position === "only",
        "rounded-r-md": position === "last" || position === "only",
        "rounded-none": position === "middle",
        "-ml-px": position === "middle" || position === "last",
      },
      className
    )}
    {...props}
  />
))
ButtonGroupItem.displayName = "ButtonGroupItem"

export { ButtonGroup, ButtonGroupItem }
