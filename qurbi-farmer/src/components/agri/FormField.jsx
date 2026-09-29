import React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Labelled form field with optional helper text and an inline error shown
 * directly under the control.
 * @param {{ id?: string, label: React.ReactNode, required?: boolean, optional?: boolean, hint?: React.ReactNode, error?: React.ReactNode, className?: string, children?: React.ReactNode }} props
 */
export default function FormField({ id, label, required = false, optional = false, hint, error, className, children }) {
  return (
    <div id={id ? `field-${id}` : undefined} className={cn("scroll-mt-24 space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive" aria-hidden="true"> *</span>}
        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
      </Label>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-sm font-medium text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-sm leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Scrolls smoothly to the first field wrapper (`field-<id>`) in `ids` that exists. */
export function scrollToField(ids) {
  for (const id of ids) {
    const element = typeof document !== "undefined" ? document.getElementById(`field-${id}`) : null;
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = /** @type {HTMLElement | null} */ (element.querySelector("input:not([type=file]), textarea, button[role=combobox], button"));
      focusable?.focus({ preventScroll: true });
      return;
    }
  }
}
