import React from "react";
import { useTranslation } from "react-i18next";
import { Mail, LifeBuoy } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useReveal } from "@/hooks/useReveal";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const SUPPORT_EMAIL = "hello@mycesgroup.com";

export default function CustomerSupport() {
  const { reveal } = useReveal();
  const { t } = useTranslation("profile");
  const faqs = /** @type {Array<{ q: string, a: string }>} */ (
    t("customerSupport.faqs", { returnObjects: true })
  );
  return (
    <div className="aisyah-page">
      <AppHeader
        title={t("customerSupport.pageTitle")}
        backTo="/profile"
        subtitle={t("customerSupport.pageSubtitle")}
      />
      <div className="aisyah-content mx-auto max-w-2xl space-y-4">
        <div
          className={`rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-4 flex items-center gap-4 ${reveal()}`}
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
            <LifeBuoy className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{t("customerSupport.needAHand")}</p>
            <p className="text-sm text-white/85">
              {t("customerSupport.needAHandSubtitle")}
            </p>
          </div>
        </div>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="aisyah-card flex min-h-16 w-full items-center gap-4 rounded-2xl p-4 transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]">
            <Mail className="h-5 w-5 text-[#41362D]" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[15px] font-semibold text-white">{t("customerSupport.emailSupport")}</p>
            <p className="break-all text-sm text-white/85">{SUPPORT_EMAIL}</p>
          </div>
        </a>

        <div className="aisyah-card rounded-2xl p-4">
          <h2 className="mb-1 text-base font-bold text-white">
            {t("customerSupport.faqTitle")}
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="min-h-12 text-left text-[15px] text-white">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[15px] leading-relaxed text-white/90">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
