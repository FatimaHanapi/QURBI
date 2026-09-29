import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, ChevronDown, CircleAlert, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import apiClient from "@/api/apiClient";
import AuthLayout from "@/components/AuthLayout";
import OnboardingSteps from "@/components/account/OnboardingSteps";
import { lightBtn } from "@/components/account/buttons";
import { useAuth } from "@/lib/AuthContext";
import { safeReturnTo } from "@/lib/authReturnTo";
import { formatOrderDate } from "@/lib/order-date";

const AGREEMENTS_VERSION = "2026-09-20";

const SECTIONS = [
  { id: "agreement", icon: FileText },
  { id: "privacy", icon: LockKeyhole },
];

const CONFIRMATIONS = ["agreement", "privacy", "adult"];

export default function UserAgreement() {
  const { t } = useTranslation("account");
  const { user, authChecked, isAuthenticated, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const returnTo = safeReturnTo();
  const [expanded, setExpanded] = useState({ agreement: true, privacy: false });
  const [accepted, setAccepted] = useState({ agreement: false, privacy: false, adult: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);

  if (authChecked && !isAuthenticated) {
    return <Navigate to={`/auth?mode=register&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  // Previously an already-accepted buyer was always bounced to /signup-details
  // (even with a phone number saved). Show the terms read-only instead and let
  // "Continue" skip any onboarding step that is already done.
  const alreadyAccepted = Boolean(authChecked && user?.privacyPolicyAcceptedAt && user?.userAgreementAcceptedAt);
  const continueTarget = user?.phone
    ? returnTo
    : `/signup-details?returnTo=${encodeURIComponent(returnTo)}`;

  const allAccepted = accepted.agreement && accepted.privacy && accepted.adult;

  const acceptAll = async () => {
    if (saving) return;
    if (!allAccepted) {
      setTriedSubmit(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiClient.post("/users/me/agreements", {
        acceptPrivacyPolicy: true,
        acceptUserAgreement: true,
        confirmAdult: true,
        version: AGREEMENTS_VERSION,
      });
      await checkUserAuth();
      navigate(`/signup-details?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || t("agreement.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const acceptedOn = alreadyAccepted ? formatOrderDate(user.userAgreementAcceptedAt) : "";

  return (
    <AuthLayout
      mode="register"
      icon={ShieldCheck}
      iconClassName="text-[#E3C19F]"
      cardClassName="max-w-2xl"
      titleClassName="text-3xl"
      title={alreadyAccepted ? t("agreement.acceptedTitle") : t("agreement.title")}
      subtitle={alreadyAccepted ? t("agreement.acceptedSubtitle") : t("agreement.subtitle")}
    >
      {!alreadyAccepted && <OnboardingSteps current="agreement" />}
      <div className="space-y-4 rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-4 text-white sm:p-5">
        {alreadyAccepted ? (
          <p className="flex items-start gap-2 rounded-xl bg-[#E3F4E8] px-3 py-3 text-[15px] font-semibold text-[#1E5A32]">
            <Check className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
            {t("agreement.acceptedOn", { date: acceptedOn })}
          </p>
        ) : (
          <p className="text-[15px] leading-7 text-white/90">
            {t("agreement.intro")}
          </p>
        )}

        {SECTIONS.map(({ id, icon: Icon }) => {
          const points = /** @type {string[]} */ (t(`agreement.sections.${id}.points`, { returnObjects: true }));
          return (
            <section key={id} className="overflow-hidden rounded-xl border border-white/20 bg-white/10">
              <button
                type="button"
                onClick={() => setExpanded((current) => ({ ...current, [id]: !current[id] }))}
                className="flex min-h-14 w-full items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3C19F]"
                aria-expanded={expanded[id]}
                aria-controls={`agreement-${id}`}
              >
                <Icon className="h-5 w-5 shrink-0 text-[#E3C19F]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-white sm:text-lg">{t(`agreement.sections.${id}.title`)}</span>
                  <span className="mt-1 block text-sm leading-6 text-white/80">{t(`agreement.sections.${id}.summary`)}</span>
                </span>
                <span className="flex flex-none items-center gap-1 text-sm font-semibold text-[#E3C19F]">
                  <span className="sr-only sm:not-sr-only">{expanded[id] ? t("agreement.hide") : t("agreement.read")}</span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${expanded[id] ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </span>
              </button>
              {expanded[id] && (
                <ul id={`agreement-${id}`} className="space-y-3 border-t border-white/15 px-5 py-4 text-base leading-7 text-white/90">
                  {(Array.isArray(points) ? points : []).map((point) => <li key={point} className="ml-4 list-disc">{point}</li>)}
                </ul>
              )}
            </section>
          );
        })}

        {!alreadyAccepted && (
          <fieldset className="space-y-3">
            <legend className="mb-2 text-base font-bold text-white">{t("agreement.confirmHeading")}</legend>
            {CONFIRMATIONS.map((key) => {
              const missing = triedSubmit && !accepted[key];
              return (
                <label
                  key={key}
                  className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 text-base leading-7 ${accepted[key] ? "border-[#E3C19F] bg-white/15" : missing ? "border-[#F6B7AE] bg-white/10" : "border-white/20 bg-white/10"}`}
                >
                  <input
                    type="checkbox"
                    checked={accepted[key]}
                    onChange={(event) => setAccepted((current) => ({ ...current, [key]: event.target.checked }))}
                    className="mt-1 h-6 w-6 shrink-0 accent-[#E3C19F]"
                  />
                  <span>{t(`agreement.confirm.${key}`)}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        {!alreadyAccepted && triedSubmit && !allAccepted && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE4E1] px-3 py-2.5 text-sm font-semibold text-[#8A1C12]">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> {t("agreement.tickAll")}
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE4E1] px-3 py-2.5 text-sm font-semibold text-[#8A1C12]">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> {error}
          </p>
        )}

        {alreadyAccepted ? (
          <button
            type="button"
            onClick={() => navigate(continueTarget, { replace: true })}
            className={`${lightBtn} w-full`}
          >
            {t("agreement.continue")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            aria-disabled={!allAccepted}
            onClick={acceptAll}
            className={`${lightBtn} w-full ${allAccepted ? "" : "opacity-60"}`}
          >
            {saving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#41362D]/30 border-t-[#41362D]" aria-hidden="true" />
                {t("agreement.saving")}
              </>
            ) : (
              <>
                <Check className="h-5 w-5" aria-hidden="true" /> {t("agreement.acceptAll")}
              </>
            )}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
