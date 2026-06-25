// src/pages/Notifications.tsx
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Bell, CheckCircle, Package, AlertTriangle, Info } from "lucide-react";
import { apiClient } from "../api/apiClient";

type Props = {
  user: any;
};

interface Notification {
  id: number;
  userId: number;
  message: string;
  isRead: number;
  createdAt: string;
}

/* ================= SKELETON ================= */
const NotificationSkeleton = () => (
  <div className="rounded-2xl bg-card shadow-sm p-4 flex gap-3 items-start animate-pulse">
    <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="w-24 h-3 bg-gray-200 dark:bg-gray-800 rounded" />
    </div>
  </div>
);

const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  },
};

/* ================= ICON HELPER ================= */
const getNotificationIcon = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("deliver") || lower.includes("order") || lower.includes("ship")) {
    return <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
  }
  if (lower.includes("cancel") || lower.includes("fail") || lower.includes("reject")) {
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  }
  if (lower.includes("confirm") || lower.includes("success") || lower.includes("accept")) {
    return <CheckCircle className="h-5 w-5 text-emerald-500" />;
  }
  return <Info className="h-5 w-5 text-blue-500" />;
};

const getNotificationColor = (message: string) => {
  const lower = message.toLowerCase();
  if (lower.includes("cancel") || lower.includes("fail") || lower.includes("reject")) {
    return "border-l-red-500 bg-red-50/50 dark:bg-red-950/10";
  }
  if (lower.includes("confirm") || lower.includes("success") || lower.includes("accept") || lower.includes("deliver")) {
    return "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10";
  }
  return "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10";
};

// 🚀 MASTER REFACTOR: Fires native alerts into Windows/Mac/Android Notification Centers via Service Worker
const dispatchNativeSystemTrayNotification = async (title: string, bodyText: string) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    // 🎯 CRITICAL FIX: Query the active Service Worker registration shell to force OS integration
    const registration = await navigator.serviceWorker.ready;
    
    const notificationOptions: any = {
      body: bodyText,
      icon: "/logo192.png", // Path to your VillageMart icon asset
      badge: "/logo192.png", // Short-form mobile status bar glyph identifier
      tag: "villagemart-order-update", // Deduplicates stacked system cards
      renotify: true, // Wake/vibrate the active host device channel on incoming updates
      data: {
        clickUrl: window.location.origin + "/notifications" // Deep link configuration
      }
    };

    await registration.showNotification(title, notificationOptions);
  } catch (err) {
    console.warn("⚠️ Service Worker fallback triggered, falling back to standard window Notification instance:", err);
    // Secondary local fallback if the Service Worker thread is currently initializing
    try {
      new Notification(title, { body: bodyText, icon: "/logo192.png" });
    } catch (fallbackErr) {
      console.error("❌ Both native notification pipelines failed:", fallbackErr);
    }
  }
};

const Notifications: React.FC<Props> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // CRITICAL FIX: Cross-verify user ID with triple-fallback — React prop → nested key → localStorage cache
  const activeUserId = user?.id || user?.user_id || (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')?.id;
    } catch {
      return undefined;
    }
  })();

  const latestNotifIdRef = useRef<number | null>(null);

  // 🎯 STEP A: Request hardware-level permission on component mount
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          console.log(`🖥️ Native Device Notification permission state: ${permission}`);
        });
      }
    }
  }, []);

  const fetchNotifications = async (isInitial = false) => {
    if (!activeUserId || String(activeUserId) === 'undefined') return;

    try {
      // 1. Correct relative GET endpoint (appends the numerical userId parameter)
      const response: any = await apiClient.get(`/notifications/${activeUserId}`);
      
      if (typeof response === 'string' && response.includes('<!DOCTYPE')) {
        setNotifications([]);
        return;
      }

      const safeArray = Array.isArray(response) ? response : [];

      // 🎯 REFACTOR ADDITION: Trigger native OS banner for newly detected notifications
      if (safeArray.length > 0) {
        const newestNotif = safeArray[0];
        if (latestNotifIdRef.current !== null && latestNotifIdRef.current !== newestNotif.id) {
          const alertTitle = "VillageMart Update 🎉";
          const alertBody = newestNotif.message || "Check your app for recent delivery status items.";
          dispatchNativeSystemTrayNotification(alertTitle, alertBody);
        }
        latestNotifIdRef.current = newestNotif.id;
      }

      setNotifications(safeArray);
    } catch (error) {
      console.warn("Gracefully bypassed background data tracking fault:", error);
      setNotifications([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      // 2. Correct relative POST endpoint matching router.post("/read") 🎯
      // Do not append the trailing "/${activeUserId}" to the path string since the backend token extracts it!
      await apiClient.post('/notifications/read');
      console.log("✅ Notifications successfully updated to read state locally");
    } catch (err) {
      console.error("❌ Failed to mark notifications as read:", err);
    }
  };

  useEffect(() => {
    if (!activeUserId || String(activeUserId) === 'undefined') {
      console.warn("⏳ Deferring notification query: No active session ID properties found.");
      setLoading(false);
      return;
    }

    // Initial load
    fetchNotifications(true);
    markAsRead();

    // 5-second short-polling
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeUserId]);

  return (
    <motion.div
      className="p-6 max-w-4xl mx-auto pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
          <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
      </motion.div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <motion.div
          className="text-center py-20 bg-card rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-6xl mb-4">🔔</div>
          <p className="text-foreground text-lg font-semibold">No notifications yet.</p>
          <p className="text-sm text-muted-foreground mt-2">We'll notify you when something happens!</p>
        </motion.div>
      )}

      <AnimatePresence mode="popLayout">
        {!loading && notifications.length > 0 && (
          <motion.div
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {notifications
              .filter((notification) => {
                // Protect comparison loop routines against string/number mismatches
                const matchesUser = String(notification.userId) === String(activeUserId);
                return matchesUser;
              })
              .map((n) => (
              <motion.div
                key={n.id}
                variants={itemVariants}
                layout
                whileHover={{ x: 4, scale: 1.005 }}
                className={`border-l-4 rounded-2xl p-4 shadow-sm transition-all duration-300 hover:shadow-md flex items-start gap-3 ${
                  getNotificationColor(n.message)
                } ${String(n.isRead) === '1' ? "opacity-60" : "bg-white dark:bg-card"}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                  {getNotificationIcon(n.message)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-relaxed text-foreground">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>

                {String(n.isRead) !== '1' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5 animate-pulse" />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Notifications;
