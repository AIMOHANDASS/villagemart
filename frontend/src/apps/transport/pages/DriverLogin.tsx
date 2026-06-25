import { useState } from "react";
import { motion } from "framer-motion";
import { Car, Eye, EyeOff } from "lucide-react";
import { loginUser } from "../api";
import toast from "react-hot-toast";
import { navigateToQueryPath } from "../../../App";

export default function DriverLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      // ✅ FIXED: Ensure stored user object always carries the role property 🎯
      const userObj = data.user || data.data || data;
      userObj.role = String(data.role || userObj.role || "TRANSPORT").toUpperCase();
      localStorage.setItem("transport_user", JSON.stringify(userObj));
      toast.success("Welcome, Driver!");
      navigateToQueryPath("transport", "");
    } catch (err: any) { toast.error(err.message || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-200">
              <Car className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">VillageMart Transport</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to start driving</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-200 disabled:opacity-60 text-base">
              {loading ? "Signing in..." : "Start Driving 🚖"}
            </motion.button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Don't have an account? <button type="button" onClick={() => navigateToQueryPath("transport", "signup")} className="text-amber-600 font-semibold hover:underline">Sign up</button>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
