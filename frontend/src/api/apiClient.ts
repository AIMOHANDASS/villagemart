import axios from "axios";
import toast from "react-hot-toast";

// Target our active cloud run address directly in production, falling back to local port 8080 🎯
const BASE_URL = import.meta.env.DEV 
  ? "http://localhost:8080/api" 
  : (import.meta.env.VITE_API_URL || "");

export const API_BASE_URL = BASE_URL;

const getAppTokenKey = (): string => {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const appMode = import.meta.env.VITE_APP_MODE;

  // 1. Check build environment definitions
  if (appMode === "admin") return "jwt_token_admin";
  if (appMode === "delivery") return "jwt_token_delivery";
  if (appMode === "transport") return "jwt_token_transport";

  // 2. URL Search Parameter Override (?app=transport or ?app=transport/earnings)
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    const queryMode = (searchParams.get('app') || "").split("/")[0]; // ✅ FIXED: Extract base app mode before any subpath
    if (queryMode === "admin") return "jwt_token_admin";
    if (queryMode === "delivery") return "jwt_token_delivery";
    if (queryMode === "transport") return "jwt_token_transport";
  }

  // 3. Strict Hostname / Domain evaluations
  if (hostname.startsWith("admin.") || hostname.includes("villagemart-admin") || hostname.includes("-admin") || hostname.includes("admin")) {
    return "jwt_token_admin";
  }
  if (hostname.startsWith("delivery.") || hostname.includes("villagemart-delivery") || hostname.includes("-delivery") || hostname.includes("delivery")) {
    return "jwt_token_delivery";
  }
  if (hostname.startsWith("transport.") || hostname.includes("villagemart-transport") || hostname.includes("-transport") || hostname.includes("transport")) {
    return "jwt_token_transport";
  }

  // 4. Subfolder deep path routing fallbacks
  if (pathname.includes("admin")) return "jwt_token_admin";
  if (pathname.includes("delivery")) return "jwt_token_delivery";
  if (pathname.includes("transport")) return "jwt_token_transport";

  return "jwt_token";
};

/**
 * Determine the current application context for smarter 401 handling.
 * Returns "admin" | "delivery" | "transport" | "consumer"
 */
const getAppContext = (): string => {
  const tokenKey = getAppTokenKey();
  if (tokenKey === "jwt_token_admin") return "admin";
  if (tokenKey === "jwt_token_delivery") return "delivery";
  if (tokenKey === "jwt_token_transport") return "transport";
  return "consumer";
};

/**
 * Check if the 401 error payload indicates a genuinely expired/invalid session,
 * versus a transient authorization failure on a single action.
 */
