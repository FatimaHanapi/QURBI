import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useReveal } from "@/hooks/useReveal";

export default function PrivacyPolicy() {
  const { reveal } = useReveal();
  const { t } = useTranslation("profile");
  const sections = /** @type {Array<{ title: string, body: string[] }>} */ (
    t("privacyPolicy.sections", { returnObjects: true })
  );
  return (
    <div className="aisyah-page">
      <AppHeader
        title={t("privacyPolicy.pageTitle")}
        backTo="/profile"
        subtitle={t("privacyPolicy.pageSubtitle")}
      />
      <div className="aisyah-content mx-auto max-w-2xl space-y-4">
        <div
          className={`rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-4 flex items-start gap-3 ${reveal()}`}
          style={{ animationDelay: "80ms" }}
        >
          <ShieldCheck className="h-5 w-5 text-[#F7EDE2] flex-shrink-0 mt-0.5" />
          <p className="text-[15px] leading-relaxed text-white/90">
            {t("privacyPolicy.intro")}
          </p>
        </div>

        {sections.map((section, index) => (
          <div
            key={section.title}
            className="aisyah-card rounded-2xl p-4"
            style={{ animationDelay: `${140 + index * 60}ms` }}
          >
            <h2 className="text-base font-bold text-white">{section.title}</h2>
            <ul className="mt-2 space-y-1.5 list-disc pl-4">
              {section.body.map((line) => (
                <li key={line} className="text-[15px] leading-relaxed text-white/90">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <p className="pt-2 text-center text-sm text-[#41362D]/80">
          {t("privacyPolicy.contactQuestion")}{" "}
          <a href="mailto:hello@mycesgroup.com" className="inline-flex min-h-11 items-center font-bold text-[#41362D] underline underline-offset-2">
            hello@mycesgroup.com
          </a>
        </p>
      </div>
    </div>
  );
}
