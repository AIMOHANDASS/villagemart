import React, { useEffect, useState } from "react";
import { Home, ShoppingCart, Package, Bell, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/api";
import { motion } from "framer-motion";

type Props = {
  user: any;
};

const MobileBottomNav: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const [shouldHideBar, setShouldHideBar] = useState(false);
  const [previousScrollY, setPreviousScrollY] = useState(0);

  /* 🛒 Cart Count */
  const updateCartCount = () => {
    const raw = localStorage.getItem("cart");
    const cart = raw ? JSON.parse(raw) : [];
    setCartCount(cart.length);
  };

  /* 🔔 Notification Count */
  const fetchNotificationCount = async () => {
    const activeSessionId = user?.id || user?.user_id || user?.data?.id;
    const currentToken = localStorage.getItem("jwt_token") || localStorage.getItem("token");

    if (!activeSessionId || !currentToken || String(activeSessionId) === 'undefined') {
      setNotificationCount(0);
      return;
    }

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`,
      };

      const res = await fetch(
        `${API_BASE_URL}/notifications/${activeSessionId}`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const text = await res.text();
      if (text.includes('<!DOCTYPE') || text.trim().startsWith('<')) {
        console.warn("Intercepted HTML response from notification endpoint, safely defaulting to empty array.");
        setNotificationCount(0);
        return;
      }
      const response = JSON.parse(text);
      // Guard clause to ensure object payloads or 401 data cannot crash React
      const safeArray = Array.isArray(response) 
        ? response 
        : (response && typeof response === 'object' && Array.isArray((response as any).notifications))
          ? (response as any).notifications
          : [];

      // Count unread notifications
      const unread = safeArray.filter((n: any) => {
        const isReadVal = n.isRead !== undefined ? n.isRead : n.is_read;
        return !isReadVal;
      }).length;

      setNotificationCount(unread);
    } catch (error) {
      console.warn("Gracefully bypassed background tracking authentication fault:", error);
      setNotificationCount(0);
    }
  };

  /* 🔁 INIT + AUTO REFRESH */
  useEffect(() => {
    updateCartCount();
    fetchNotificationCount();

    window.addEventListener("storage", updateCartCount);

    const interval = setInterval(() => {
      updateCartCount();
      fetchNotificationCount();
    }, 5000); // refresh every 5 sec

    return () => {
      window.removeEventListener("storage", updateCartCount);
      clearInterval(interval);
    };
  }, [user]);

  /* 🎯 AUTO-HIDE SCROLL LOGIC */
  useEffect(() => {
    const processWindowScrollDirection = () => {
      const currentScrollYPosition = window.scrollY;

      // Hides navbar on downscroll, reveals it cleanly on upscroll
      if (currentScrollYPosition > previousScrollY && currentScrollYPosition > 60) {
        setShouldHideBar(true); // User is scrolling DOWN -> Hide the bar
      } else {
        setShouldHideBar(false); // User is scrolling UP -> Bring navigation links back down instantly
      }

      setPreviousScrollY(currentScrollYPosition);
    };

    window.addEventListener("scroll", processWindowScrollDirection, { passive: true });
    return () => window.removeEventListener("scroll", processWindowScrollDirection);
  }, [previousScrollY]);

  /* 🔐 Navigation Guard */
  const go = async (path: string, protectedRoute = false) => {
    if (protectedRoute && !user) {
      navigate("/login");
      return;
    }

    // ✅ If user opens Alerts → mark notifications as read
    const activeSessionId = user?.id || user?.user_id || user?.data?.id;
    if (path === "/notifications" && activeSessionId && String(activeSessionId) !== 'undefined') {
      try {
        const token = localStorage.getItem("jwt_token") || localStorage.getItem("token");
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        await fetch(
          `${API_BASE_URL}/notifications/read/${activeSessionId}`,
          {
            method: "POST",
            headers,
          }
        );
        setNotificationCount(0);
      } catch (err) {
        console.error("❌ Failed to mark notifications read:", err);
      }
    }

    navigate(path);
  };

  /* 🎯 Nav Items Config */
  const navItems = [
    { path: "/", label: "Home", icon: Home, badge: undefined, protected: false },
    { path: "/cart", label: "Cart", icon: ShoppingCart, badge: cartCount, protected: true },
    { path: "/my-orders", label: "Orders", icon: Package, badge: undefined, protected: true },
    { path: "/notifications", label: "Alerts", icon: Bell, badge: notificationCount, protected: true },
    { path: "/profile", label: "Profile", icon: User, badge: undefined, protected: true },
  ];

  return (
    <div className={`fixed bottom-4 left-4 right-4 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-white/20 dark:border-stone-800 flex md:hidden z-[999] shadow-2xl rounded-full mobile-bottom-nav transition-transform duration-300 ${shouldHideBar ? 'translate-y-[200%]' : 'translate-y-0'}`}>
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <motion.button
            key={item.path}
            onClick={() => go(item.path, item.protected)}
            className={`flex flex-col items-center justify-center flex-1 h-16 min-w-[48px] relative transition-all duration-300
              ${active ? "text-emerald-600 dark:text-emerald-400" : "text-stone-400 hover:text-emerald-500"}
            `}
            whileTap={{ scale: 0.92 }}
          >
            {/* Active Background Pill */}
            {active && (
              <motion.div
                className="absolute inset-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full -z-10"
                layoutId="activeMobileTabBg"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            <div className="relative flex flex-col items-center justify-center pt-1">
              <motion.div
                animate={active ? { scale: [1, 1.2, 1], y: -2 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              </motion.div>

              {item.badge !== undefined && item.badge > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className="absolute -top-2 -right-3"
                >
                  <Badge className="h-5 min-w-[20px] text-[10px] font-bold flex items-center justify-center bg-rose-500 text-white border-2 border-white dark:border-stone-900 rounded-full px-1 shadow-sm">
                    {item.badge}
                  </Badge>
                </motion.div>
              )}
            </div>

            <span className={`text-[9px] mt-0.5 font-bold uppercase tracking-wider ${active ? "text-emerald-700 dark:text-emerald-400" : "opacity-0 h-0 overflow-hidden"} transition-all duration-300`}>
              {item.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
