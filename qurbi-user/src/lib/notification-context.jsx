import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { qurbiApi } from "@/api/qurbiClient";
import { useAuth } from "@/lib/AuthContext";
import NotificationBanner from "@/components/NotificationBanner";

const NotificationContext = createContext(null);
const POLL_INTERVAL_MS = 30000;
const bannerStorageKey = (userId) =>
  `qurbi_notification_banners_seen_${userId}`;

const notificationKey = (notification) =>
  notification.event_key || notification.id;

export function NotificationProvider({ children }) {
  const { authChecked, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bannerRef = useRef(null);
  const seenBannerKeys = useRef(new Set());
  const loadedAccountRef = useRef(null);

  const closeBanner = useCallback(() => {
    bannerRef.current = null;
    setBanner(null);
  }, []);

  useEffect(() => {
    closeBanner();
    loadedAccountRef.current = null;
    if (!user?.id) {
      seenBannerKeys.current = new Set();
      return;
    }
    try {
      const saved = JSON.parse(
        localStorage.getItem(bannerStorageKey(user.id)) || "[]",
      );
      seenBannerKeys.current = new Set(Array.isArray(saved) ? saved : []);
    } catch {
      seenBannerKeys.current = new Set();
    }
  }, [closeBanner, user?.id]);

  const offerNotificationBanner = useCallback(
    (incoming) => {
      if (!user?.id || bannerRef.current || !incoming.length) return;
      const sorted = [...incoming].sort(
        (a, b) => new Date(b.event_at || 0).getTime() - new Date(a.event_at || 0).getTime(),
      );
      const candidate = sorted.find(
        (notification) =>
          !notification.is_read &&
          !seenBannerKeys.current.has(notificationKey(notification)),
      );
      if (!candidate) return;

      // Treat the current server snapshot as delivered so older records do not
      // cascade into repeated banners on later polling cycles.
      for (const notification of incoming) {
        seenBannerKeys.current.add(notificationKey(notification));
      }
      const persisted = [...seenBannerKeys.current].slice(-500);
      try {
        localStorage.setItem(
          bannerStorageKey(user.id),
          JSON.stringify(persisted),
        );
      } catch {
        // Banner delivery still works if private storage is unavailable.
      }
      bannerRef.current = candidate;
      setBanner(candidate);
    },
    [user?.id],
  );

  const refreshNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!authChecked || !isAuthenticated || !user?.id) {
        setNotifications([]);
        setLoading(false);
        setError("");
        return;
      }

      const initialLoad = loadedAccountRef.current !== user.id;
      if (!silent || initialLoad) setLoading(true);
      try {
        const response = await qurbiApi.functions.invoke(
          "fetchMyNotifications",
          {},
        );
        const incoming = response.data?.notifications || [];
        setNotifications(incoming);
        offerNotificationBanner(incoming);
        setError("");
      } catch (requestError) {
        if (!silent || initialLoad) {
          setError(
            requestError.data?.error ||
              "We couldn't load your notifications. Please try again.",
          );
        }
      } finally {
        loadedAccountRef.current = user.id;
        if (!silent || initialLoad) setLoading(false);
      }
    },
    [authChecked, isAuthenticated, offerNotificationBanner, user?.id],
  );

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const interval = window.setInterval(
      () => refreshNotifications({ silent: true }),
      POLL_INTERVAL_MS,
    );
    const onFocus = () => refreshNotifications({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, refreshNotifications]);

  useEffect(() => {
    if (isAuthenticated) refreshNotifications({ silent: true });
  }, [isAuthenticated, location.pathname, refreshNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification,
      ),
    );
    try {
      await qurbiApi.functions.invoke("markMyNotificationRead", {
        notificationId,
      });
      return true;
    } catch (requestError) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: false }
            : notification,
        ),
      );
      setError(
        requestError.data?.error ||
          "We couldn't mark that notification as read. Please try again.",
      );
      return false;
    }
  }, []);

  const clearNotification = useCallback(
    async (notificationId) => {
      if (!notificationId) return false;
      try {
        await qurbiApi.functions.invoke("clearMyNotifications", {
          notificationId,
        });
        setNotifications((current) =>
          current.filter((notification) => notification.id !== notificationId),
        );
        if (bannerRef.current?.id === notificationId) closeBanner();
        return true;
      } catch (requestError) {
        setError(
          requestError.data?.error ||
            "We couldn't clear that notification. Please try again.",
        );
        return false;
      }
    },
    [closeBanner],
  );

  const clearAllNotifications = useCallback(async () => {
    try {
      await qurbiApi.functions.invoke("clearMyNotifications", {
        clearAll: true,
      });
      setNotifications([]);
      closeBanner();
      return true;
    } catch (requestError) {
      setError(
        requestError.data?.error ||
          "We couldn't clear your notifications. Please try again.",
      );
      return false;
    }
  }, [closeBanner]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const openBanner = useCallback(
    async (notification) => {
      closeBanner();
      if (!notification.is_read) await markAsRead(notification.id);
      if (notification.order_id) {
        navigate(`/orders/${encodeURIComponent(notification.order_id)}`);
      } else {
        navigate("/notifications");
      }
    },
    [closeBanner, markAsRead, navigate],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications,
        markAsRead,
        clearNotification,
        clearAllNotifications,
      }}
    >
      {children}
      {banner && (
        <NotificationBanner
          notification={banner}
          onOpen={openBanner}
          onClose={closeBanner}
        />
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
}
