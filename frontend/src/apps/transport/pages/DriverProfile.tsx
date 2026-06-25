import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { User, LogOut, Phone, Mail, Shield, Car } from "lucide-react";
import { getStoredTransportUser } from "../api";

export default function DriverProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getStoredTransportUser();

  const handleSystemSignOut = () => {
    // Clear tracking session hashes safely
    localStorage.removeItem("token");
    localStorage.removeItem("transport_user");
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user?.username || "Driver"}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Transport Driver</p>
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
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Role</p>
              <p className="text-sm font-medium text-gray-700">Transport Driver</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={handleSystemSignOut} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 font-semibold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors text-base">
        <LogOut className="w-5 h-5" /> Sign Out
      </motion.button>
    </div>
  );
}
