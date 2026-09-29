import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Truck, PackageCheck, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// Preserved stored values: "Self Delivery", "AISYAH Delivery", "Both".
const OPTIONS = [
  {
    value: "Self Delivery",
    label: "Own Delivery",
    description: "You handle delivery directly to the buyer.",
    icon: Truck,
  },
  {
    value: "AISYAH Delivery",
    label: "QURBI Delivery",
    description: "QURBI arranges delivery for you.",
    icon: PackageCheck,
  },
  {
    value: "Both",
    label: "Both Options",
    description: "Buyers can choose either delivery method.",
    icon: Layers,
  },
];

/**
 * @param {{ value?: string, onChange: (value: string) => void, className?: string }} props
 */
export default function DeliveryMethodCards({ value, onChange, className }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className={cn("grid gap-3", className)}>
      {OPTIONS.map(({ value: optionValue, label, description, icon: Icon }) => {
        const selected = value === optionValue;
        return (
          <label
            key={optionValue}
            className={cn(
              "flex min-h-14 items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-card hover:bg-muted/50"
            )}
          >
            <RadioGroupItem value={optionValue} id={`dm-${optionValue}`} className="mt-1" />
            <span
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-sm text-muted-foreground leading-snug mt-0.5">{description}</span>
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
