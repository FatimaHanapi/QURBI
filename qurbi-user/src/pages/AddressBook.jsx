import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Check,
  Star,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { useUserProfile } from "@/lib/user-profile-context";
import { useReveal } from "@/hooks/useReveal";
import AppHeader from "@/components/AppHeader";
import PageLoading from "@/components/PageLoading";
import { useAuth } from "@/lib/AuthContext";
import { useAuthPrompt } from "@/lib/auth-prompt-context";

const EMPTY = {
  label: "",
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
  isDefault: false,
};

const inputCls =
  "w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 text-sm outline-none focus:border-[#A9825F] focus:ring-1 focus:ring-[#A9825F] transition";

function AddressForm({ initial, onSave, onCancel }) {
  const { profile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ...EMPTY,
    ...(initial || {}),
    name: initial?.name ?? profile?.name ?? "",
    email: profile?.email || "",
    phone: initial?.phone ?? profile?.phone ?? "",
  });
  const set = (k) => (e) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Name is required.");
    if (!form.street.trim()) return alert("Street address is required.");
    if (!form.city.trim()) return alert("City is required.");
    setSaving(true);
    try {
      await onSave({ ...form, email: profile?.email || "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Form Header */}
      <div className="bg-gradient-to-r from-[#41362D] to-[#6B594A] px-4 py-3">
        <h3 className="text-white font-bold">
          {initial?.id ? "Edit Address" : "Add New Address"}
        </h3>
        <p className="text-xs text-white">
          Fill in the delivery contact & location
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Label */}
        <div>
          <label className="text-gray-500 text-xs font-semibold mb-1.5 block">
            ADDRESS LABEL
          </label>
          <input
            value={form.label}
            onChange={set("label")}
            placeholder='e.g. "Home", "Office", "Farm"'
            className={inputCls}
          />
        </div>

        {/* Contact Info Section */}
        <div className="space-y-2">
          <label className="text-gray-500 text-xs font-semibold block">
            CONTACT INFORMATION
          </label>

          <div className="relative">
            <User className="absolute left-3 top-3.5 h-4 w-4 text-white" />
            <input
              value={form.name}
              onChange={set("name")}
              placeholder="Full Name *"
              className={inputCls + " pl-9"}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white" />
            <input
              value={profile?.email || ""}
              readOnly
              placeholder="Email Address"
              type="email"
              className={inputCls + " pl-9 bg-gray-100 cursor-not-allowed"}
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-3.5 h-4 w-4 text-white" />
            <input
              value={form.phone}
              onChange={set("phone")}
              placeholder="Phone / WhatsApp"
              type="tel"
              className={inputCls + " pl-9"}
            />
          </div>
        </div>

        {/* Address Section */}

        <div className="space-y-2">
          <label className="text-gray-500 text-xs font-semibold block">
            DELIVERY ADDRESS *
          </label>
          <input
            value={form.street}
            onChange={set("street")}
            placeholder="Street / Unit / Building *"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.city}
              onChange={set("city")}
              placeholder="City *"
              className={inputCls}
            />
            <input
              value={form.state}
              onChange={set("state")}
              placeholder="State"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.postcode}
              onChange={set("postcode")}
              placeholder="Postcode"
              className={inputCls}
            />
            <input
              value={form.country}
              onChange={set("country")}
              placeholder="Country"
              className={inputCls}
            />
          </div>
        </div>

        {/* Default Toggle */}
        <button
          onClick={() => setForm((p) => ({ ...p, isDefault: !p.isDefault }))}
          className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${form.isDefault ? "border-[#E3C19F] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2]" : "border-gray-100 bg-gray-50"}`}
        >
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${form.isDefault ? "border-[#41362D] bg-gradient-to-br from-[#41362D] to-[#6B594A]" : "border-gray-300"}`}
          >
            {form.isDefault && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
          <div className="text-left">
            <p
              className={`text-sm font-semibold ${form.isDefault ? "text-[#41362D]" : "text-gray-600"}`}
            >
              Set as default address
            </p>
            <p
              className={`text-xs ${form.isDefault ? "text-[#6B594A]" : "text-gray-400"}`}
            >
              Auto-selected in cart checkout
            </p>
          </div>
          {form.isDefault && (
            <Star className="ml-auto h-4 w-4 fill-white text-white" />
          )}
        </button>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#41362D] to-[#6B594A] py-3 text-sm font-bold text-white shadow-sm shadow-[#D5B18D] transition-transform active:scale-95"
          >
            {saving ? "Saving..." : "Save Address"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressCard({
  addr,
  isSelected,
  onEdit,
  onDelete,
  onSetDefault,
  onSelect,
}) {
  return (
    <div className="rounded-2xl border-2 border-[#E3C19F] bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-lg shadow-black/20 transition-all duration-200 ease-out">
      {/* Top Bar */}
      <div className="flex items-center justify-between rounded-t-2xl bg-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {addr.label ? (
            <span className="text-sm font-bold text-white">{addr.label}</span>
          ) : (
            <span className="text-sm text-white/70">No label</span>
          )}
          {addr.isDefault && (
            <span className="flex items-center gap-1 rounded-full border border-[#F7EDE2]/60 bg-gradient-to-br from-[#41362D] to-[#6B594A] px-2 py-0.5 text-[10px] font-bold text-white">
              <Star className="w-2.5 h-2.5 fill-white" /> DEFAULT
            </span>
          )}
          {isSelected && !addr.isDefault && (
            <span className="bg-[#E3C19F] text-[#41362D] text-[10px] font-bold px-2 py-0.5 rounded-full">
              SELECTED
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(addr)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] text-black transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
          >
            <Pencil className="h-4 w-4 text-[#41362D]" />
          </button>
          <button
            onClick={() => onDelete(addr.id)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-sm shadow-red-950/25 transition-transform active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2">
        {/* Contact */}
        <div className="space-y-1">
          {addr.name && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 flex-shrink-0 text-white" />
              <span className="text-sm font-semibold text-white">
                {addr.name}
              </span>
            </div>
          )}
          {addr.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 flex-shrink-0 text-white" />
              <span className="text-sm text-white/80">{addr.phone}</span>
            </div>
          )}
          {addr.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-white" />
              <span className="text-xs text-white/70">{addr.email}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-50" />

        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white" />
          <div>
            <p className="text-sm text-white">{addr.street}</p>
            <p className="text-xs text-white/70">
              {[addr.city, addr.state, addr.postcode, addr.country]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {!addr.isDefault && (
            <button
              onClick={() => onSetDefault(addr.id)}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#E3C19F] bg-gradient-to-br from-[#E3C19F] to-[#F7EDE2] py-2 text-xs font-semibold text-[#41362D] transition-transform active:scale-95"
            >
              <Star className="h-3 w-3 text-[#41362D]" /> Set Default
            </button>
          )}
          <button
            onClick={() => onSelect(addr.id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#F7EDE2]/60 py-2 text-xs font-bold transition-transform active:scale-95 ${
              isSelected
                ? "bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white"
                : "bg-gradient-to-br from-[#41362D] to-[#6B594A] text-white shadow-sm"
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-3 h-3" /> Selected
              </>
            ) : (
              "Use This Address"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteAddressModal({ address, onCancel, onConfirm }) {
  if (!address) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-address-title">
      <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl">
        <h2 id="delete-address-title" className="text-lg font-bold text-gray-900">Delete address?</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          This will permanently remove {address.label ? `your ${address.label} address` : "this address"}.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition-transform active:scale-95">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-gradient-to-br from-red-500 to-red-700 py-3 text-sm font-bold text-white shadow-sm shadow-red-950/25 transition-transform active:scale-95">
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function AddressBook() {
  const { authChecked, isAuthenticated } = useAuth();
  const { requestSignIn } = useAuthPrompt();
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    selectedAddressId,
    setSelectedAddressId,
    profileLoading,
  } = useUserProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reveal } = useReveal();
  const openedFromPayment = searchParams.get("new") === "1";
  const isOnboarding = searchParams.get("onboarding") === "1";
  const requestedReturnTo = searchParams.get("returnTo") || "";
  const safeRequestedReturnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
    ? requestedReturnTo
    : "/";
  const returnTo = isOnboarding
    ? safeRequestedReturnTo
    : requestedReturnTo.startsWith("/payment")
      ? requestedReturnTo
      : "/profile";
  const [showForm, setShowForm] = useState(openedFromPayment || isOnboarding);
  const [editingAddress, setEditingAddress] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const handleSave = async (form) => {
    try {
      const address = {
        ...form,
        email: form.email,
      };
      if (editingAddress) {
        await updateAddress(editingAddress.id, address);
        setEditingAddress(null);
      } else {
        const newAddress = await addAddress(address);
        if (openedFromPayment) setSelectedAddressId(newAddress.id);
        setShowForm(false);
      }
      if (isOnboarding) navigate(returnTo, { replace: true });
    } catch (error) {
      alert(error.data?.error || error.message || "Contact information could not be saved.");
    }
  };

  const handleSetDefault = async (id) => {
    const addr = addresses.find((a) => a.id === id);
    if (addr) await updateAddress(id, { ...addr, isDefault: true });
    setSelectedAddressId(id);
  };

  if (!authChecked || profileLoading) {
    return (
      <div className="aisyah-page pb-10">
        <AppHeader
          title="Address Book"
          backTo={returnTo}
          subtitle="Manage your delivery addresses"
        />
        <PageLoading contentOnly message="Loading your address book..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="aisyah-page min-h-screen pb-10">
        <AppHeader title="Address Book" backTo={returnTo} subtitle="Manage your delivery addresses" />
        <div className="aisyah-content flex flex-col items-center justify-center gap-3 py-20 text-center">
          <MapPin className="h-12 w-12 text-[#41362D]/35" />
          <p className="text-sm text-[#41362D]/65">Sign in to manage your saved delivery addresses.</p>
          <button
            type="button"
            onClick={() => requestSignIn({ returnTo: window.location.pathname + window.location.search, message: "Sign in to manage your delivery addresses." })}
            className="mt-2 rounded-xl bg-gradient-to-br from-[#41362D] to-[#6B594A] px-6 py-3 text-sm font-bold text-white"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="aisyah-page pb-10">
      <AppHeader
        title="Address Book"
        backTo={returnTo}
        subtitle={isOnboarding
          ? "Add your delivery address or skip for now"
          : `${addresses.length} saved address${addresses.length !== 1 ? "es" : ""}`}
      />

      <div className="aisyah-content">
        {/* Add / Edit Form */}
        {showForm && !editingAddress && (
          <div className={reveal()} style={{ animationDelay: "80ms" }}>
            <AddressForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Address Cards */}
        {addresses.map((addr, idx) =>
          editingAddress?.id === addr.id ? (
            <AddressForm
              key={addr.id}
              initial={addr}
              onSave={handleSave}
              onCancel={() => setEditingAddress(null)}
            />
          ) : (
            <div
              key={addr.id}
              className={reveal()}
              style={{ animationDelay: `${80 + idx * 60}ms` }}
            >
              <AddressCard
                addr={addr}
                isSelected={selectedAddressId === addr.id}
                onEdit={setEditingAddress}
                onDelete={() => setDeleteCandidate(addr)}
                onSetDefault={handleSetDefault}
                onSelect={setSelectedAddressId}
              />
            </div>
          ),
        )}

        {/* Empty state */}
        {addresses.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#41362D] to-[#6B594A] border-2 border-[#41362D] rounded-2x1">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-800 font-bold">No addresses yet</p>
            <p className="text-gray-400 text-sm text-center">
              Add a delivery address to use during checkout
            </p>
          </div>
        )}

        {/* Add button */}
        {!showForm && !editingAddress && (
          <button
            onClick={() => setShowForm(true)}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#41362D] to-[#6B594A] py-4 text-sm font-semibold text-[#41362D] shadow-sm transition-transform active:scale-95 ${reveal()}`}
            style={{ animationDelay: "200ms" }}
          >
            <Plus className="w-4 h-4 text-white" /> <h1 className="text-white">Add New Address</h1>
          </button>
        )}

        {isOnboarding && (
          <button
            type="button"
            onClick={() => navigate(returnTo, { replace: true })}
            className="w-full rounded-2xl border border-[#41362D] bg-transparent py-3.5 text-sm font-bold text-[#41362D]"
          >
            Skip for now
          </button>
        )}
      </div>
      <DeleteAddressModal
        address={deleteCandidate}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={async () => {
          await deleteAddress(deleteCandidate.id);
          setDeleteCandidate(null);
        }}
      />
    </div>
  );
}
