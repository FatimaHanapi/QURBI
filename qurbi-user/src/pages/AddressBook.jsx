import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Check,
  Star,
  Phone,
  Mail,
  User,
  CircleAlert,
} from "lucide-react";
import { useUserProfile } from "@/lib/user-profile-context";
import { useReveal } from "@/hooks/useReveal";
import AppHeader from "@/components/AppHeader";
import PageLoading from "@/components/PageLoading";
import { useAuth } from "@/lib/AuthContext";
import { useAuthPrompt } from "@/lib/auth-prompt-context";
import {
  dangerBtn,
  ghostOnDarkBtn,
  lightBtn,
  primaryBtn,
  secondaryBtn,
} from "@/components/account/buttons";

const EMPTY = {
  label: "",
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
  isDefault: false,
};

const MALAYSIAN_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak",
  "Perlis", "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu",
  "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];

const inputCls =
  "mt-1.5 block w-full min-h-12 rounded-xl border-2 bg-[#FFFFFF] px-4 py-3 text-base text-[#41362D] placeholder:text-[#6B594A]/55 outline-none transition focus:border-[#6B594A]";
const labelCls = "block text-sm font-bold text-[#41362D]";
const errorCls = "mt-1 flex items-center gap-1 text-sm font-semibold text-[#9A2E0C]";

