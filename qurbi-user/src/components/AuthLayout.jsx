import React from "react";
import { Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AuthLayout({
  mode = "login",
  icon: Icon = null,
  title,
  subtitle,
  footer = null,
  onModeChange = null,
  iconClassName = "text-white",
  cardClassName = "",
  titleClassName = "",
  children,
}) {
  const { t } = useTranslation("auth");
  const isRegister = mode === "register";
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden flex flex-col items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] bg-[#F7EDE2]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] transition-opacity duration-500 ${isRegister ? "opacity-0" : "opacity-100"}`} />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-[#E8C7A5] to-[#F7EDE2] transition-opacity duration-500 ${isRegister ? "opacity-100" : "opacity-0"}`} />
      {/* Brand */}
      <div className="relative z-10 flex items-center gap-2 mb-6 animate-fade-in-up">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#41362D] to-[#6B594A] flex items-center justify-center shadow-md shadow-[#41362D]/20">
          <Leaf className="w-4 h-4 text-white" />
        </div>
        <span className="text-[#41362D] font-bold text-sm tracking-[0.16em]">
          QURBI
        </span>
      </div>

      {/* Title block */}
      <div
        className="relative z-10 text-center mb-5 animate-fade-in-up"
        style={{ animationDelay: "60ms" }}
      >
        {Icon && (
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] shadow-lg shadow-[#41362D]/20">
            <Icon className={`h-7 w-7 ${iconClassName}`} aria-hidden="true" />
          </div>
        )}
        <h1 className={`text-2xl font-bold text-[#41362D] ${titleClassName}`}>{title}</h1>
        {subtitle && <p className="mt-1 max-w-sm text-[15px] text-[#5A493C]">{subtitle}</p>}
      </div>

      {/* Card */}
      <div
        className={`relative z-10 w-full max-w-md bg-[#FFFDF9]/95 rounded-3xl shadow-xl shadow-[#41362D]/15 border border-[#E3C19F] p-5 sm:p-6 animate-fade-in-up ${cardClassName}`}
        style={{ animationDelay: "120ms" }}
      >
        {onModeChange && <div className="mb-5 grid grid-cols-2 rounded-2xl bg-[#41362D]/10 p-1" aria-label={t("authButtons.signIn") + " / " + t("authButtons.signUp")}>
          <button
            type="button"
            onClick={() => onModeChange("login")}
            aria-pressed={!isRegister}
            className={`min-h-11 rounded-xl px-3 py-2 text-center text-sm font-bold transition-all duration-300 ${!isRegister ? "bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-md" : "text-[#6B594A]"}`}
          >
            {t("authButtons.signIn")}
          </button>
          <button
            type="button"
            onClick={() => onModeChange("register")}
            aria-pressed={isRegister}
            className={`min-h-11 rounded-xl px-3 py-2 text-center text-sm font-bold transition-all duration-300 ${isRegister ? "bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-[#41362D] shadow-md" : "text-[#6B594A]"}`}
          >
            {t("authButtons.signUp")}
          </button>
        </div>}
        {children}
      </div>

      {footer && (
        <p
          className="relative z-10 mt-5 text-center text-sm text-[#6B594A] animate-fade-in-up"
          style={{ animationDelay: "180ms" }}
        >
          {footer}
        </p>
      )}
    </div>
  );
}
