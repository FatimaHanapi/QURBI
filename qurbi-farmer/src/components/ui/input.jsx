import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(
  /**
   * @param {React.ComponentPropsWithoutRef<"input">} props
   * @param {React.ForwardedRef<React.ElementRef<"input">>} ref
   */
  ({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-input bg-card/80 px-4 py-2 text-base shadow-[0_2px_8px_rgba(65,54,45,0.035)] transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
