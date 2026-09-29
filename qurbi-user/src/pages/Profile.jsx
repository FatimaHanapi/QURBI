import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  User,
  MapPin,
  Package,
  Check,
  Pencil,
  X,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
  LifeBuoy,
  Languages,
} from "lucide-react";
import { useUserProfile } from "@/lib/user-profile-context";
import { useReveal } from "@/hooks/useReveal";
import AuthButtons from "@/components/AuthButtons";
import AppHeader from "@/components/AppHeader";
import PageLoading from "@/components/PageLoading";
import { useHeaderTransition } from "@/components/HeaderTransitionProvider";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuth } from "@/lib/AuthContext";
import AuthRequiredState from "@/components/AuthRequiredState";
import { SettingsGroup, SettingsRow } from "@/components/account/SettingsGroup";
import { primaryBtn } from "@/components/account/buttons";

export default function Profile() {
  const { navigateFromIconPage } = useHeaderTransition();
  const requireAuth = useRequireAuth();
  const { authChecked, isAuthenticated } = useAuth();
  const { profile, profileLoading, updateProfile } = useUserProfile();
  const { reveal } = useReveal();
  const { t, i18n } = useTranslation("profile");
  const { t: ta } = useTranslation("account");
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", phone: "" });
  const [showEdit, setShowEdit] = useState(false);

  const inputCls =
    "mt-1.5 w-full min-h-12 rounded-xl border-2 border-[#E3C19F] bg-[#FFFFFF] px-4 py-3 text-base text-[#41362D] placeholder:text-[#6B594A]/60 outline-none focus:border-[#6B594A]";
  const labelCls = "block text-sm font-bold text-[#41362D]";
  const errorCls = "mt-1 text-sm font-semibold text-[#9A2E0C]";

  const handleSave = async () => {
    if (saving) return;
    const errors = {
      name: form.name?.trim() ? "" : ta("profile.nameRequired"),
      phone:
        form.phone && form.phone.replace(/\D/g, "").length < 7
          ? ta("profile.phoneInvalid")
          : "",
    };
    setFieldErrors(errors);
    if (errors.name || errors.phone) return;
    setSaving(true);
    setSaveError("");
    try {
      await updateProfile({ name: form.name, phone: form.phone });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setShowEdit(false);
      }, 1200);
    } catch (error) {
      setSaveError(error.message || t("profile.editModal.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    requireAuth(() => {
      setForm(profile);
      setFieldErrors({ name: "", phone: "" });
      setSaveError("");
      setShowEdit(true);
    });
  };

  if (!authChecked || profileLoading) {
    return (
      <div className="aisyah-page">
        <AppHeader
          title={t("profile.pageTitle")}
          subtitle={t("profile.pageSubtitle")}
        />
        <PageLoading contentOnly message={t("profile.loading")} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredState
        title={t("profile.pageTitle")}
        message={t("profile.authRequiredMessage")}
        returnTo="/profile"
      />
    );
  }

  const infoRows = [
    { icon: User, label: t("profile.accountInfo.name"), value: profile.name },
    { icon: Mail, label: t("profile.accountInfo.email"), value: profile.email },
    { icon: Phone, label: t("profile.accountInfo.phone"), value: profile.phone },
  ];
  const languages = [
    { code: "en", label: t("language.english") },
    { code: "ms", label: t("language.malay") },
  ];

  return (
    <div className="aisyah-page">
      <style>{`
        @keyframes profileFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes profilePopIn {
          0% { opacity: 0; transform: translateY(16px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .profile-backdrop { animation: profileFadeIn 0.25s ease-out both; }
        .profile-modal { animation: profilePopIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .profile-backdrop, .profile-modal { animation: none; }
        }
      `}</style>
      <AppHeader
        title={t("profile.pageTitle")}
        subtitle={t("profile.pageSubtitle")}
      />

      <div className="aisyah-content mx-auto max-w-2xl space-y-6">
        {/* Account */}
        <section
          className={reveal()}
          style={{ animationDelay: "80ms" }}
          aria-labelledby="account-group-title"
        >
          <h2 id="account-group-title" className="mb-2 px-1 text-sm font-bold text-[#41362D]/80">
            {ta("profile.groups.account")}
          </h2>
          <div className="aisyah-card overflow-hidden rounded-2xl">
            <div className="flex items-center gap-4 p-4">
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-white/15">
                <User className="h-7 w-7 text-white" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-lg font-bold text-white">
                  {profile.name || t("profile.guestBuyer")}
                </p>
                <p className="break-all text-sm text-white/80">
                  {profile.email || t("profile.noEmailSet")}
                </p>
              </div>
            </div>
            <dl className="divide-y divide-white/15 border-t border-white/15">
              {infoRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3">
                  <Icon className="h-5 w-5 flex-none text-[#E3C19F]" aria-hidden="true" />
                  <dt className="w-16 flex-none text-sm text-white/75">{label}</dt>
                  <dd className="min-w-0 flex-1 break-words text-[15px] font-medium text-white [overflow-wrap:anywhere]">
                    {value || ta("profile.notSet")}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-white/15 p-3">
              <button
                type="button"
                onClick={openEdit}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-4 text-[15px] font-bold text-[#41362D]"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" /> {ta("profile.editDetails")}
              </button>
            </div>
          </div>
        </section>

        {/* Edit popup */}
        {showEdit && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm profile-backdrop"
              onClick={() => !saving && setShowEdit(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pointer-events-none">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-profile-title"
                className="w-full max-w-sm rounded-3xl border border-[#E3C19F] bg-[#FFFDF9] shadow-2xl pointer-events-auto profile-modal"
              >
                <div className="flex items-center justify-between border-b border-[#E3C19F] px-5 py-3">
                  <h3 id="edit-profile-title" className="text-lg font-bold text-[#41362D]">
                    {t("profile.editModal.title")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    aria-label={ta("profile.closeEdit")}
                    className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-[#41362D] hover:bg-[#F7EDE2]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form
                  className="space-y-4 p-5"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSave();
                  }}
                >
                  <div>
                    <label htmlFor="profile-name" className={labelCls}>
                      {t("profile.accountInfo.name")} <span className="text-[#9A2E0C]">*</span>
                    </label>
                    <input
                      id="profile-name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder={t("profile.editModal.fullNamePlaceholder")}
                      autoComplete="name"
                      aria-invalid={Boolean(fieldErrors.name)}
                      className={inputCls}
                    />
                    {fieldErrors.name && <p className={errorCls}>{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="profile-email" className={labelCls}>
                      {t("profile.accountInfo.email")}
                    </label>
                    <input
                      id="profile-email"
                      value={profile.email}
                      placeholder={t("profile.editModal.emailPlaceholder")}
                      type="email"
                      readOnly
                      aria-readonly="true"
                      aria-describedby="profile-email-help"
                      className="mt-1.5 w-full min-h-12 cursor-not-allowed rounded-xl border-2 border-[#E3C19F] bg-[#F7EDE2] px-4 py-3 text-base text-[#41362D]/80"
                    />
                    <p id="profile-email-help" className="mt-1 text-[13px] text-[#5A493C]">
                      {ta("profile.emailLocked")}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="profile-phone" className={labelCls}>
                      {t("profile.accountInfo.phone")}
                    </label>
                    <input
                      id="profile-phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      placeholder={t("profile.editModal.phonePlaceholder")}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      aria-invalid={Boolean(fieldErrors.phone)}
                      className={inputCls}
                    />
                    {fieldErrors.phone && <p className={errorCls}>{fieldErrors.phone}</p>}
                  </div>
                  {saveError && (
                    <p role="alert" className="rounded-xl bg-[#FBE4E1] px-3 py-2 text-center text-sm font-semibold text-[#8A1C12]">
                      {saveError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className={`${primaryBtn} w-full`}
                  >
                    {saving ? (
                      t("profile.editModal.saving")
                    ) : saved ? (
                      <>
                        <Check className="w-4 h-4" /> {t("profile.editModal.saved")}
                      </>
                    ) : (
                      t("profile.editModal.saveChanges")
                    )}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}

        {/* Orders & delivery */}
        <SettingsGroup
          title={ta("profile.groups.ordersDelivery")}
          className={reveal()}
          style={{ animationDelay: "140ms" }}
        >
          <SettingsRow
            icon={MapPin}
            title={t("profile.addressBookCard.title")}
            subtitle={t("profile.addressBookCard.subtitle")}
            onClick={() => requireAuth(() => navigateFromIconPage("/address-book"))}
          />
          <SettingsRow
            icon={Package}
            title={t("profile.orderHistoryCard.title")}
            subtitle={t("profile.orderHistoryCard.subtitle")}
            onClick={() => requireAuth(() => navigateFromIconPage("/history"))}
          />
        </SettingsGroup>

        {/* Language */}
        <section
          className={reveal()}
          style={{ animationDelay: "200ms" }}
          aria-labelledby="language-title"
        >
          <h2 id="language-title" className="mb-2 px-1 text-sm font-bold text-[#41362D]/80">
            {t("language.title")}
          </h2>
          <div className="aisyah-card rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]">
                <Languages className="h-5 w-5 text-[#41362D]" aria-hidden="true" />
              </span>
              <p className="text-sm text-white/85">{t("language.subtitle")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="language-title">
              {languages.map(({ code, label }) => {
                const selected = i18n.resolvedLanguage === code;
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => i18n.changeLanguage(code)}
                    className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border-2 px-2 text-[15px] font-bold transition-colors ${selected ? "border-[#E3C19F] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-[#41362D]" : "border-white/25 bg-white/10 text-white"}`}
                  >
                    {selected && <Check className="h-4 w-4 flex-none" aria-hidden="true" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Help & legal */}
        <SettingsGroup
          title={ta("profile.groups.helpLegal")}
          className={reveal()}
          style={{ animationDelay: "260ms" }}
        >
          <SettingsRow
            icon={LifeBuoy}
            title={t("profile.customerSupportCard.title")}
            subtitle={t("profile.customerSupportCard.subtitle")}
            onClick={() => navigateFromIconPage("/support")}
          />
          <SettingsRow
            icon={ShieldCheck}
            title={t("profile.privacyPolicyCard.title")}
            subtitle={t("profile.privacyPolicyCard.subtitle")}
            onClick={() => navigateFromIconPage("/privacy-policy")}
          />
          <SettingsRow
            icon={FileText}
            title={t("profile.termsConditionsCard.title")}
            subtitle={t("profile.termsConditionsCard.subtitle")}
            onClick={() => navigateFromIconPage("/terms-conditions")}
          />
        </SettingsGroup>

        {/* Sign out */}
        <div className={reveal()} style={{ animationDelay: "320ms" }}>
          <AuthButtons />
        </div>
      </div>
    </div>
  );
}
