import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Package,
  Users,
  Truck,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  PartyPopper,
} from "lucide-react";
import { getAdminPanelData } from "../api";
import type { Order, TransportBooking, PartyHallBooking } from "../types";

interface StatsCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend?: string;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [garlandOrders, setGarlandOrders] = useState<Order[]>([]);
  const [transportBookings, setTransportBookings] = useState<TransportBooking[]>([]);
  const [partyHallBookings, setPartyHallBookings] = useState<PartyHallBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAdminPanelData();
        setOrders(data.orders || []);
        setGarlandOrders(data.garlandOrders || []);
        setTransportBookings(data.transportBookings || []);
        setPartyHallBookings(data.partyHallBookings || []);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const allOrders = [...orders, ...garlandOrders];
  const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const pendingOrders = allOrders.filter((o) => (o.tracking_status || o.status)?.toUpperCase() === "PENDING");
  const deliveredOrders = allOrders.filter((o) => (o.tracking_status || o.status)?.toUpperCase() === "DELIVERED");
  const cancelledOrders = allOrders.filter((o) => (o.tracking_status || o.status)?.toUpperCase() === "CANCELLED");

  const stats: StatsCard[] = [
    { label: "Total Orders", value: allOrders.length, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", trend: "+12%" },
    { label: "Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-50", trend: "+8%" },
    { label: "Pending", value: pendingOrders.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Delivered", value: deliveredOrders.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Cancelled", value: cancelledOrders.length, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Transport", value: transportBookings.length, icon: Truck, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Party Hall", value: partyHallBookings.length, icon: PartyPopper, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Garland Orders", value: garlandOrders.length, icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const recentOrders = allOrders.slice(0, 8);

  const getStatusBadge = (status?: string) => {
    const s = status?.toUpperCase();
    const map: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700",
      CONFIRMED: "bg-blue-100 text-blue-700",
      PICKED: "bg-indigo-100 text-indigo-700",
      OUT_FOR_DELIVERY: "bg-purple-100 text-purple-700",
      DELIVERED: "bg-emerald-100 text-emerald-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return map[s || ""] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="bg-white rounded-2xl p-4 lg:p-5 shadow-[var(--shadow-card)] border border-gray-100 hover:shadow-[var(--shadow-elevated)] transition-shadow duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.trend && (
                <span className="flex items-center text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  {stat.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <a href="/orders" className="text-sm text-[var(--color-primary)] font-medium hover:underline">
            View All →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">#{order.orderId}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{order.username}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{order.items?.length || 0} items</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">₹{Number(order.total_amount).toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.tracking_status || order.status)}`}>
                      {order.tracking_status || order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
