import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import { AisyahPageLoader } from "@/components/AisyahLoading";

const DefaultFallback = () => {
  const { t } = useTranslation("auth");
  return <AisyahPageLoader label={t("protectedRoute.checkingSession")} />;
};

export default function ProtectedRoute({
  fallback = <DefaultFallback />,
  unauthenticatedElement,
}) {
  const {
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    authError,
    checkUserAuth,
  } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  return <Outlet />;
}
