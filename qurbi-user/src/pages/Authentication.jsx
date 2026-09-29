import React from "react";
import { Home, LogIn, ShieldCheck, UserPlus, CircleAlert } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";
import { safeReturnTo } from "@/lib/authReturnTo";
import apiClient from "@/api/apiClient";

const googleButton =
  "flex w-full min-h-[52px] items-center justify-center gap-3 rounded-xl border-2 border-[#41362D] bg-[#FFFFFF] px-4 text-base font-bold text-[#41362D] shadow-sm shadow-black/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9825F] focus-visible:ring-offset-2 active:scale-[0.98]";
const guestButton =
  "flex w-full min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E3C19F] bg-[#E3C19F]/40 px-4 text-[15px] font-bold text-[#41362D] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9825F] active:scale-[0.98]";

export default function Authentication() {
  const { t } = useTranslation("auth");
  const { t: ta } = useTranslation("account");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogle, authError, isLoadingAuth } = useAuth();
  const mode = searchParams.get("mode") === "register" ? "register" : "login";
  const isRegister = mode === "register";
  const returnTo = safeReturnTo();

  const changeMode = (nextMode) => {
    if (nextMode === mode) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("mode", nextMode);
    setSearchParams(nextParams);
  };

  const handleGoogle = async () => {
    try {
      const signedInUser = await loginWithGoogle();
      if (!signedInUser?.privacyPolicyAcceptedAt || !signedInUser?.userAgreementAcceptedAt) {
        navigate(`/user-agreement?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
        return;
      }
      if (!signedInUser?.phone) {
        navigate(`/signup-details?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
        return;
      }
      const { data: savedAddresses } = await apiClient.get("/addresses");
      if (!savedAddresses?.length) {
        navigate(`/address-book?onboarding=1&returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
        return;
      }
      navigate(returnTo, { replace: true });
    } catch {
      // AuthContext exposes Firebase/backend failures in the existing UI.
    }
  };

  const handleContinueHome = () => {
    sessionStorage.removeItem("gh_splash_shown");
    navigate("/");
  };

  const copy = isRegister ? "register" : "login";

  return (
    <AuthLayout
      mode={mode}
      icon={isRegister ? UserPlus : LogIn}
      title={t(`${copy}.title`)}
      subtitle={t(`${copy}.subtitle`)}
      footer={
        <>
          {isRegister ? t("register.haveAccount") : t("login.noAccount")}{" "}
          <button
            type="button"
            onClick={() => changeMode(isRegister ? "login" : "register")}
            className="inline-flex min-h-11 items-center px-1 font-bold text-[#41362D] underline underline-offset-4"
          >
            {isRegister ? t("register.signIn") : t("login.createOne")}
          </button>
        </>
      }
    >
      <div key={mode} className={isRegister ? "auth-mode-content-register" : "auth-mode-content-login"}>
        {authError?.type === "auth_failed" && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-[#E8A39A] bg-[#FBE4E1] px-3 py-3 text-sm font-semibold text-[#8A1C12]">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>
              <span className="block">{ta("auth.signInFailed")}</span>
              <span className="block font-medium">{authError.message}</span>
            </span>
          </div>
        )}

        <button
          type="button"
          disabled={isLoadingAuth}
          aria-busy={isLoadingAuth}
          onClick={handleGoogle}
          className={`${googleButton} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isLoadingAuth ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#41362D]/30 border-t-[#41362D]" aria-hidden="true" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          {isLoadingAuth
            ? isRegister ? ta("auth.signingUp") : ta("auth.signingIn")
            : isRegister ? t("register.signUpWithGoogle") : t("login.signInWithGoogle")}
        </button>

        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-[#5A493C]">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[#6B594A]" aria-hidden="true" />
          <span>
            {ta("auth.trustNote")}{" "}
            <Link to="/privacy-policy" className="font-bold text-[#41362D] underline underline-offset-2">
              {ta("auth.privacyLink")}
            </Link>
          </span>
        </p>

        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-[#E3C19F]" />
          <span className="text-sm text-[#6B594A]">{t(`${copy}.or`)}</span>
          <span className="h-px flex-1 bg-[#E3C19F]" />
        </div>

        <button
          type="button"
          onClick={handleContinueHome}
          className={guestButton}
        >
          <Home className="h-4 w-4" aria-hidden="true" /> {t(`${copy}.continueToHome`)}
        </button>
        <p className="mt-2 text-center text-[13px] text-[#5A493C]">{ta("auth.guestNote")}</p>
      </div>
    </AuthLayout>
  );
}
