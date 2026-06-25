import React, { useState, useEffect, lazy, Suspense } from "react";
import { io } from "socket.io-client";

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
import OtpPopup from "@/components/OtpPopup";

/* ======================================================
   🔍 HOSTNAME DETECTOR
====================================================== */
export const parseQueryRouting = () => {
  // 1. Build environment override
  const buildMode = import.meta.env.VITE_APP_MODE;
  if (buildMode && ["admin", "delivery", "transport", "consumer"].includes(buildMode)) {
    return { mode: buildMode, subPath: "" };
  }

  // 2. Query routing parser
  const searchParams = new URLSearchParams(window.location.search);
  const appRaw = searchParams.get("app") || ""; 
  
  if (!appRaw) {
    // 3. Fallback to runtime hostname
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.startsWith("admin.") || hostname.includes("villagemart-admin")) return { mode: "admin", subPath: "" };
    if (hostname.startsWith("delivery.") || hostname.includes("villagemart-delivery")) return { mode: "delivery", subPath: "" };
    if (hostname.startsWith("transport.") || hostname.includes("villagemart-transport")) return { mode: "transport", subPath: "" };
    return { mode: "consumer", subPath: "" };
  }

  const [mode, ...subPathParts] = appRaw.split("/");
  const subPath = subPathParts.join("/");
  
  return { mode, subPath };
};

export const navigateToQueryPath = (appMode: string, path: string = "") => {
  const targetQuery = path ? `?app=${appMode}/${path}` : `?app=${appMode}`;
  window.location.href = `${window.location.origin}/${targetQuery}`;
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
    setUser(userObj);
  };

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
  const { mode: activeMode } = parseQueryRouting();

  useEffect(() => {
    // Save to global window object for debug access
    (window as any).appMode = activeMode;

    // 🌐 GLOBAL SOCKET CONNECTION (Listens for admin force reloads)
    // Uses the current window hostname to automatically resolve the backend URL
    const SOCKET_URL = window.location.hostname === "localhost" 
      ? "http://localhost:8080" 
      : "https://villagesmart.in";
      
    const socket = io(SOCKET_URL);
    
    socket.on("system_reload", () => {
      console.log("⚠️ System Administrator initiated a global reload sequence.");
      window.location.reload();
    });

    return () => {
      socket.disconnect();
    };
  }, [activeMode]);

  return (
    <Suspense fallback={<AppLoader label="Application" />}>
      {activeMode === "admin" && <AdminApp />}
      {activeMode === "delivery" && <DeliveryApp />}
      {activeMode === "transport" && <TransportApp />}
      {activeMode === "consumer" && <ConsumerApp />}
    </Suspense>
  );
};

export default App;
