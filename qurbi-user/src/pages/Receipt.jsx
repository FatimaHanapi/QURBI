import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Home, Clock } from "lucide-react";
import { qurbiApi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import { GRADE_COLORS } from "@/lib/livestock-data";
import { useReveal } from "@/hooks/useReveal";
import { QurbiPageLoader } from "@/components/QurbiLoading";
import { useAuthPrompt } from "@/lib/auth-prompt-context";

const ANIMAL_EMOJIS = {
  Cow: "🐄",
  Lamb: "🐑",
  Goat: "🐐",
  Buffalo: "🐃",
  Camel: "🐪",
};

export default function Receipt() {
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
          e.data?.error || e.message || "We couldn't load your receipt.",
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
    return <QurbiPageLoader label="Loading your receipt…" />;
  }

  if (authChecked && !isAuthenticated && orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-900 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Clock className="h-12 w-12 text-[#C49A72]" />
        <p className="text-sm text-[#E3C19F]">Sign in to view your receipt.</p>
        <button
          type="button"
          onClick={() => requestSignIn({ returnTo: window.location.pathname + window.location.search, message: "Sign in to view this receipt." })}
          className="rounded-xl bg-[#F7EDE2]0 px-6 py-3 text-sm font-bold text-white"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="qurbi-page flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="max-w-sm text-sm text-[#41362D]/65">{loadError}</p>
        <button
          type="button"
          onClick={() => setRetryToken((value) => value + 1)}
          className="qurbi-primary-button"
        >
          Retry
        </button>
        <Link to="/orders" className="text-sm font-bold text-[#6B594A]">
          Back to My Orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-900 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-[#C49A72]">Order not found.</p>
        <Link to="/" className="text-[#A9825F] underline">
          Go Home
        </Link>
      </div>
    );
  }

  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const paymentComplete =
    order.payment_status === "paid" ||
    ["paid", "preparing", "in_transit", "delivered", "received", "completed"].includes(
      order.status,
    );

  if (!paymentComplete) {
    const reservationDate = new Date(order.reservation_expires_at || "");
    const reservationExpiry = !Number.isNaN(reservationDate.getTime())
      ? new Intl.DateTimeFormat("en-MY", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        }).format(reservationDate)
      : "up to 24 hours";
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#41362D] to-[#6B594A] p-5">
        <div className="w-full max-w-sm rounded-3xl border border-[#E3C19F]/60 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E3C19F] bg-white/10">
            <Clock className="h-9 w-9 text-[#E3C19F]" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">
            Payment not completed
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#F7EDE2]">
            Your order is saved and the livestock is reserved until {reservationExpiry}.
            You can try payment again from this order.
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              to={`/payment?order_id=${encodeURIComponent(order.id)}`}
              className="rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] px-4 py-3 text-sm font-bold text-[#41362D]"
            >
              Continue Payment
            </Link>
            <Link
              to="/orders"
              className="rounded-xl border border-[#E3C19F] px-4 py-3 text-sm font-bold text-white"
            >
              Back to My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 to-green-900 pb-10">
      {/* Success Banner */}
      <div
        className={`bg-[#F7EDE2]0 px-4 py-8 flex flex-col items-center gap-3 ${reveal()}`}
      >
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-[#F7EDE2]0" />
        </div>
        <h1 className="text-white font-bold text-2xl">Payment Confirmed!</h1>
        <p className="text-[#E3C19F] text-sm text-center">
          Your livestock order has been placed successfully
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Order Info */}
        <div
          className={`bg-green-900/60 border border-[#41362D]/40 rounded-2xl p-4 space-y-3 ${reveal()}`}
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex justify-between items-center">
            <span className="text-[#A9825F] text-sm">Order Number</span>
            <span className="text-[#E3C19F] font-bold">
              {order.order_number}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#A9825F] text-sm">Buyer</span>
            <span className="text-[#E3C19F]">{order.buyer_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#A9825F] text-sm">Email</span>
            <span className="text-[#E3C19F] text-sm">
              {order.buyer_email}
            </span>
          </div>
          {order.buyer_phone && (
            <div className="flex justify-between items-center">
              <span className="text-[#A9825F] text-sm">Phone</span>
              <span className="text-[#E3C19F]">{order.buyer_phone}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-[#A9825F] text-sm">Status</span>
            <span className="bg-[#F7EDE2]0 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              ✓ PAID
            </span>
          </div>
        </div>

        {/* Items */}
        <div
          className={`bg-green-900/60 border border-[#41362D]/40 rounded-2xl p-4 ${reveal()}`}
          style={{ animationDelay: "140ms" }}
        >
          <h3 className="text-[#E3C19F] font-bold mb-3">
            Order Items ({totalItems} head)
          </h3>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between border-b border-[#41362D]/40 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span>{ANIMAL_EMOJIS[item.animal] || "🐾"}</span>
                    <span className="text-[#E3C19F] font-semibold text-sm">
                      {item.breed}
                    </span>
                    {item.grade && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[item.grade]}`}
                      >
                        {item.grade}
                      </span>
                    )}
                  </div>
                  <p className="text-[#A9825F] text-xs mt-0.5">
                    {item.quantity} seekor × RM{" "}
                    {item.price_per_head?.toLocaleString()} | ⚖️{" "}
                    {item.weight_min}–{item.weight_max} kg
                  </p>
                </div>
                <span className="text-[#E3C19F] font-bold text-sm">
                  RM {item.total?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#41362D]/40 pt-3 mt-1 flex justify-between font-bold">
            <span className="text-[#E3C19F]">Total Paid</span>
            <span className="text-[#A9825F] text-xl">
              RM {order.total?.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className={`grid grid-cols-2 gap-3 ${reveal()}`}
          style={{ animationDelay: "200ms" }}
        >
          <Link
            to="/"
            className="bg-green-800/60 border border-[#41362D]/40 text-[#C49A72] py-3 rounded-xl font-semibold text-center flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link
            to="/history"
            className="bg-[#A9825F] text-green-950 py-3 rounded-xl font-bold text-center flex items-center justify-center gap-2" 
          >
            <Clock className="w-4 h-4" /> History
          </Link>
        </div>
      </div>
    </div>
  );
}
