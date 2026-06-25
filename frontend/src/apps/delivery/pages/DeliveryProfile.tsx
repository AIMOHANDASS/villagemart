import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, LogOut, Phone, Mail, Shield } from "lucide-react";
import { getStoredDeliveryUser } from "../api";
import { apiClient } from "../../../api/apiClient";

export default function DeliveryProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getStoredDeliveryUser();
  const [stats, setStats] = useState({ todayDeliveries: 0, pending: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [earningsRes, ordersRes] = await Promise.all([
          apiClient.get("/delivery/earnings"),
          apiClient.get("/delivery/orders")
        ]);
        
        const earningsData = (earningsRes as any)?.data || {};
        const ordersData = (ordersRes as any)?.data || [];

        const pendingCount = Array.isArray(ordersData) 
          ? ordersData.filter((o: any) => o.tracking_status !== "DELIVERED" && o.tracking_status !== "PENDING_PICKUP").length
          : 0;

        setStats({
          todayDeliveries: earningsData.todayDeliveries || 0,
          pending: pendingCount
        });
      } catch (err) {
        console.error("Failed to load profile stats:", err);
      }
    };
    if (user) fetchStats();
  }, [user]);

  const handleSystemSignOut = () => {
    // Clear tracking session hashes safely
    localStorage.removeItem("token");
    localStorage.removeItem("delivery_user");
    sessionStorage.clear();

    const currentAppScope = searchParams.get("app") || "";
    console.log(`🚪 Signout event caught for scope: "${currentAppScope}"`);

    // Target query redirect construction matrix
    if (currentAppScope.startsWith("delivery")) {
      navigate("/?app=delivery/login", { replace: true });
    } else if (currentAppScope.startsWith("transport")) {
      navigate("/?app=transport/login", { replace: true });
    } else if (currentAppScope.startsWith("admin")) {
      navigate("/?app=admin/login", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="pb-24 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user?.username || "Delivery Partner"}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Delivery Partner</p>
          </div>
        </div>

        <div className="space-y-3">
          {user?.email && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-700">{user.email}</p>
              </div>
            </div>
          )}
          {user?.phone && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm font-medium text-gray-700">{user.phone}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.todayDeliveries}</p>
          <p className="text-xs text-gray-500 mt-1">Today's Deliveries</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-gray-500 mt-1">Pending</p>
        </div>
      </motion.div>

      {/* Logout */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={handleSystemSignOut} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 font-semibold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors text-base">
        <LogOut className="w-5 h-5" /> Sign Out
      </motion.button>
    </div>
  );
}
