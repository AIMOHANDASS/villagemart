import React, { useEffect, useState } from "react";
import { Home, ShoppingCart, Package, Bell, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/api";

type Props = {
  user: any;
};

const MobileBottomNav: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  /* 🛒 Cart Count */
  const updateCartCount = () => {
    const raw = localStorage.getItem("cart");
    const cart = raw ? JSON.parse(raw) : [];
    setCartCount(cart.length);
  };

  /* 🔔 Notification Count */
  const fetchNotificationCount = async () => {
    if (!user?.id) {
      setNotificationCount(0);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/notifications/${user.id}`
      );
      const data = await res.json();

      // Count unread notifications
      const unread = (data || []).filter(
        (n: any) => n.is_read === 0
      ).length;

      setNotificationCount(unread);
    } catch (err) {
      console.error("❌ Notification count error:", err);
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

  /* 🔐 Navigation Guard */
  const go = async (path: string, protectedRoute = false) => {
    if (protectedRoute && !user) {
      navigate("/login");
      return;
    }

    // ✅ If user opens Alerts → mark notifications as read
    if (path === "/notifications" && user?.id) {
      try {
        await fetch(
          `${API_BASE_URL}/notifications/read/${user.id}`,
          { method: "POST" }
        );
        setNotificationCount(0);
      } catch (err) {
        console.error("❌ Failed to mark notifications read:", err);
      }
    }

    navigate(path);
  };

  /* 🎯 Single Nav Item */
  const navItem = (
    path: string,
    label: string,
    icon: React.ReactNode,
    badge?: number,
    protectedRoute = false
  ) => {
    const active = location.pathname === path;

    return (
      <button
        onClick={() => go(path, protectedRoute)}
        className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200
          ${active ? "text-primary scale-110" : "text-gray-500 hover:text-primary"}
        `}
      >
        <div className="relative">
          {icon}

          {badge !== undefined && badge > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 text-xs flex items-center justify-center bg-red-600 text-white">
              {badge}
            </Badge>
          )}
        </div>

        <span className="text-xs mt-1">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg flex md:hidden z-50">

      {navItem("/", "Home", <Home size={22} />)}

      {navItem("/cart", "Cart", <ShoppingCart size={22} />, cartCount, true)}

      {navItem("/my-orders", "Orders", <Package size={22} />, undefined, true)}

      {/* 🔔 Notification Badge */}
      {navItem(
        "/notifications",
        "Alerts",
        <Bell size={22} />,
        notificationCount,
        true
      )}

      {navItem("/profile", "Profile", <User size={22} />, undefined, true)}

    </div>
  );
};

export default MobileBottomNav;
