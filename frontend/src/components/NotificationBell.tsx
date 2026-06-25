import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/api";

interface NotificationItem {
  id: number;
  userId?: number;
  message: string;
  isRead?: number;
  is_read?: number;
  createdAt?: string;
}

export default function NotificationBell({ user }: any) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const activeSessionId = user?.id || user?.user_id || user?.data?.id;
    const currentToken = localStorage.getItem("jwt_token") || localStorage.getItem("token");

    // If either session identifier is missing, do NOT fire the API call — it would
    // hit a 401 and trigger the interceptor's redirect-to-login flow.
    if (!activeSessionId || !currentToken || String(activeSessionId) === 'undefined') {
      setCount(0);
      return;
    }

    const fetchCount = () => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${currentToken}`,
      };

      fetch(`${API_BASE_URL}/notifications/${activeSessionId}`, { headers })
        .then(async (res) => {
          // If response is unauthenticated or encounters an issue, return a fallback array object
          if (!res.ok) {
            return [];
          }
          const text = await res.text();
          if (text.includes('<!DOCTYPE') || text.trim().startsWith('<')) {
            return [];
          }
          return JSON.parse(text);
        })
        .then((data) => {
          // BULLETPROOF TYPE GUARD CHECK 🎯
          const safeDataArray = Array.isArray(data) ? data : [];
          
          const unread = safeDataArray.filter((n: any) => {
            if (!n) return false;
            const isReadVal = n.isRead !== undefined ? n.isRead : n.is_read;
            // Safely check for numeric 1/0, boolean true/false, or string variants
            return String(isReadVal) === '0' || isReadVal === false;
          }).length;
          
          setCount(unread);
        })
        .catch((err) => {
          console.warn("🔐 Handled bell count background authentication check:", err);
          setCount(0); // Safely fall back to 0 notifications instead of crashing the UI
        });
    };

    // Run immediately on user mount
    fetchCount();

    // Short-poll notification counter smoothly every 10 seconds
    const pollInterval = setInterval(fetchCount, 10000);
    return () => clearInterval(pollInterval);
  }, [user?.id, user?.user_id, user?.data?.id]);

  return (
    <div className="relative inline-flex items-center">
      <Bell className="h-5 w-5 text-foreground hover:opacity-80 transition-opacity cursor-pointer" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 animate-pulse select-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}
