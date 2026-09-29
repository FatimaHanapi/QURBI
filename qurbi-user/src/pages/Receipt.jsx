import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle, Home, Clock, ReceiptText, ShoppingBag } from "lucide-react";
import { qurbiApi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { GRADE_COLORS } from "@/lib/livestock-data";
import { useReveal } from "@/hooks/useReveal";
import { QurbiPageLoader } from "@/components/QurbiLoading";
import { useAuthPrompt } from "@/lib/auth-prompt-context";
import { formatRM } from "@/lib/format";
import { formatOrderDateTime } from "@/lib/order-date";
import StatusChip from "@/components/account/StatusChip";
import { PAID_STATUSES } from "@/components/account/orderStatus";
import { accountMediaUrl } from "@/components/account/media";
import { primaryBtn, secondaryBtn } from "@/components/account/buttons";

const ANIMAL_EMOJIS = {
  Cow: "🐄",
  Lamb: "🐑",
  Goat: "🐐",
  Buffalo: "🐃",
  Camel: "🐪",
};

export default function Receipt() {
  const { t } = useTranslation("cart");
  const { t: ta } = useTranslation("account");
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const { reveal } = useReveal();
  const { user, isAuthenticated, authChecked } = useAuth();
  const { requestSignIn } = useAuthPrompt();

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (orderId && isAuthenticated && user?.id) {
          const response = await qurbiApi.functions.invoke("fetchMyOrders", {
            orderId,
          });
          let o = response.data?.order;
          if (!o) return;
          // Verify payment server-side, then idempotently reserve the livestock
          // and notify each farmer. Re-running this function is safe after refresh.
          const confirmation = await qurbiApi.functions.invoke(
            "markPurchasedLivestock",
            { orderId, sessionId },
          );
          setOrder(
            confirmation.data?.order || {
              ...o,
              status: "paid",
              stripe_session_id: sessionId || o.stripe_session_id || "",
            },
          );
        }
      } catch (e) {
        console.error(e);
        setLoadError(
          e.data?.error || e.message || t("receipt.loadReceiptError"),
        );
      } finally {
        setLoading(false);
      }
    };
    if (authChecked) fetchOrder();
  }, [
    authChecked,
    isAuthenticated,
    orderId,
    retryToken,
    sessionId,
    user?.id,
  ]);

  if (loading) {
    return <QurbiPageLoader label={t("receipt.loadingLabel")} />;
  }

  if (authChecked && !isAuthenticated && orderId) {
    return (
      <ReceiptStateScreen icon={Clock} title={ta("receipt.signInTitle")} message={t("receipt.signInToViewReceipt")}>
        <button
          type="button"
          onClick={() => requestSignIn({ returnTo: window.location.pathname + window.location.search, message: t("receipt.signInToViewThisReceipt") })}
          className={primaryBtn}
        >
          {t("receipt.signIn")}
        </button>
      </ReceiptStateScreen>
    );
  }

  if (loadError) {
    return (
      <ReceiptStateScreen icon={ReceiptText} title={ta("receipt.errorTitle")} message={loadError}>
        <button
          type="button"
          onClick={() => setRetryToken((value) => value + 1)}
          className={primaryBtn}
        >
          {t("receipt.retryButton")}
        </button>
        <Link to="/orders" className={secondaryBtn}>
          {t("receipt.backToMyOrders")}
        </Link>
      </ReceiptStateScreen>
    );
  }

  if (!order) {
    return (
      <ReceiptStateScreen icon={ReceiptText} title={t("receipt.orderNotFound")} message={ta("receipt.notFoundHelp")}>
        <Link to="/orders" className={primaryBtn}>
          {t("receipt.backToMyOrders")}
        </Link>
        <Link to="/" className={secondaryBtn}>
          <Home className="h-4 w-4" aria-hidden="true" /> {t("receipt.goHome")}
        </Link>
      </ReceiptStateScreen>
    );
  }

  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const paymentComplete =
    order.payment_status === "paid" || PAID_STATUSES.includes(order.status);

  if (!paymentComplete) {
    const reservationDate = new Date(order.reservation_expires_at || "");
    const reservationExpiry = !Number.isNaN(reservationDate.getTime())
      ? new Intl.DateTimeFormat("en-MY", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        }).format(reservationDate)
      : t("receipt.reservationFallback");
    return (
      <ReceiptStateScreen
        icon={Clock}
        title={t("receipt.paymentNotCompletedHeading")}
        message={t("receipt.paymentNotCompletedMessage", { expiry: reservationExpiry })}
      >
        <Link
          to={`/payment?order_id=${encodeURIComponent(order.id)}`}
          className={primaryBtn}
        >
          {t("receipt.continuePayment")}
        </Link>
        <Link to="/orders" className={secondaryBtn}>
          {t("receipt.backToMyOrders")}
        </Link>
      </ReceiptStateScreen>
    );
  }

  const address = order.deliveryAddress || order.delivery_address || {};
  const buyerName = order.buyer_name || address.recipientName || user?.full_name || "";
  const buyerEmail = order.buyer_email || user?.email || "";
  const buyerPhone = order.buyer_phone || address.recipientPhone || user?.phone || "";
  const rows = [
    [t("receipt.orderNumberLabel"), order.order_number],
    [ta("receipt.dateLabel"), formatOrderDateTime(order.paidAt || order.created_date)],
    [t("receipt.buyerLabel"), buyerName],
    [t("receipt.emailLabel"), buyerEmail],
    [t("receipt.phoneLabel"), buyerPhone],
  ].filter(([, value]) => value);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {/* Success Banner */}
      <header
        className={`qurbi-header-background rounded-b-[28px] bg-gradient-to-br from-[#41362D] to-[#6B594A] px-4 pb-8 pt-[max(2rem,env(safe-area-inset-top))] text-center shadow-lg ${reveal()}`}
      >
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F7EDE2]">
            <CheckCircle className="h-10 w-10 text-[#41362D]" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("receipt.paymentConfirmedHeading")}</h1>
          <p className="max-w-xs text-[15px] text-white/85">
            {t("receipt.orderPlacedMessage")}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-5">
        {/* Order Info */}
        <section
          className={`qurbi-dark-surface rounded-2xl border p-4 shadow-md ${reveal()}`}
          style={{ animationDelay: "80ms" }}
          aria-label={t("receipt.orderNumberLabel")}
        >
          <dl className="space-y-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <dt className="flex-none text-sm text-white/75">{label}</dt>
                <dd className="min-w-0 break-words text-right text-[15px] font-semibold text-white [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-white/75">{t("receipt.statusLabel")}</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                <StatusChip label={t("receipt.paidBadge")} tone="success" />
                <StatusChip order={order} />
              </dd>
            </div>
          </dl>
        </section>

        {/* Items */}
        <section
          className={`qurbi-dark-surface rounded-2xl border p-4 shadow-md ${reveal()}`}
          style={{ animationDelay: "140ms" }}
        >
          <h2 className="mb-2 text-base font-bold text-white">
            {t("receipt.orderItemsHeading", { count: totalItems })}
          </h2>
          <div>
            {order.items?.map((item, idx) => {
              const image = accountMediaUrl(item.image);
              return (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-3 border-b border-white/15 py-3 last:border-0"
                >
                  <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-[#F7EDE2] text-xl text-[#6B594A]">
                    {image ? (
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : ANIMAL_EMOJIS[item.animal] ? (
                      <span aria-hidden="true">{ANIMAL_EMOJIS[item.animal]}</span>
                    ) : (
                      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-[15px] font-semibold text-white">
                        {item.breed || item.listing_name}
                      </span>
                      {item.grade && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-bold ${GRADE_COLORS[item.grade]}`}
                        >
                          {item.grade}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] text-white/75">
                      {ta("receipt.itemLine", { quantity: item.quantity, price: formatRM(item.price_per_head) })}
                      {item.weight_min && item.weight_max ? ` · ${item.weight_min}–${item.weight_max} kg` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[15px] font-bold text-white">
                    {formatRM(item.total)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-1 flex items-baseline justify-between border-t border-white/25 pt-3">
            <span className="font-bold text-white">{t("receipt.totalPaidLabel")}</span>
            <span className="text-2xl font-bold text-[#E3C19F]">
              {formatRM(order.total)}
            </span>
          </div>
        </section>

        {/* Actions */}
        <Link
          to={`/orders/${encodeURIComponent(order.id)}`}
          className={`${primaryBtn} w-full ${reveal()}`}
          style={{ animationDelay: "200ms" }}
        >
          {ta("receipt.viewOrder")}
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/" className={secondaryBtn}>
            <Home className="h-4 w-4" aria-hidden="true" /> {t("receipt.homeLink")}
          </Link>
          <Link to="/history" className={secondaryBtn}>
            <Clock className="h-4 w-4" aria-hidden="true" /> {t("receipt.historyLink")}
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Centered branded message screen used for every non-receipt state. */
function ReceiptStateScreen({ icon: Icon, title, message, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-5">
      <div className="w-full max-w-sm rounded-3xl border border-[#E3C19F] bg-[#FFFDF9] p-6 text-center shadow-xl shadow-[#41362D]/15">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A]">
          <Icon className="h-8 w-8 text-[#E3C19F]" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#41362D]">{title}</h1>
        {message && (
          <p className="mt-2 text-[15px] leading-relaxed text-[#5A493C]">{message}</p>
        )}
        <div className="mt-6 grid gap-3">{children}</div>
      </div>
    </main>
  );
}
