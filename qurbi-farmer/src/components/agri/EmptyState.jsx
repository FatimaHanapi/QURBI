import React from "react";
import { cn } from "@/lib/utils";

/**
 * @param {{ icon?: React.ElementType, title: React.ReactNode, description?: React.ReactNode, action?: React.ReactNode, className?: string }} props
 */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("soft-card flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem_1.4rem_1.4rem_.55rem] bg-secondary text-secondary-foreground">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
