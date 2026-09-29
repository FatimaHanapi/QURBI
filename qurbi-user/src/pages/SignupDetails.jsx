import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { User, Phone, Check, ArrowRight } from "lucide-react";
import { useUserProfile } from "@/lib/user-profile-context";
import { useAuth } from "@/lib/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import { safeReturnTo } from "@/lib/authReturnTo";

const inputCls = "w-full bg-gradient-to-br from-[#41362D] to-[#6B594A] border border-[#F7EDE2]/30 rounded-xl pl-10 pr-3 py-3 text-white placeholder:text-white/60 text-sm outline-none focus:border-[#A9825F] focus:ring-1 focus:ring-[#A9825F] transition-all";
const primaryBtn = "w-full bg-gradient-to-r from-[#5A493C] to-[#41362D] text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-[#D5B18D] disabled:opacity-60"; 

export default function SignupDetails() {
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

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: current.name || profile.name || user?.full_name || "",
      phone: current.phone || profile.phone || user?.phone || "",
    }));
  }, [profile.name, profile.phone, user]);

  const handleSave = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      setSaveError("Please enter your name.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 7) {
      setSaveError("Please enter a valid phone number.");
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
      setSaveError(error.message || "Your profile could not be saved.");
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

  return (
    <AuthLayout
      mode="register"
      icon={User}
      title="Complete your profile"
      subtitle="Add your details to finish setting up your QURBI account"
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-gray-500 text-xs font-semibold">Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input value={form.name} onChange={set("name")} placeholder="Your full name" className={inputCls} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-500 text-xs font-semibold">Phone number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input value={form.phone} onChange={set("phone")} type="tel" placeholder="012-345 6789" className={inputCls} />
          </div>
        </div>
        {saveError && <p role="alert" className="text-center text-xs text-red-600">{saveError}</p>}
        <button disabled={saving} onClick={handleSave} className={primaryBtn + " mt-1"}>
          {saving ? "Saving…" : saved ? <><Check className="w-4 h-4" /> Saved!</> : <>Save & continue <ArrowRight className="w-4 h-4" /></>}
        </button>
      </div>
    </AuthLayout>
  );
}
