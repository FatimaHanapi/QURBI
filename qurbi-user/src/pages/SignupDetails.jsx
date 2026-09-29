import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, Phone, Check, ArrowRight, CircleAlert } from "lucide-react";
import { useUserProfile } from "@/lib/user-profile-context";
import { useAuth } from "@/lib/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import OnboardingSteps from "@/components/account/OnboardingSteps";
import { primaryBtn } from "@/components/account/buttons";
import { safeReturnTo } from "@/lib/authReturnTo";

const inputCls =
  "block w-full min-h-12 rounded-xl border-2 bg-[#FFFFFF] py-3 pl-11 pr-3 text-base text-[#41362D] placeholder:text-[#6B594A]/55 outline-none transition-all focus:border-[#6B594A]";

export default function SignupDetails() {
  const { t } = useTranslation("auth");
  const { t: ta } = useTranslation("account");
  const { profile, updateProfile } = useUserProfile();
  const { user, authChecked, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const returnTo = safeReturnTo();
  const [form, setForm] = useState({
    name: profile.name || user?.full_name || "",
    phone: profile.phone || "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", phone: "" });

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [k]: value }));
    if (fieldErrors[k]) setFieldErrors((p) => ({ ...p, [k]: "" }));
  };

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || profile.name || user?.full_name || "",
      phone: current.phone || profile.phone || user?.phone || "",
    }));
  }, [profile.name, profile.phone, user]);

  const handleSave = async () => {
    if (saving) return;
    const errors = {
      name: form.name.trim() ? "" : t("signupDetails.errorNameRequired"),
      phone: form.phone.replace(/\D/g, "").length < 7 ? t("signupDetails.errorPhoneInvalid") : "",
    };
    setFieldErrors(errors);
    if (errors.name || errors.phone) {
      document.getElementById(errors.name ? "signup-name" : "signup-phone")?.focus();
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await updateProfile({ name: form.name, phone: form.phone });
      setSaved(true);
      setTimeout(
        () => navigate(`/address-book?onboarding=1&returnTo=${encodeURIComponent(returnTo)}`, { replace: true }),
        500,
      );
    } catch (error) {
      setSaveError(error.message || t("signupDetails.errorSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (authChecked && !isAuthenticated) {
    return <Navigate to="/auth?mode=register" replace />;
  }

  if (authChecked && isAuthenticated &&
      (!user?.privacyPolicyAcceptedAt || !user?.userAgreementAcceptedAt)) {
    return <Navigate to={`/user-agreement?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  const errorLine = (id, message) =>
    message ? (
      <p id={id} className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#9A2E0C]">
        <CircleAlert className="h-4 w-4 flex-none" aria-hidden="true" /> {message}
      </p>
    ) : null;

  return (
    <AuthLayout
      mode="register"
      icon={User}
      title={t("signupDetails.title")}
      subtitle={t("signupDetails.subtitleComplete")}
    >
      <OnboardingSteps current="details" />
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <div>
          <label htmlFor="signup-name" className="block text-sm font-bold text-[#41362D]">
            {t("signupDetails.nameLabel")} <span className="text-[#9A2E0C]">*</span>
          </label>
          <div className="relative mt-1.5">
            <User className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B594A]" aria-hidden="true" />
            <input
              id="signup-name"
              value={form.name}
              onChange={set("name")}
              autoComplete="name"
              placeholder={t("signupDetails.namePlaceholder")}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
              className={`${inputCls} ${fieldErrors.name ? "border-[#B42318]" : "border-[#E3C19F]"}`}
            />
          </div>
          {errorLine("signup-name-error", fieldErrors.name)}
        </div>
        <div>
          <label htmlFor="signup-phone" className="block text-sm font-bold text-[#41362D]">
            {t("signupDetails.phoneLabel")} <span className="text-[#9A2E0C]">*</span>
          </label>
          <div className="relative mt-1.5">
            <Phone className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B594A]" aria-hidden="true" />
            <input
              id="signup-phone"
              value={form.phone}
              onChange={set("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("signupDetails.phonePlaceholder")}
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "signup-phone-error" : "signup-phone-help"}
              className={`${inputCls} ${fieldErrors.phone ? "border-[#B42318]" : "border-[#E3C19F]"}`}
            />
          </div>
          {fieldErrors.phone ? (
            errorLine("signup-phone-error", fieldErrors.phone)
          ) : (
            <p id="signup-phone-help" className="mt-1 text-[13px] text-[#5A493C]">
              {ta("onboarding.phoneHelp")}
            </p>
          )}
        </div>
        {saveError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE4E1] px-3 py-2.5 text-sm font-semibold text-[#8A1C12]">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> {saveError}
          </p>
        )}
        <button type="submit" disabled={saving} className={`${primaryBtn} mt-1 w-full`}>
          {saving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
              {t("signupDetails.saving")}
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" /> {t("signupDetails.saved")}
            </>
          ) : (
            <>
              {t("signupDetails.saveAndContinue")} <ArrowRight className="h-4 w-4 text-white" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
