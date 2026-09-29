import React from "react";

/**
 * @param {{ icon: React.ElementType, title: React.ReactNode, subtitle?: React.ReactNode, footer?: React.ReactNode, children?: React.ReactNode }} props
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="brand-hero relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[1.25rem_1.25rem_1.25rem_.45rem] bg-secondary shadow-lg">
            <Icon className="h-7 w-7 text-secondary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-white/85">{subtitle}</p>}
        </div>
        <div className="rounded-[1.75rem] border border-white/35 bg-card/95 p-6 shadow-[0_18px_50px_rgba(35,28,23,0.25)] backdrop-blur sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="mt-6 text-center text-sm text-white/85">{footer}</p>
        )}
      </div>
    </div>
  );
}
