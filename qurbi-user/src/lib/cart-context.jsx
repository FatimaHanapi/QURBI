import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { loadBulkListingById, loadLivestockById } from "@/lib/farmerClient";

const CartContext = createContext(null);
const CART_STORAGE_PREFIX = "qurbi_cart_v1:";

const storageKey = (scope) => `${CART_STORAGE_PREFIX}${scope}`;

const readStoredCart = (scope) => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(scope)) || "{}");
    const items = Array.isArray(stored.items)
      ? stored.items
          .filter((item) => item && typeof item === "object" && item.key)
          .map((item) => ({
            ...item,
            quantity: 1,
            price_per_head: Number(item.price_per_head) || 0,
            total: Number(item.price_per_head) || 0,
          }))
      : [];
    const itemKeys = new Set(items.map((item) => item.key));
    const selectedKeys = Array.isArray(stored.selectedKeys)
      ? stored.selectedKeys.filter((key) => itemKeys.has(key))
      : [];

    return { items, selectedKeys };
  } catch {
    return { items: [], selectedKeys: [] };
  }
};

export function CartProvider({ children }) {
  const { user, authChecked } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [hydratedScope, setHydratedScope] = useState(null);
  const accountId = user?.id || null;
  const cartScope = authChecked ? accountId || "guest" : null;

  // Restore the cart only after authentication has resolved, so the initial
  // anonymous render cannot overwrite or expose another account's cart.
  useEffect(() => {
    if (!cartScope) return;
    setHydratedScope(null);
    const stored = readStoredCart(cartScope);
    setCartItems(stored.items);
    setSelectedKeys(stored.selectedKeys);
    setHydratedScope(cartScope);
  }, [cartScope]);

  // Persist every cart mutation under the resolved account (or guest) scope.
  useEffect(() => {
    if (!cartScope || hydratedScope !== cartScope) return;
    try {
      localStorage.setItem(
        storageKey(cartScope),
        JSON.stringify({ items: cartItems, selectedKeys }),
      );
    } catch {
      // Storage can be unavailable in restricted browser modes; the live cart
      // remains usable in memory for the current page session.
    }
  }, [cartItems, cartScope, hydratedScope, selectedKeys]);

  useEffect(() => {
    if (!cartScope || hydratedScope !== cartScope) return;
    const missing = cartItems.filter((item) => !item.image && !item.image_checked);
    if (!missing.length) return;
    let active = true;
    Promise.all(missing.map(async (item) => {
      try {
        const product = item.item_type === "bulk"
          ? await loadBulkListingById(item.bulk_listing_id || item.id)
          : await loadLivestockById(item.livestock_id || item.id);
        return [item.key, product?.coverImage || product?.images?.[0] || ""];
      } catch {
        return [item.key, ""];
      }
    })).then((images) => {
      if (!active) return;
      const byKey = Object.fromEntries(images);
      setCartItems((current) => current.map((item) => Object.prototype.hasOwnProperty.call(byKey, item.key)
        ? { ...item, image: byKey[item.key], image_checked: true }
        : item));
    });
    return () => { active = false; };
  }, [cartItems, cartScope, hydratedScope]);

  const keyFor = (item) => item.item_type === "bulk"
    ? `bulk:${item.bulk_listing_id || item.id}`
    : item.id || `${item.animal}-${item.breed}-${item.grade}`;

  const addToCart = (item) => {
    const key = keyFor(item);
    if (cartItems.some((cartItem) => cartItem.key === key)) return false;
    const unitPrice = Number(item.price_per_head) || 0;
    setCartItems((prev) => [...prev, { ...item, key, quantity: 1, price_per_head: unitPrice, total: unitPrice }]);
    setSelectedKeys((prev) => prev.includes(key) ? prev : [...prev, key]);
    return true;
  };

  // Buy Now: add item (if not already present) and select ONLY this item for checkout
  const buyNow = (item) => {
    const key = keyFor(item);
    const unitPrice = Number(item.price_per_head) || 0;
    setCartItems((prev) => {
      const exists = prev.some((i) => i.key === key);
      if (exists) return prev;
      return [...prev, { ...item, key, quantity: 1, price_per_head: unitPrice, total: unitPrice }];
    });
    setSelectedKeys([key]);
  };

  const removeFromCart = (key) => {
    setCartItems((prev) => prev.filter((i) => i.key !== key));
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) {
      removeFromCart(key);
      return;
    }
    setCartItems((prev) => prev.map((i) => i.key === key ? { ...i, quantity: 1, total: Number(i.price_per_head) || 0 } : i));
  };

  const toggleSelect = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelectedKeys(cartItems.map((i) => i.key));
  const clearSelection = () => setSelectedKeys([]);

  const removeSelected = () => {
    const selectedSet = new Set(selectedKeys);
    setCartItems((prev) => prev.filter((i) => !selectedSet.has(i.key)));
    setSelectedKeys([]);
  };

  const clearCart = () => { setCartItems([]); setSelectedKeys([]); };

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cartItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const selectedItems = cartItems.filter((i) => selectedKeys.includes(i.key));
  const selectedSubtotal = selectedItems.reduce((s, i) => s + (Number(i.total) || 0), 0);

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, buyNow, removeFromCart, updateQty, clearCart,
      totalItems, totalPrice,
      selectedKeys, toggleSelect, selectAll, clearSelection, removeSelected,
      selectedItems, selectedSubtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
