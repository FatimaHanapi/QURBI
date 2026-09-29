import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(
  /**
   * @param {React.ComponentPropsWithoutRef<"textarea">} props
   * @param {React.ForwardedRef<React.ElementRef<"textarea">>} ref
   */
  ({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-2xl border border-input bg-card/80 px-4 py-3 text-base shadow-[0_2px_8px_rgba(65,54,45,0.035)] transition-all placeholder:text-muted-foreground focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
