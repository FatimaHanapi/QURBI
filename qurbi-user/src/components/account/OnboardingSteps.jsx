import React from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const STEPS = ["agreement", "details", "address"];

/**
 * Sign-up progress: Agreement -> Your details -> Address.
 * @param {{ current: "agreement" | "details" | "address" }} props
 */
export default function OnboardingSteps({ current }) {
  const { t } = useTranslation("account");
  const currentIndex = STEPS.indexOf(current);
  return (
    <nav aria-label={t("onboarding.progressLabel")} className="mb-5">
      <p className="mb-2 text-center text-sm font-semibold text-[#5A493C]">
        {t("onboarding.stepOf", { step: currentIndex + 1, total: STEPS.length })}
      </p>
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step} className="flex flex-col items-center gap-1 text-center" aria-current={active ? "step" : undefined}>
              <span
                className={`h-1.5 w-full rounded-full ${done || active ? "bg-[#41362D]" : "bg-[#41362D]/20"}`}
                aria-hidden="true"
              />
              <span className={`flex items-center gap-1 text-[13px] leading-tight ${active ? "font-bold text-[#41362D]" : done ? "font-semibold text-[#41362D]/85" : "text-[#6B594A]"}`}>
                {done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                {t(`onboarding.steps.${step}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
