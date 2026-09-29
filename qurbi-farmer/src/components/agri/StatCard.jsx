import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, tone = "primary", to, className }) {
  const tones = {
    primary: "bg-secondary text-primary",
    success: "bg-emerald-100/80 text-emerald-800",
    warning: "bg-amber-100/80 text-amber-800",
    info: "bg-sky-100/80 text-sky-800",
  };
  const inner = (
    <>
      <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl", tones[tone])}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-semibold leading-tight text-muted-foreground sm:text-sm">{label}</p>
    </>
  );
  const baseClass = cn("soft-card min-w-0 p-3.5 sm:p-4", className);
  if (to) {
    return (
      <Link to={to} className={cn(baseClass, "block transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]")}>
        {inner}
      </Link>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}
