import React, { useState, useEffect, lazy, Suspense } from "react";
import { io } from "socket.io-client";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";

/* ======================================================
   🌐 HOSTNAME-BASED APP ROUTER
   
   Single unified entry point that routes to the correct
   sub-application based on the browser's hostname:
   
   admin.villagesmart.in     → Admin Dashboard
   delivery.villagesmart.in  → Delivery Partner Portal
   transport.villagesmart.in → Transport Partner Portal
   villagesmart.in (default) → Consumer App
====================================================== */

// ✅ Lazy-load each sub-app for code-splitting (only loads the relevant bundle)
const AdminApp = lazy(() => import("@/apps/admin/App"));
const DeliveryApp = lazy(() => import("@/apps/delivery/App"));
const TransportApp = lazy(() => import("@/apps/transport/App"));

// Consumer app components (loaded inline since it's the primary/default app)
import AppRoutes from "./router";
import MobileBottomNav from "@/components/MobileBottomNav";
import AiAssistant from "@/components/AiAssistant";
import { Toaster } from "react-hot-toast";
import { API_BASE_URL } from "@/api/apiClient";
import OtpPopup from "@/components/OtpPopup";

/* ======================================================
   🔍 SUBDOMAIN ROUTING INTERCEPTOR (Runs once on boot)
====================================================== */
const enforceSubdomainMocking = () => {
  if (typeof window === "undefined") return;
  
  const hostname = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  
  // Only inject the mock if we don't already have the ?app query active
  if (!searchParams.has("app")) {
    let activeApp = "";
    if (hostname.startsWith("admin.")) activeApp = "admin";
    else if (hostname.startsWith("delivery.")) activeApp = "delivery";
    else if (hostname.startsWith("transport.")) activeApp = "transport";
    
    if (activeApp) {
      // Map current pathname to ?app context (e.g., /login -> ?app=transport/login)
      const pathPart = window.location.pathname.replace(/^\/+/, "");
      const appValue = pathPart ? `${activeApp}/${pathPart}` : activeApp;
      
      searchParams.set("app", appValue);
      const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
      
      // Silently rewrite the URL history BEFORE React evaluates the routing tree
      window.history.replaceState(null, "", newUrl);
    }
  }
};
// Execute immediately to mock the context seamlessly
enforceSubdomainMocking();

/* ======================================================
   🔍 HOSTNAME DETECTOR
====================================================== */
export const parseQueryRouting = () => {
  const buildMode = import.meta.env.VITE_APP_MODE;
  const isHardcodedMode = buildMode && ["admin", "delivery", "transport", "consumer"].includes(buildMode);

  const searchParams = new URLSearchParams(window.location.search);
  const appRaw = searchParams.get("app") || ""; 
  
  // 1. If we have a query parameter (e.g., from the mock interceptor or local dev)
  if (appRaw) {
    const [mode, ...subPathParts] = appRaw.split("/");
    const subPath = subPathParts.join("/");
    return { 
      mode: isHardcodedMode ? buildMode : mode, 
      subPath 
    };
  }

  // 2. Fallback to clean path / hostname parsing
  const hostname = window.location.hostname.toLowerCase();
  let mode = "consumer";
  
  if (hostname.startsWith("admin.") || hostname.includes("villagemart-admin")) mode = "admin";
  else if (hostname.startsWith("delivery.") || hostname.includes("villagemart-delivery")) mode = "delivery";
  else if (hostname.startsWith("transport.") || hostname.includes("villagemart-transport")) mode = "transport";

  const subPath = window.location.pathname.replace(/^\/+/, "");
  
  return { 
    mode: isHardcodedMode ? buildMode : mode, 
    subPath 
  };
};

export const navigateToQueryPath = (appMode: string, path: string = "") => {
  const hostname = window.location.hostname.toLowerCase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. If running on local machine, use your perfectly working query-based logic
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    const targetQuery = path ? `?app=${appMode}/${path}` : `?app=${appMode}`;
    window.location.href = `${window.location.origin}/${targetQuery}`;
    return;
  }

  // 2. Production Environment: Enforce strict isolated subdomain mapping
  let targetDomain = "villagesmart.in";
  if (appMode === "admin") targetDomain = "admin.villagesmart.in";
  else if (appMode === "delivery") targetDomain = "delivery.villagesmart.in";
  else if (appMode === "transport") targetDomain = "transport.villagesmart.in";

  // Seamlessly route to the clean subdomain path without query parameters!
  window.location.href = `https://${targetDomain}${cleanPath}`;
};

