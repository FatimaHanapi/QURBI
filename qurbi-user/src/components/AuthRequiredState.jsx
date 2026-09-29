import React, { useEffect } from "react";
import { LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthPrompt } from "@/lib/auth-prompt-context";

export default function AuthRequiredState({
  title = "",
  message = "",
  returnTo = "/",
}) {
  const { t } = useTranslation("account");
  const { t: tAuth } = useTranslation("auth");
  const { requestSignIn } = useAuthPrompt();
  title = title || t("authRequired.title");
  message = message || t("authRequired.message");

  useEffect(() => {
    requestSignIn({ returnTo, message });
  }, [message, requestSignIn, returnTo]);

  return (
    <main className="aisyah-page flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LockKeyhole className="h-12 w-12 text-[#41362D]/45" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-bold text-[#41362D]">{title}</h1>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-[#41362D]/80">{message}</p>
      <button
        type="button"
        onClick={() => requestSignIn({ returnTo, message })}
        className="mt-5 min-h-12 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-8 text-[15px] font-bold text-white shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9825F] focus-visible:ring-offset-2"
      >
        {tAuth("authButtons.signIn")}
      </button>
    </main>
  );
}
