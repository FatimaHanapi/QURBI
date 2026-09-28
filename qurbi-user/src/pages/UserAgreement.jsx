import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, ChevronDown, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import apiClient from "@/api/apiClient";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";
import { safeReturnTo } from "@/lib/authReturnTo";

const AGREEMENTS_VERSION = "2026-09-20";

const sections = [
  {
    id: "agreement",
    title: "QURBI User Agreement",
    icon: FileText,
    summary: "Rules for using your buyer account and marketplace services.",
    points: [
      "Provide accurate account, contact and delivery information.",
      "Use QURBI only for lawful marketplace activity and keep your account secure.",
      "Orders, payments, delivery, cancellations and refunds are handled through the QURBI service and its stated processes.",
      "QURBI may restrict an account when required for safety, fraud prevention, disputes or legal compliance.",
    ],
  },
  {
    id: "privacy",
    title: "QURBI User Privacy Policy",
    icon: LockKeyhole,
    summary: "How your personal data is used to provide the User app.",
    points: [
      "We collect account details, saved addresses, cart activity, orders, payment references, delivery information and necessary technical records.",
      "Google Sign-In may provide your Google ID, name, email and profile image according to your Google settings.",
      "Only information needed to fulfil an order is shared with the relevant farmer and authorised service providers.",
      "We do not sell personal data. You may request access, correction, consent withdrawal, portability or account deletion, subject to lawful retention.",
      "Data is protected with access controls, secure transmission and retention limits appropriate to the service.",
    ],
  },
];

export default function UserAgreement() {
  const { user, authChecked, isAuthenticated, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const returnTo = safeReturnTo();
  const [expanded, setExpanded] = useState({ agreement: true, privacy: false });
  const [accepted, setAccepted] = useState({ agreement: false, privacy: false, adult: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (authChecked && !isAuthenticated) {
    return <Navigate to={`/auth?mode=register&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (authChecked && user?.privacyPolicyAcceptedAt && user?.userAgreementAcceptedAt) {
    return <Navigate to={`/signup-details?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  const allAccepted = accepted.agreement && accepted.privacy && accepted.adult;

  const acceptAll = async () => {
    if (!allAccepted || saving) return;
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
      setError(requestError.response?.data?.message || requestError.message || "Your agreement could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      mode="register"
      icon={ShieldCheck}
      iconClassName="text-[#E3C19F]"
      cardClassName="max-w-2xl"
      titleClassName="text-3xl"
      title="Before you continue"
      subtitle="Please review and accept the QURBI User terms and privacy policy"
    >
      <div className="space-y-4 rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] p-4 text-white sm:p-5">
        <p className="text-base leading-7 text-white/85">
          Your acceptance is saved securely with your QURBI account. Policy version: 20 September 2026.
        </p>

        {sections.map(({ id, title, icon: Icon, summary, points }) => (
          <section key={id} className="overflow-hidden rounded-xl border border-white/20 bg-white/10">
            <button
              type="button"
              onClick={() => setExpanded((current) => ({ ...current, [id]: !current[id] }))}
              className="flex w-full items-center gap-3 p-3 text-left"
              aria-expanded={expanded[id]}
            >
              <Icon className="h-5 w-5 shrink-0 text-[#E3C19F]" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-white sm:text-lg">{title}</span>
                <span className="mt-1 block text-sm leading-6 text-white/75">{summary}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 stroke-[#E3C19F] text-[#E3C19F] transition-transform ${expanded[id] ? "rotate-180" : ""}`}
              />
            </button>
            {expanded[id] && (
              <ul className="space-y-3 border-t border-white/15 px-5 py-4 text-base leading-7 text-white/85">
                {points.map((point) => <li key={point} className="list-disc ml-4">{point}</li>)}
              </ul>
            )}
          </section>
        ))}

        {[
          ["agreement", "I have read and agree to the QURBI User Agreement."],
          ["privacy", "I have read and agree to the QURBI User Privacy Policy."],
          ["adult", "I confirm that I am 18 years old or older."],
        ].map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-4 text-base leading-7">
            <input
              type="checkbox"
              checked={accepted[key]}
              onChange={(event) => setAccepted((current) => ({ ...current, [key]: event.target.checked }))}
              className="mt-1 h-5 w-5 shrink-0 accent-[#E3C19F]"
            />
            <span>{label}</span>
          </label>
        ))}

        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-700">{error}</p>}

        <button
          type="button"
          disabled={!allAccepted || saving}
          onClick={acceptAll}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#E3C19F] bg-gradient-to-r from-[#5A493C] to-[#41362D] py-3 text-sm font-bold text-white shadow-md shadow-black/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving agreement…" : <><Check className="h-4 w-4 text-[#E3C19F]" /> Accept all & continue</>}
        </button>
      </div>
    </AuthLayout>
  );
}
