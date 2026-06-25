import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "../api";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please fill all fields");
      return;
    }

    // ✅ CLIENT-SIDE BYPASS FOR DEFAULT ADMIN
    if (username === "Mohan" && password === "mohan123") {
      localStorage.setItem("admin_token", "admin-token");
      toast.success("Welcome back, Admin Mohan! 🔐");
      navigate("/admin/dashboard");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/login`, { username, password });
      if (res.data.success) {
        localStorage.setItem("admin_token", res.data.token);
        toast.success("Welcome Admin!");
        navigate("/admin/dashboard");
      } else {
        toast.error("Invalid credentials");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-gray-200">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-sm text-gray-500 mt-1">VillageMart operations</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
              className="w-full py-3.5 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-md disabled:opacity-60 text-base">
              {loading ? "Authenticating..." : "Login to Dashboard"}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
