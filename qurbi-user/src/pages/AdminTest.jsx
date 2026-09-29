import { formatRM } from "@/lib/format";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FlaskConical, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { qurbiApi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import AppHeader from "@/components/AppHeader";
import { QurbiPageLoader } from "@/components/QurbiLoading";

export default function AdminTest() {
  const { t } = useTranslation("admin");
  const { user, authChecked } = useAuth();
  const navigate = useNavigate();
  const [livestock, setLivestock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!authChecked) return undefined;
    if (user?.role !== "admin") {
      setLoading(false);
      return undefined;
    }

    qurbiApi.functions
      .invoke("fetchLivestock", {})
      .then((response) => {
        if (active) setLivestock(response.data?.livestock || []);
      })
      .catch(() => {
        if (active) setError(t("adminTest.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authChecked, user?.role]);

  const createShippingTest = async (item) => {
    if (creatingId) return;
    setCreatingId(item.id);
    setError("");
    try {
      const response = await qurbiApi.functions.invoke("createTestOrder", {
        livestockId: item.id,
      });
      const orderId = response.data?.order?.id;
      if (!orderId) throw new Error(t("adminTest.orderNotCreated"));
      navigate(`/orders/${encodeURIComponent(orderId)}`);
    } catch (requestError) {
      setError(
        requestError.data?.error ||
          requestError.message ||
          t("adminTest.createError"),
      );
    } finally {
      setCreatingId("");
    }
  };

  if (!authChecked || loading) {
    return <QurbiPageLoader label={t("adminTest.preparing")} />;
  }

  if (user?.role !== "admin") {
    return (
      <main className="aisyah-page flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <Package className="h-12 w-12 text-[#41362D]/25" />
        <p className="font-semibold text-[#41362D]/65">
          {t("adminTest.adminRequired")}
        </p>
        <Link to="/" className="font-bold text-[#6B594A]">
          {t("adminTest.backToHome")}
        </Link>
      </main>
    );
  }

  return (
    <div className="aisyah-page min-h-screen pb-12">
      <AppHeader
        title={t("adminTest.title")}
        subtitle={t("adminTest.subtitle")}
        backTo="/"
      />
      <main className="aisyah-content">
        <section className="rounded-3xl border border-[#41362D]/20 bg-white/55 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-[#41362D]">
                {t("adminTest.paymentBypassTitle")}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#41362D]/65">
                {t("adminTest.paymentBypassDescription")}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {livestock.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#41362D]/55">
            {t("adminTest.noLivestock")}
          </p>
        ) : (
          <div className="space-y-3">
            {livestock.map((item) => {
              const image = item.coverImage || item.images?.[0];
              return (
                <article
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#41362D]/15 bg-white/60 p-3 shadow-sm"
                >
                  <div className="h-14 w-14 flex-none overflow-hidden rounded-xl bg-[#E3C19F]/35">
                    {image && (
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#41362D]">
                      {item.breed || item.animal || t("adminTest.livestockFallback")}
                    </p>
                    <p className="mt-1 text-xs text-[#41362D]/55">
                      {formatRM(item.price_per_head || item.price || 0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => createShippingTest(item)}
                    disabled={Boolean(creatingId)}
                    className="min-h-11 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {creatingId === item.id
                      ? t("adminTest.creating")
                      : t("adminTest.testToShip")}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