function Field({ id, label, required = false, error = "", help = "", children }) {
  const { t: ta } = useTranslation("account");
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelCls}>
        {label}
        {required ? (
          <span className="text-[#9A2E0C]"> *</span>
        ) : (
          <span className="font-medium text-[#6B594A]"> {ta("address.optional")}</span>
        )}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-[13px] text-[#5A493C]">{help}</p>}
      {error && (
        <p id={`${id}-error`} className={errorCls}>
          <CircleAlert className="h-4 w-4 flex-none" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

/**
 * @param {{
 *   initial?: any,
 *   error?: string,
 *   onSave: (form: any) => Promise<void> | void,
 *   onCancel: () => void,
 * }} props
 */
function AddressForm({ initial, error = "", onSave, onCancel }) {
  const { profile } = useUserProfile();
  const { t } = useTranslation("profile");
  const { t: ta } = useTranslation("account");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ name: "", street: "", city: "", postcode: "" });
  const [form, setForm] = useState({
    ...EMPTY,
    ...(initial || {}),
    name: initial?.name ?? profile?.name ?? "",
    email: profile?.email || "",
    phone: initial?.phone ?? profile?.phone ?? "",
  });
  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [k]: value }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: "" }));
  };
  const border = (key) => (errors[key] ? "border-[#B42318]" : "border-[#E3C19F]");
  const invalid = (key) =>
    errors[key] ? { "aria-invalid": true, "aria-describedby": `address-${key}-error` } : {};

  const handleSave = async () => {
    if (saving) return;
    const next = {
      name: form.name.trim() ? "" : t("addressBook.form.nameRequired"),
      street: form.street.trim() ? "" : t("addressBook.form.streetRequired"),
      city: form.city.trim() ? "" : t("addressBook.form.cityRequired"),
      postcode:
        form.postcode.trim() && !/^\d{5}$/.test(form.postcode.trim())
          ? ta("address.postcodeInvalid")
          : "",
    };
    setErrors(next);
    const firstError = Object.keys(next).find((key) => next[key]);
    if (firstError) {
      document.getElementById(`address-${firstError}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, email: profile?.email || "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
      className="overflow-hidden rounded-2xl border-2 border-[#E3C19F] bg-[#FFFDF9] shadow-lg shadow-[#41362D]/10"
      aria-labelledby="address-form-title"
    >
      {/* Form Header */}
      <div className="bg-gradient-to-r from-[#41362D] to-[#6B594A] px-4 py-3">
        <h2 id="address-form-title" className="text-lg font-bold text-white">
          {initial?.id ? t("addressBook.form.editTitle") : t("addressBook.form.addTitle")}
        </h2>
        <p className="text-sm text-white/85">
          {t("addressBook.form.subtitle")}
        </p>
      </div>

      <div className="space-y-5 p-4">
        <Field
          id="address-label"
          label={ta("address.labelField")}
          help={t("addressBook.form.labelPlaceholder")}
        >
          <input
            id="address-label"
            value={form.label}
            onChange={set("label")}
            placeholder={ta("address.labelPlaceholder")}
            className={`${inputCls} border-[#E3C19F]`}
          />
        </Field>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-base font-bold text-[#41362D]">
            {ta("address.contactHeading")}
          </legend>
          <Field id="address-name" label={ta("address.nameField")} required error={errors.name}>
            <input
              id="address-name"
              value={form.name}
              onChange={set("name")}
              autoComplete="name"
              placeholder={ta("address.namePlaceholder")}
              className={`${inputCls} ${border("name")}`}
              {...invalid("name")}
            />
          </Field>
          <Field id="address-phone" label={ta("address.phoneField")}>
            <input
              id="address-phone"
              value={form.phone}
              onChange={set("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="012-345 6789"
              className={`${inputCls} border-[#E3C19F]`}
            />
          </Field>
          <Field id="address-email" label={ta("address.emailField")} help={ta("address.emailHelp")}>
            <input
              id="address-email"
              value={profile?.email || ""}
              readOnly
              type="email"
              placeholder={t("addressBook.form.emailPlaceholder")}
              className={`${inputCls} cursor-not-allowed border-[#E3C19F] bg-[#F7EDE2] text-[#41362D]/80`}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-base font-bold text-[#41362D]">
            {ta("address.addressHeading")}
          </legend>
          <Field id="address-street" label={ta("address.streetField")} required error={errors.street}>
            <input
              id="address-street"
              value={form.street}
              onChange={set("street")}
              autoComplete="street-address"
              placeholder={ta("address.streetPlaceholder")}
              className={`${inputCls} ${border("street")}`}
              {...invalid("street")}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="address-postcode" label={ta("address.postcodeField")} error={errors.postcode}>
              <input
                id="address-postcode"
                value={form.postcode}
                onChange={set("postcode")}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                placeholder="81100"
                className={`${inputCls} ${border("postcode")}`}
                {...invalid("postcode")}
              />
            </Field>
            <Field id="address-city" label={ta("address.cityField")} required error={errors.city}>
              <input
                id="address-city"
                value={form.city}
                onChange={set("city")}
                autoComplete="address-level2"
                placeholder={ta("address.cityPlaceholder")}
                className={`${inputCls} ${border("city")}`}
                {...invalid("city")}
              />
            </Field>
            <Field id="address-state" label={ta("address.stateField")}>
              <input
                id="address-state"
                value={form.state}
                onChange={set("state")}
                list="address-state-options"
                autoComplete="address-level1"
                placeholder={ta("address.statePlaceholder")}
                className={`${inputCls} border-[#E3C19F]`}
              />
              <datalist id="address-state-options">
                {MALAYSIAN_STATES.map((state) => (
                  <option key={state} value={state} />
                ))}
              </datalist>
            </Field>
            <Field id="address-country" label={ta("address.countryField")}>
              <input
                id="address-country"
                value={form.country}
                onChange={set("country")}
                autoComplete="country-name"
                placeholder="Malaysia"
                className={`${inputCls} border-[#E3C19F]`}
              />
            </Field>
          </div>
        </fieldset>

        {/* Default Toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={form.isDefault}
          onClick={() => setForm((p) => ({ ...p, isDefault: !p.isDefault }))}
          className={`flex min-h-16 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${form.isDefault ? "border-[#6B594A] bg-[#F7EDE2]" : "border-[#E3C19F] bg-[#FFFFFF]"}`}
        >
          <span
            className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 ${form.isDefault ? "border-[#41362D] bg-[#41362D]" : "border-[#6B594A]"}`}
            aria-hidden="true"
          >
            {form.isDefault && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-bold text-[#41362D]">
              {t("addressBook.form.setDefault")}
            </span>
            <span className="block text-[13px] text-[#5A493C]">
              {t("addressBook.form.setDefaultHint")}
            </span>
          </span>
        </button>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE4E1] px-3 py-2.5 text-sm font-semibold text-[#8A1C12]">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> {error}
          </p>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className={secondaryBtn}
          >
            {t("addressBook.form.cancel")}
          </button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? t("addressBook.form.saving") : t("addressBook.form.saveAddress")}
          </button>
        </div>
      </div>
    </form>
  );
}

function AddressCard({
  addr,
  isSelected,
  onEdit,
  onDelete,
  onSetDefault,
  onSelect,
}) {
  const { t } = useTranslation("profile");
  const { t: ta } = useTranslation("account");
  const name = addr.label || t("addressBook.card.noLabel");
  return (
    <article
      className={`aisyah-card overflow-hidden rounded-2xl border-2 ${addr.isDefault ? "border-[#E3C19F]" : isSelected ? "border-[#E3C19F]/70" : "border-transparent"}`}
      aria-label={name}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 bg-white/10 py-2 pl-4 pr-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`break-words text-base font-bold capitalize ${addr.label ? "text-white" : "text-white/75"}`}>
            {name}
          </span>
          {addr.isDefault && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E3C19F] px-2.5 py-1 text-xs font-bold text-[#41362D]">
              <Star className="h-3.5 w-3.5 fill-[#41362D]" aria-hidden="true" /> {ta("address.defaultBadge")}
            </span>
          )}
          {isSelected && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#E3C19F] px-2.5 py-1 text-xs font-bold text-white">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> {ta("address.selectedBadge")}
            </span>
          )}
        </div>
        <div className="flex flex-none items-center">
          <button
            type="button"
            onClick={() => onEdit(addr)}
            aria-label={ta("address.editAria", { name })}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(addr.id)}
            aria-label={ta("address.deleteAria", { name })}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[#F6B7AE] hover:bg-white/10"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-5 w-5 flex-none text-[#E3C19F]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-words text-[15px] font-semibold text-white">{addr.street}</p>
            <p className="break-words text-sm text-white/80">
              {[addr.postcode, addr.city, addr.state, addr.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
        <div className="space-y-1 border-t border-white/15 pt-3">
          {addr.name && (
            <p className="flex items-center gap-2.5 text-[15px] text-white">
              <User className="h-4 w-4 flex-none text-[#E3C19F]" aria-hidden="true" />
              <span className="min-w-0 break-words">{addr.name}</span>
            </p>
          )}
          {addr.phone && (
            <p className="flex items-center gap-2.5 text-[15px] text-white/90">
              <Phone className="h-4 w-4 flex-none text-[#E3C19F]" aria-hidden="true" />
              {addr.phone}
            </p>
          )}
          {addr.email && (
            <p className="flex items-center gap-2.5 text-sm text-white/80">
              <Mail className="h-4 w-4 flex-none text-[#E3C19F]" aria-hidden="true" />
              <span className="min-w-0 break-all">{addr.email}</span>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {!addr.isDefault && (
            <button
              type="button"
              onClick={() => onSetDefault(addr.id)}
              className={`${ghostOnDarkBtn} min-h-11 flex-1 px-2 text-sm`}
            >
              <Star className="h-4 w-4" aria-hidden="true" /> {ta("address.makeDefault")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelect(addr.id)}
            aria-pressed={isSelected}
            className={`${isSelected ? ghostOnDarkBtn : lightBtn} min-h-11 flex-1 px-2 text-sm`}
          >
            {isSelected ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> {t("addressBook.card.selectedButton")}
              </>
            ) : (
              t("addressBook.card.useThisAddress")
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function DeleteAddressModal({ address, deleting, onCancel, onConfirm }) {
  const { t } = useTranslation("profile");
  if (!address) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-address-title">
      <div className="w-full max-w-sm rounded-3xl border border-[#E3C19F] bg-[#FFFDF9] p-5 shadow-2xl">
        <h2 id="delete-address-title" className="text-lg font-bold text-[#41362D]">{t("addressBook.deleteModal.title")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[#5A493C]">
          {address.label
            ? t("addressBook.deleteModal.messageLabeled", { label: address.label })
            : t("addressBook.deleteModal.messageGeneric")}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={deleting} className={secondaryBtn}>
            {t("addressBook.deleteModal.cancel")}
          </button>
          <button type="button" onClick={onConfirm} disabled={deleting} className={dangerBtn}>
            {t("addressBook.deleteModal.delete")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function AddressBook() {
  const { authChecked, isAuthenticated } = useAuth();
  const { requestSignIn } = useAuthPrompt();
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    selectedAddressId,
    setSelectedAddressId,
    profileLoading,
  } = useUserProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reveal } = useReveal();
  const { t } = useTranslation("profile");
  const { t: ta } = useTranslation("account");
  const openedFromPayment = searchParams.get("new") === "1";
  const isOnboarding = searchParams.get("onboarding") === "1";
  const requestedReturnTo = searchParams.get("returnTo") || "";
  const safeRequestedReturnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/";
  const returnTo = isOnboarding
    ? safeRequestedReturnTo
    : requestedReturnTo.startsWith("/payment")
      ? requestedReturnTo
      : "/profile";
  const [showForm, setShowForm] = useState(openedFromPayment || isOnboarding);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const flash = (text) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2500);
  };

  const handleSave = async (form) => {
    setFormError("");
    try {
      const address = {
        ...form,
        email: form.email,
      };
      if (editingAddress) {
        await updateAddress(editingAddress.id, address);
        setEditingAddress(null);
      } else {
        const newAddress = await addAddress(address);
        if (openedFromPayment) setSelectedAddressId(newAddress.id);
        setShowForm(false);
      }
      flash(ta("address.savedNotice"));
      if (isOnboarding) navigate(returnTo, { replace: true });
    } catch (error) {
      // Keep the form open with the buyer's input and explain what happened.
      setFormError(error.data?.error || error.message || t("addressBook.saveError"));
    }
  };

  const handleSetDefault = async (id) => {
    setPageError("");
    const addr = addresses.find((a) => a.id === id);
    try {
      if (addr) await updateAddress(id, { ...addr, isDefault: true });
      setSelectedAddressId(id);
      flash(ta("address.defaultNotice"));
    } catch (error) {
      setPageError(error.data?.error || error.message || t("addressBook.saveError"));
    }
  };

  if (!authChecked || profileLoading) {
    return (
      <div className="aisyah-page">
        <AppHeader
          title={t("addressBook.pageTitle")}
          backTo={returnTo}
          subtitle={t("addressBook.pageSubtitle")}
        />
        <PageLoading contentOnly message={t("addressBook.loading")} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="aisyah-page min-h-screen">
        <AppHeader title={t("addressBook.pageTitle")} backTo={returnTo} subtitle={t("addressBook.pageSubtitle")} />
        <div className="aisyah-content flex flex-col items-center justify-center gap-3 py-16 text-center">
          <MapPin className="h-12 w-12 text-[#41362D]/40" aria-hidden="true" />
          <p className="max-w-xs text-[15px] text-[#41362D]/75">{t("addressBook.signInPrompt")}</p>
          <button
            type="button"
            onClick={() => requestSignIn({ returnTo: window.location.pathname + window.location.search, message: t("addressBook.signInMessage") })}
            className={`${primaryBtn} mt-2 px-8`}
          >
            {t("addressBook.signIn")}
          </button>
        </div>
      </div>
    );
  }

  // Default address first, then the rest in their saved order.
  const sortedAddresses = [...addresses].sort(
    (a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)),
  );

  return (
    <div className="aisyah-page">
      <AppHeader
        title={t("addressBook.pageTitle")}
        backTo={returnTo}
        subtitle={isOnboarding
          ? t("addressBook.onboardingSubtitle")
          : t("addressBook.savedCount", { count: addresses.length })}
      />

      {notice && (
        <div role="status" className="fixed left-4 right-4 top-5 z-50 mx-auto max-w-md rounded-xl bg-[#41362D] px-4 py-3 text-[15px] font-semibold text-white shadow-lg">
          {notice}
        </div>
      )}

      <div className="aisyah-content mx-auto max-w-2xl">
        {pageError && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FBE4E1] px-3 py-2.5 text-sm font-semibold text-[#8A1C12]">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> {pageError}
          </p>
        )}

        {/* Add button (top, so it is always easy to reach) */}
        {!showForm && !editingAddress && addresses.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setShowForm(true);
            }}
            className={`${primaryBtn} w-full ${reveal()}`}
            style={{ animationDelay: "60ms" }}
          >
            <Plus className="h-5 w-5" aria-hidden="true" /> {t("addressBook.addNewAddress")}
          </button>
        )}

        {/* Add Form */}
        {showForm && !editingAddress && (
          <div className={reveal()} style={{ animationDelay: "80ms" }}>
            <AddressForm
              error={formError}
              onSave={handleSave}
              onCancel={() => {
                setFormError("");
                setShowForm(false);
              }}
            />
          </div>
        )}

        {/* Address Cards */}
        {sortedAddresses.map((addr, idx) =>
          editingAddress?.id === addr.id ? (
            <AddressForm
              key={addr.id}
              initial={addr}
              error={formError}
              onSave={handleSave}
              onCancel={() => {
                setFormError("");
                setEditingAddress(null);
              }}
            />
          ) : (
            <div
              key={addr.id}
              className={reveal()}
              style={{ animationDelay: `${80 + idx * 60}ms` }}
            >
              <AddressCard
                addr={addr}
                isSelected={selectedAddressId === addr.id}
                onEdit={(address) => {
                  setFormError("");
                  setShowForm(false);
                  setEditingAddress(address);
                }}
                onDelete={() => setDeleteCandidate(addr)}
                onSetDefault={handleSetDefault}
                onSelect={setSelectedAddressId}
              />
            </div>
          ),
        )}

        {/* Empty state */}
        {addresses.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#E3C19F] bg-[#FFFDF9]/80 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A]">
              <MapPin className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
            <p className="text-base font-bold text-[#41362D]">{t("addressBook.emptyTitle")}</p>
            <p className="max-w-xs text-[15px] text-[#41362D]/75">
              {t("addressBook.emptySubtitle")}
            </p>
            <button type="button" onClick={() => setShowForm(true)} className={`${primaryBtn} mt-1 px-6`}>
              <Plus className="h-5 w-5" aria-hidden="true" /> {t("addressBook.addNewAddress")}
            </button>
          </div>
        )}

        {isOnboarding && (
          <button
            type="button"
            onClick={() => navigate(returnTo, { replace: true })}
            className={`${secondaryBtn} w-full`}
          >
            {t("addressBook.skipForNow")}
          </button>
        )}
      </div>
      <DeleteAddressModal
        address={deleteCandidate}
        deleting={deleting}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={async () => {
          setDeleting(true);
          setPageError("");
          try {
            await deleteAddress(deleteCandidate.id);
            flash(ta("address.deletedNotice"));
          } catch (error) {
            setPageError(error.data?.error || error.message || t("addressBook.saveError"));
          } finally {
            setDeleting(false);
            setDeleteCandidate(null);
          }
        }}
      />
    </div>
  );
}