const isSessionExpiredError = (error: any): boolean => {
  const message = error.response?.data?.message || "";
  const expiredPhrases = [
    "Invalid or expired token",
    "expired token",
    "jwt expired",
    "jwt malformed",
    "Token has expired",
  ];
  return expiredPhrases.some(
    (phrase) => message.toLowerCase().includes(phrase.toLowerCase())
  );
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request Interceptor: Inject JWT token automatically
apiClient.interceptors.request.use(
  (config) => {
    const tokenKey = getAppTokenKey();
    let token = localStorage.getItem(tokenKey);
    
    // Strict isolation: Do not fallback to consumer token for partner/admin apps 🎯
    if (!token && tokenKey === "jwt_token") {
      token = localStorage.getItem("token"); // Legacy consumer fallback
    }

    // Fallback support for old admin_token storage key
    if (!token && tokenKey === "jwt_token_admin") {
      token = localStorage.getItem("admin_token");
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Prevent sending broken layout tokens
      delete config.headers.Authorization;
    }

    // Debug: log outgoing auth header in development
    if (import.meta.env.DEV) {
      console.debug(
        `📡 [apiClient] ${config.method?.toUpperCase()} ${config.url}`,
        `| Token Key: ${tokenKey}`,
        `| Token Present: ${!!token}`
      );
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle token expiration / 401s gracefully
apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Return only response data to match existing return expectations
  },
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message || error.message || "Request failed";
    const appContext = getAppContext();
    const isOnLoginPage = window.location.pathname.endsWith("/login");

    // ──────────────────────────────────────────────────────────────────────
    // 401 UNAUTHORIZED — Differentiated handling
    // ──────────────────────────────────────────────────────────────────────
    if (status === 401) {
      // ── BACKGROUND POLLING INSULATION ──────────────────────────────────
      // Notification background fetches (NotificationBell, MobileBottomNav,
      // Header) may fire before a valid session is fully established or with
      // a stale token. Absorb these silently instead of triggering a
      // system-wide localStorage purge + redirect-to-login loop.
      const requestUrl = error.config?.url || '';
      if (requestUrl.includes('/notifications')) {
        console.warn("🔐 Suppressed system logout: Isolated background notification synchronization anomaly.");
        return Promise.resolve({ data: [] });
      }

      const tokenKey = getAppTokenKey();
      const currentToken = localStorage.getItem(tokenKey);
      const fallbackToken = tokenKey === "jwt_token_admin" ? localStorage.getItem("admin_token") : null;
      const actualTokenSent = error.config?.headers?.Authorization;
      const hasAdminSession = !!localStorage.getItem("admin_user");
      const expired = isSessionExpiredError(error);

      // Log details if in the admin app context
      if (appContext === "admin") {
        console.group("🔐 [apiClient] Admin Action 401 Mismatch Parameters");
        console.warn("Endpoint:", `${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        console.warn("Token Key Resolved:", tokenKey);
        console.warn("Current Token in Key:", currentToken);
        console.warn("Fallback Admin Token:", fallbackToken);
        console.warn("Authorization Header Sent:", actualTokenSent);
        console.warn("Admin User Session in Storage:", localStorage.getItem("admin_user"));
        console.warn("Server Error Message:", serverMessage);
        console.warn("Is Expired Message:", expired);
        console.groupEnd();
      }

      // Check if application currently has a valid admin user session in progress
      if (appContext === "admin" && hasAdminSession) {
        if (expired) {
          if (!isOnLoginPage) {
            console.warn("🔐 Admin Session expired. Clearing credentials and redirecting...");
            toast.error("Session expired. Logging out...");
            const adminKeys = ["jwt_token_admin", "admin_user", "admin_token", "user_role_admin"];
            adminKeys.forEach((key) => localStorage.removeItem(key));
            window.location.href = "/?app=admin/login";
          }
        } else {
          // Display distinct error alert banner
          toast.error("Action Unauthorized: Checking credential headers...", {
            duration: 5000,
            icon: "🔒",
            style: {
              background: "#fef3c7",
              color: "#92400e",
              border: "1px solid #fde68a",
              fontWeight: "500",
            },
          });
        }
        return Promise.reject(new Error(serverMessage));
      }

      // CASE 1: No token at all → session was never established or storage was cleared
      if (!currentToken) {
        if (!isOnLoginPage) {
          toast.error("No active session found. Please log in.");
          const loginUrl = appContext === "consumer" ? "/login" : `/?app=${appContext}/login`;
          window.location.href = loginUrl;
        }
        return Promise.reject(new Error(serverMessage));
      }

      // CASE 2: Token exists but server says it's expired/invalid → genuine session expiry
      if (expired) {
        if (!isOnLoginPage) {
          console.warn("🔐 Session expired. Clearing credentials and redirecting...");
          toast.error("Session expired. Logging out...");

          // Clear only the relevant app's storage — don't nuke other apps' sessions
          const appKeyMap: Record<string, string[]> = {
            admin: ["jwt_token_admin", "admin_user", "admin_token", "user_role_admin"],
            delivery: ["jwt_token_delivery", "delivery_user", "role"],
            transport: ["jwt_token_transport", "transport_user", "role"],
            consumer: ["jwt_token", "user", "user_role"],
          };
          const keysToClear = appKeyMap[appContext] || appKeyMap.consumer;
          keysToClear.forEach((key) => localStorage.removeItem(key));

          const loginUrl = appContext === "consumer" ? "/login" : `/?app=${appContext}/login`;
          window.location.href = loginUrl;
        }
        return Promise.reject(new Error(serverMessage));
      }

      // CASE 3: Token exists, NOT an expiry error → transient action-level auth failure
      //   (e.g., role mismatch, permission denied on specific endpoint, stale CSRF)
      //   Do NOT wipe storage or redirect. Show an actionable error banner instead.
      console.warn(
        "⚠️ [apiClient] Action unauthorized but session is still valid.",
        "Not redirecting. The user can retry or check permissions."
      );
      toast.error(`Action Unauthorized: ${serverMessage}`, {
        duration: 5000,
        icon: "🔒",
        style: {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fde68a",
          fontWeight: "500",
        },
      });

      return Promise.reject(new Error(serverMessage));
    }

    // ──────────────────────────────────────────────────────────────────────
    // 403 FORBIDDEN — Role/permission error (never wipe session)
    // ──────────────────────────────────────────────────────────────────────
    if (status === 403) {
      console.warn(`🚫 [apiClient] 403 Forbidden on ${appContext.toUpperCase()} app: ${serverMessage}`);
      toast.error(`Access Denied: ${serverMessage}`, {
        duration: 4000,
        icon: "🚫",
      });
      return Promise.reject(new Error(serverMessage));
    }

    // ──────────────────────────────────────────────────────────────────────
    // All other errors — pass through
    // ──────────────────────────────────────────────────────────────────────
    return Promise.reject(new Error(serverMessage));
  }
);
