import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin,
  ChevronRight,
  User,
  Phone,
  Mail,
  Star,
  Truck,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useUserProfile } from "@/lib/user-profile-context";
import { useAuth } from "@/lib/AuthContext";
import { qurbiApi } from "@/api/qurbiClient";
import { useReveal } from "@/hooks/useReveal";
import {
  availabilityMessage,
  checkCartAvailability,
} from "@/lib/livestock-availability";
import AddressPickerModal from "@/components/AddressPickerModal";
import CancelOrderModal from "@/components/CancelOrderModal";
import { loadLivestockById } from "@/lib/farmerClient";
import { QurbiPageLoader } from "@/components/QurbiLoading";
import { useAuthPrompt } from "@/lib/auth-prompt-context";
import AuthRequiredState from "@/components/AuthRequiredState";

const ANIMAL_EMOJIS = {
  Cow: "🐄",
  Lamb: "🐑",
  Goat: "🐐",
  Buffalo: "🐃",
  Camel: "🐪",
};
const DUMMY_DELIVERY_FEE_PER_FARMER = 10;

export default function Payment() {
  const { requestSignIn } = useAuthPrompt();
  const { selectedItems, selectedSubtotal, removeSelected } = useCart();
  const { user, isAuthenticated, authChecked } = useAuth();
  const {
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    selectedAddress,
    profile,
  } = useUserProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { reveal } = useReveal();
  const resumeOrderId = searchParams.get("order_id");
  const [resumedOrder, setResumedOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(Boolean(resumeOrderId));
  const [resumeError, setResumeError] = useState("");
  const [productDetails, setProductDetails] = useState({});
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fulfillmentMethod = "delivery";

  useEffect(() => {
    if (!resumeOrderId) return;
    let active = true;
    (async () => {
      if (!isAuthenticated || !user?.id) {
        setResumeError("Sign in to load this unpaid order.");
        setLoadingOrder(false);
        return;
      }
      try {
        const response = await qurbiApi.functions.invoke("fetchMyOrders", {
          orderId: resumeOrderId,
        });
        const order = response.data?.order;
        if (!order || !["pending", "pending_payment", "to_pay"].includes(order.status))
          throw new Error("This order is no longer awaiting payment.");
        if (active) {
          setResumedOrder(order);
          setLoadingProductDetails(
            (order.items || []).some((item) => item.livestock_id),
          );
        }
      } catch (error) {
        if (active)
          setResumeError(
            error.message || "We couldn't load this unpaid order.",
          );
      } finally {
        if (active) setLoadingOrder(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, resumeOrderId, user?.id]);

  useEffect(() => {
    if (!resumedOrder?.items?.length) {
      setLoadingProductDetails(false);
      return undefined;
    }
    let active = true;
    Promise.all(
      resumedOrder.items.map(async (item) => {
        if (!item.livestock_id) return null;
        try {
          return await loadLivestockById(item.livestock_id);
        } catch {
          return null;
        }
      }),
    ).then((products) => {
      if (active) {
        setProductDetails(
          Object.fromEntries(
            products.filter(Boolean).map((product) => [product.id, product]),
          ),
        );
        setLoadingProductDetails(false);
      }
    });
    return () => {
      active = false;
    };
  }, [resumedOrder?.id]);

  const isResumingOrder = Boolean(resumeOrderId);
  const paymentItems = resumedOrder
    ? (resumedOrder.items || []).map((item, index) => ({
        ...item,
        key: item.livestock_id || `${resumedOrder.id}-${index}`,
        quantity: 1,
        total: item.total ?? item.price_per_head,
      }))
    : selectedItems;
  const paymentSubtotal = resumedOrder?.subtotal ?? selectedSubtotal;

  const buyerName = isResumingOrder
    ? resumedOrder?.buyer_name || ""
    : selectedAddress?.name || profile.name || "";
  const buyerEmail = isResumingOrder
    ? resumedOrder?.buyer_email || ""
    : profile.email || "";
  const buyerPhone = isResumingOrder
    ? resumedOrder?.buyer_phone || ""
    : selectedAddress?.phone || profile.phone || "";

  // Delivery fee: RM 10 per unique farmer (charged once per farmer), only for delivery
  const farmerSet = new Set(
    paymentItems.map((i) => i.farmer_id || i.farmer_name || "unknown"),
  );
  const farmerCount = farmerSet.size;
  const deliveryFee =
    resumedOrder?.delivery_fee ??
    (paymentItems.length > 0
      ? farmerCount * DUMMY_DELIVERY_FEE_PER_FARMER
      : 0);
  const grandTotal = resumedOrder?.total ?? paymentSubtotal + deliveryFee;

  const canCheckout = isResumingOrder
    ? Boolean(resumedOrder)
    : Boolean(paymentItems.length > 0 && buyerName && buyerEmail && selectedAddress);

  const handleCheckout = async () => {
    if (!isAuthenticated || !user?.id) {
      requestSignIn({ returnTo: "/payment", message: "Sign in to securely continue with checkout." });
      return;
    }
    if (paymentItems.length === 0)
      return alert("No items selected for checkout.");
    if (!canCheckout) {
      if (!selectedAddress) return alert("Please select a delivery address.");
      if (!buyerName || !buyerEmail)
        return alert(
          "Your delivery details are missing a name or email. Please complete your profile and address.",
        );
      return;
    }
    try {
      const latest = await checkCartAvailability(paymentItems);
      if (paymentItems.some((item) => !latest[item.key]?.available)) {
        const unavailable = paymentItems.find(
          (item) => !latest[item.key]?.available,
        );
        alert(
          unavailable?.item_type === "bulk"
            ? "This bulk lot is no longer available."
            : availabilityMessage(latest[unavailable?.key]),
        );
        navigate(isResumingOrder ? "/orders" : "/cart");
        return;
      }
    } catch {
      alert(
        "We couldn't verify current livestock availability. Please try again.",
      );
      return;
    }
    if (window.self !== window.top) {
      alert(
        "Checkout only works from the published app. Please open the app in a new tab.",
      );
      return;
    }
    setLoading(true);
    try {
      const orderNumber = resumedOrder?.order_number || "GH-" + Date.now();
      const order =
        resumedOrder ||
        (await qurbiApi.entities.Order.create({
          order_number: orderNumber,
          items: paymentItems.map((i) =>
            i.item_type === "bulk"
              ? {
                  item_type: "bulk",
                  bulk_listing_id: i.bulk_listing_id || i.id,
                  farmer_id: i.farmer_id || "",
                  farmer_name: i.farmer_name || "",
                  listing_name: i.listing_name,
                  male_count: i.male_count || 0,
                  female_count: i.female_count || 0,
                  total_animals: i.total_animals || 0,
                  breed_breakdown: i.breed_breakdown || [],
                  state: i.state || "",
                  quantity: 1,
                  price_per_head: i.price_per_head,
                  total: i.total,
                }
              : {
                  livestock_id: i.livestock_id || i.id,
                  farmer_id: i.farmer_id || "",
                  farmer_name: i.farmer_name || "",
                  animal: i.animal,
                  breed: i.breed,
                  grade: i.grade,
                  quantity: 1,
                  weight_min: i.weight_min,
                  weight_max: i.weight_max,
                  price_per_head: i.price_per_head,
                  total: i.total,
                },
          ),
          subtotal: paymentSubtotal,
          delivery_fee: deliveryFee,
          total: grandTotal,
          status: "pending",
          fulfillment_method: fulfillmentMethod,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone,
          buyer_id: user.id,
        }));
      const res = await qurbiApi.functions.invoke("createCheckout", {
        orderId: order.id,
        orderNumber,
        items: paymentItems,
        buyerEmail,
        buyerName,
        subtotal: paymentSubtotal,
        deliveryFee,
        total: grandTotal,
        fulfillmentMethod,
        deliveryAddress: selectedAddress || resumedOrder?.delivery_address || {},
      });
      if (res.data?.url) {
        if (!isResumingOrder) removeSelected();
        window.location.href = res.data.url;
      } else alert("Could not initiate payment. Please try again.");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelExistingOrder = async () => {
    if (!resumedOrder?.id || cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      await qurbiApi.functions.invoke("cancelMyOrder", {
        orderId: resumedOrder.id,
      });
      navigate("/orders", { replace: true });
    } catch (error) {
      setCancelError(
        error.data?.error ||
          error.message ||
          "We couldn't cancel this order. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  };

  if (!authChecked) return <QurbiPageLoader label="Checking your session…" />;
  if (!isAuthenticated) {
    return <AuthRequiredState title="Payment" message="Sign in to securely continue with payment." returnTo={window.location.pathname + window.location.search} />;
  }
  if (loadingOrder || loadingProductDetails)
    return <QurbiPageLoader label="Preparing payment…" />;
  if (resumeError)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#E3C19F] p-8">
        <p className="text-gray-500 text-center">{resumeError}</p>
        <button
          onClick={() => navigate("/orders")}
          className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          Back to My Orders
        </button>
      </div>
    );
  if (paymentItems.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#E3C19F] p-8">
        <p className="text-gray-500">No items selected for payment.</p>
        <button
          onClick={() => navigate(isResumingOrder ? "/orders" : "/cart")}
          className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          {isResumingOrder ? "Back to My Orders" : "Back to Cart"}
        </button>
      </div>
    );
  }

  return (
    <div className="qurbi-page pb-28">
      {showPicker && (
        <AddressPickerModal
          addresses={addresses}
          selectedId={selectedAddressId}
          onSelect={setSelectedAddressId}
          onAddNew={() => navigate("/address-book?new=1&returnTo=%2Fpayment")}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="flex items-center gap-3 px-4 pt-5">
        <button
          type="button"
          onClick={() => navigate(isResumingOrder ? "/orders" : "/cart")}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F7EDE2] bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-sm active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[15px] font-bold uppercase tracking-[0.35em] text-[#6B594A]">
            QURBI
          </p>
          <p className="text-sm font-bold text-[#41362D]">
            {isResumingOrder
              ? `Continue ${resumedOrder.order_number}`
              : `${paymentItems.length} item${paymentItems.length !== 1 ? "s" : ""} · RM ${paymentSubtotal.toLocaleString()}`}
          </p>
        </div>
      </div>

      <div className="qurbi-content">
        {/* Selected Items (read-only) */}
        <div
          className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ${reveal()}`}
          style={{ animationDelay: "80ms" }}
        >
          <h3 className="text-gray-900 font-bold mb-3">Order Items</h3>
          <div className="space-y-2">
            {paymentItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {productDetails[item.livestock_id]?.coverImage ||
                  productDetails[item.livestock_id]?.images?.[0] ? (
                    <img
                      src={
                        productDetails[item.livestock_id]?.coverImage ||
                        productDetails[item.livestock_id]?.images?.[0]
                      }
                      alt=""
                      className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <span className="w-11 h-11 rounded-lg bg-[#F7EDE2] flex items-center justify-center text-lg flex-shrink-0">
                      {ANIMAL_EMOJIS[item.animal]}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-gray-800 font-semibold text-sm truncate">
                      {item.item_type === "bulk"
                        ? item.listing_name
                        : item.breed}{" "}
                      × {item.item_type === "bulk" ? "1 lot" : item.quantity}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {item.farmer_name || "Unknown Farmer"}
                    </p>
                  </div>
                </div>
                <span className="text-gray-900 font-bold text-sm flex-shrink-0">
                  RM {item.total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fulfillment Method */}
        {isResumingOrder ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <h3 className="text-gray-800 font-bold text-sm">
              Existing unpaid order
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Delivery ·{" "}
              {buyerName || "Buyer details saved with this order"}
            </p>
          </div>
        ) : (
          <div
            className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ${reveal()}`}
            style={{ animationDelay: "120ms" }}
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800">Fulfillment</h3>
            <div className="flex items-center gap-3 rounded-xl border-2 border-[#A9825F] bg-[#F7EDE2] p-3">
              <Truck className="h-6 w-6 text-[#A9825F]" />
              <div>
                <p className="text-sm font-bold text-[#41362D]">Delivery</p>
                <p className="text-xs text-[#6B594A]">Delivered to your selected address</p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Address + Buyer Info */}
        {!isResumingOrder && (
          <>
            <button
              onClick={() => setShowPicker(true)}
              className={`w-full bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all text-left active:scale-[0.99] ${selectedAddress ? "border-[#D5B18D]" : "border-dashed border-orange-200"}`}
            >
              <div
                className={`px-4 py-2 flex items-center justify-between ${selectedAddress ? "bg-[#F7EDE2]" : "bg-orange-50"}`}
              >
                <span
                  className={`text-xs font-bold ${selectedAddress ? "text-[#41362D]" : "text-orange-500"}`}
                >
                  DELIVERY ADDRESS
                </span>
                <span className="text-xs text-black font-semibold flex items-center gap-0.5">
                  Change <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="px-4 py-3 flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedAddress ? "bg-[#F7EDE2]" : "bg-orange-50"}`}
                >
                  <MapPin
                    className={`h-5 w-5 ${selectedAddress ? "text-[#A9825F]" : "text-orange-300"}`}
                  />
                </div>
                {selectedAddress ? (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedAddress.label && (
                        <span className="text-gray-900 font-bold text-sm">
                          {selectedAddress.label}
                        </span>
                      )}
                      {selectedAddress.isDefault && (
                        <span className="bg-[#E3C19F] text-[#41362D] text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-[#5A493C]" />{" "}
                          DEFAULT
                        </span>
                      )}
                    </div>
                    {selectedAddress.name && (
                      <p className="text-gray-700 text-sm font-medium mt-0.5">
                        {selectedAddress.name}
                      </p>
                    )}
                    {selectedAddress.phone && (
                      <p className="text-gray-400 text-xs">
                        {selectedAddress.phone}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {selectedAddress.street}, {selectedAddress.city}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-orange-500 font-semibold text-sm">
                      No address selected
                    </p>
                    <p className="text-gray-400 text-xs">
                      Tap to select a delivery address
                    </p>
                  </div>
                )}
              </div>
            </button>

            <div
              className={`bg-white rounded-2xl p-4 shadow-sm border ${!buyerName || !buyerEmail ? "border-orange-100" : "border-gray-50"} space-y-2`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-gray-800 font-bold text-sm">
                  Buyer Information
                </h3>
                <Link
                  to="/address-book"
                  className="flex items-center gap-0.5 text-xs font-semibold text-white"
                >
                  Edit <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {!selectedAddress ? (
                <p className="text-gray-400 text-xs italic">
                  Select a delivery address above to auto-fill.
                </p>
              ) : !buyerName || !buyerEmail ? (
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-orange-600 text-sm font-semibold">
                    ⚠️ Incomplete contact info
                  </p>
                  <p className="text-orange-400 text-xs mt-0.5">
                    Add name & email to this address to proceed.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-gray-800 text-sm">{buyerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-gray-600 text-sm">{buyerEmail}</span>
                  </div>
                  {buyerPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-gray-600 text-sm">
                        {buyerPhone}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Payment box stays at the end of the document and is reached by scrolling. */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto max-w-md rounded-2xl border-2 border-[#41362D]/70 bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] p-4 shadow-xl shadow-black/15">
          <div className="space-y-2">
            <h3 className="font-bold text-black">Payment Summary</h3>
            {paymentItems.map((item) => (
              <div
                key={item.key}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="min-w-0 text-black/70">
                  {item.item_type === "bulk"
                    ? item.listing_name
                    : `${item.breed}${item.grade ? ` (${item.grade})` : ""}`}{" "}
                  × {item.item_type === "bulk" ? "1 lot" : item.quantity}
                </span>
                <span className="flex-none font-semibold text-black">
                  RM {item.total.toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[#E3C19F] pt-2 text-sm">
              <span className="text-black/70">Subtotal</span>
              <span className="font-semibold text-black">
                RM {paymentSubtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-black/70">
                Delivery Fee ({farmerCount} farmer
                {farmerCount !== 1 ? "s" : ""} × RM{" "}
                {DUMMY_DELIVERY_FEE_PER_FARMER})
              </span>
              <span className="flex-none font-semibold text-black">
                RM {deliveryFee.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="my-3 flex items-center justify-between border-t border-[#E3C19F] pt-3">
            <div>
              <p className="text-xs font-semibold text-black/70">
                Delivery total
              </p>
              <p className="text-xl font-extrabold text-black">
                RM {grandTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-black/70">Secure checkout</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={loading || !canCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] py-4 text-lg font-bold text-white shadow-md shadow-black/20 transition-all duration-200 ease-out hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Processing...
              </span>
            ) : (
              <>
                <CreditCard className="w-5 h-5" /> Pay RM{" "}
                {grandTotal.toLocaleString()}
              </>
            )}
          </button>
          {isResumingOrder &&
            ["pending", "pending_payment", "to_pay"].includes(resumedOrder?.status) && (
              <button
                onClick={() => {
                  setCancelError("");
                  setCancelCandidate(resumedOrder);
                }}
                disabled={loading}
                className="mt-2 w-full rounded-xl border-2 border-[#41362D] bg-gradient-to-br from-[#EF4444] to-[#B91C1C] py-3 text-sm font-bold text-white shadow-sm shadow-red-950/25 disabled:opacity-50"
              >
                Cancel Payment
              </button>
            )}
          {!canCheckout && (
            <p className="mt-2 text-center text-xs text-black/70">
              {!selectedAddress
                ? "Select a delivery address to continue"
                : "Complete your name and email to continue"}
            </p>
          )}
        </div>
      </div>
      <CancelOrderModal
        order={cancelCandidate}
        loading={cancelling}
        error={cancelError}
        onConfirm={cancelExistingOrder}
        onClose={() => {
          setCancelError("");
          setCancelCandidate(null);
        }}
      />
    </div>
  );
}