/* ======================================================
   ⏳ LOADING SPINNER (shown while lazy chunks load)
====================================================== */
const AppLoader: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)",
      fontFamily: "'Inter', 'Poppins', system-ui, sans-serif",
      gap: "16px",
    }}
  >
    <div
      style={{
        width: "44px",
        height: "44px",
        border: "3px solid #e5e7eb",
        borderTopColor: "#16a34a",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <p style={{ color: "#6b7280", fontSize: "14px", fontWeight: 500 }}>
      Loading {label}…
    </p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* ======================================================
   🏠 CONSUMER APP (default)
====================================================== */
const ConsumerApp: React.FC = () => {
  const [user, setUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  /* ✅ Login */
  const handleLogin = (userObj: any) => {
    localStorage.setItem("user", JSON.stringify(userObj));
    localStorage.setItem("cached_user_phone", userObj?.phone || "");
    setUser(userObj);
  };

  /* ✅ Re-Sync Session with Backend */
  useEffect(() => {
    if (user && user.id) {
      fetch(`${API_BASE_URL}/profile/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) {
            const freshUser = { ...user, ...data };
            setUser(freshUser);
            localStorage.setItem("user", JSON.stringify(freshUser));
            if (freshUser.phone) {
              localStorage.setItem("cached_user_phone", String(freshUser.phone).trim());
            }
          }
        })
        .catch(err => console.error("Failed to sync session:", err));
    }
  }, []);

  /* ✅ Logout */
  const handleLogout = () => {
    localStorage.clear(); // Complete atomic wipeout of all local storage strings
    sessionStorage.clear();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <>
      {/* 🔔 Global Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "16px",
            padding: "14px 20px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          },
          success: {
            style: {
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
            },
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            style: {
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
            },
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      {/* 🌐 Routes */}
      <AppRoutes
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* 🧠 AI Assistant (floating chat) */}
      <AiAssistant />

      {/* 🧠 OTP Popup (Listener) */}
      <OtpPopup userId={user?.id} />

      {/* 📱 Mobile Bottom Navigation */}
      <MobileBottomNav user={user} />
    </>
  );
};

/* ======================================================
   🚀 ROOT APP — THE UNIFIED ENTRY POINT
====================================================== */
const App: React.FC = () => {
  const { mode: activeMode, subPath } = parseQueryRouting();
  const location = useLocation();
  const navigate = useNavigate();

  // 🛡️ NATIVE ANDROID PHYSICAL BACK BUTTON HARDENING
  useEffect(() => {
    const backButtonListener = CapacitorApp.addListener('backButton', () => {
      if (location.pathname === '/' || location.pathname === '') {
        // Absolute root view: allow native exit
        CapacitorApp.exitApp();
      } else {
        // History stack exists: step backward cleanly
        navigate(-1);
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [location, navigate]);

  useEffect(() => {
    (window as any).appMode = activeMode;

    // 🌐 THE ABSOLUTE FIX: FORCE SPLIT FAVICONS BY THE ACTIVE MODE
    const updateTabFavicon = () => {
      let faviconTarget = "/logo-consumer.png"; // Default fallback
      
      if (activeMode === "admin") faviconTarget = "/logo-admin.png";
      else if (activeMode === "delivery") faviconTarget = "/logo-delivery.png";
      else if (activeMode === "transport") faviconTarget = "/logo-transport.png";

      // Locate standard icon links or shortcut tags in the head segment
      const existingLinks = document.querySelectorAll("link[rel*='icon']");
      
      if (existingLinks.length > 0) {
        existingLinks.forEach((link: any) => {
          link.href = faviconTarget;
        });
      } else {
        // Fallback create tag if missing
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = faviconTarget;
        document.head.appendChild(newLink);
      }
    };

    // Run the favicon assignment immediately
    updateTabFavicon();

    // Fixed fallback to point to your live cloud api backend if not local
    const SOCKET_URL = window.location.hostname === "localhost" 
      ? "http://localhost:8080" 
      : "https://villagemart-api-841907471689.asia-south1.run.app";
      
    const socket = io(SOCKET_URL);
    
    socket.on("system_reload", () => {
      window.location.reload();
    });

    return () => {
      socket.disconnect();
    };
  }, [activeMode]);

  // Sync internal router histories on mount if deep subPaths exist
  useEffect(() => {
    if (subPath && window.location.pathname === "/") {
      window.history.replaceState(null, "", `/${subPath}${window.location.search}`);
    }
  }, [subPath]);

  return (
    <Suspense fallback={<AppLoader label={`${activeMode.toUpperCase()} Framework`} />}>
      {activeMode === "admin" && <AdminApp />}
      {activeMode === "delivery" && <DeliveryApp />}
      {activeMode === "transport" && <TransportApp />}
      {activeMode === "consumer" && <ConsumerApp />}
    </Suspense>
  );
};

export default App;
