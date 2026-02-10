// src/pages/Notifications.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Props = {
  user: any;
};

interface Notification {
  id: number;
  message: string;
  created_at: string;
  is_read?: number;
}

const API_BASE_URL = "https://villagesmart.in/api";

const Notifications: React.FC<Props> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    /* ✅ Fetch notifications */
    fetch(`${API_BASE_URL}/notifications/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Notification fetch error:", err);
        setLoading(false);
      });

    /* ✅ Mark notifications as read */
    fetch(`${API_BASE_URL}/notifications/read/${user.id}`, {
      method: "POST",
    }).catch((err) =>
      console.error("❌ Failed to mark notifications as read:", err)
    );
  }, [user]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔔 Notifications</h1>

      {loading && <p className="text-gray-500">Loading notifications...</p>}

      {!loading && notifications.length === 0 && (
        <p className="text-gray-500">No notifications yet.</p>
      )}

      <div className="space-y-3">
        {notifications.map((n, index) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`border rounded p-3 shadow-sm bg-white ${
              n.is_read ? "opacity-70" : "border-green-400"
            }`}
          >
            <p className="font-medium">{n.message}</p>

            <p className="text-xs text-gray-500 mt-1">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
