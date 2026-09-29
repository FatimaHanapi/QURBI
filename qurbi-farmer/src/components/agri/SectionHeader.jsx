import React from "react";
import { cn } from "@/lib/utils";

/**
 * @param {{ title: React.ReactNode, action?: React.ReactNode, className?: string }} props
 */
export default function SectionHeader({ title, action, className }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-lg font-extrabold tracking-tight text-foreground">{title}</h2>
      {action}
    </div>
  );
}
