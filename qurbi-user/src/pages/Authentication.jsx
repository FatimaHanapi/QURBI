import React from "react";
import { Home, LogIn, UserPlus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";
import { safeReturnTo } from "@/lib/authReturnTo";
import apiClient from "@/api/apiClient";

const loginGoogleButton =
  "w-full bg-white border border-[#E3C19F] text-black py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm shadow-black/10";
const registerGoogleButton =
  "w-full bg-white border border-gray-200 text-black py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all";
const loginGuestButton =
  "w-full bg-[#E3C19F]/40 border border-[#E3C19F] text-black py-3 rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2";
const registerGuestButton =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-[#E3C19F] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] py-3 text-sm font-bold text-black transition-all active:scale-95";

export default function Authentication() {
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

  return (
    <AuthLayout
      mode={mode}
      icon={isRegister ? UserPlus : LogIn}
      title={isRegister ? "Create your account" : "Welcome back"}
      subtitle={isRegister ? "Sign up to get started" : "Sign in to your account"}
      footer={
        <>
          {isRegister ? "Already have an account? " : "Don’t have an account? "}
          <button
            type="button"
            onClick={() => changeMode(isRegister ? "login" : "register")}
            className="font-bold text-[#41362D] hover:underline"
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </>
      }
    >
      <div key={mode} className={isRegister ? "auth-mode-content-register" : "auth-mode-content-login"}>
        {authError?.type === "auth_failed" && (
          <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {authError.message}
          </p>
        )}

        <button
          type="button"
          disabled={isLoadingAuth}
          onClick={handleGoogle}
          className={`${isRegister ? registerGoogleButton : loginGoogleButton} mb-5 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <GoogleIcon className="h-5 w-5" />
          {isLoadingAuth
            ? isRegister ? "Signing up…" : "Signing in…"
            : isRegister ? "Sign up with Google" : "Sign in with Google"}
        </button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">or</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleContinueHome}
          className={isRegister ? registerGuestButton : loginGuestButton}
        >
          <Home className="h-4 w-4" /> Continue to Home
        </button>
      </div>
    </AuthLayout>
  );
}
