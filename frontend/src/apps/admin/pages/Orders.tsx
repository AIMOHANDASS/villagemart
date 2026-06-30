import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, Filter } from "lucide-react";
import { getAdminPanelData, API_BASE_URL } from "../api";

const getProductImageSrc = (url?: string) => {
  if (!url) return "/placeholder.png";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${cleanUrl}`;
};
import { apiClient } from "../../../api/apiClient";
import type { Order } from "../types";
import toast from "react-hot-toast";

const cancelReasons = ["More orders", "Distance unavailable", "Product not available", "Wrong location"];

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PICKED: "bg-indigo-100 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [garlandOrders, setGarlandOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"regular" | "garland">("regular");

  const fetchOrders = async () => {
    try {
      const data: any = await getAdminPanelData();
      setOrders(data.orders || []);
      setGarlandOrders(data.garlandOrders || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const i = setInterval(fetchOrders, 8000);
    return () => clearInterval(i);
  }, []);

  const garlandIds = useMemo(() => new Set(garlandOrders.map((o) => o.orderId)), [garlandOrders]);
  const regularOrders = useMemo(() => orders.filter((o) => !garlandIds.has(o.orderId)), [orders, garlandIds]);

  const currentList = tab === "garland" ? garlandOrders : regularOrders;

  const filteredOrders = currentList.filter((o) => {
    const status = (o.tracking_status || o.status || "").toUpperCase();
    const matchStatus = filterStatus === "ALL" || status === filterStatus;
    const matchSearch = !searchTerm || o.username?.toLowerCase().includes(searchTerm.toLowerCase()) || String(o.orderId).includes(searchTerm);
    return matchStatus && matchSearch;
  });

  const handleAction = async (id: number, action: string) => {
    setBusyId(id);
    try {
      const response = await apiClient.put(`/orders/update-status/${id}`, { action });
      toast.success(`Order action '${action}' successful!`);
      if (response.data?.order) {
        setOrders(prev => prev.map(o => o.orderId === id ? { ...o, ...response.data.order } : o));
        setGarlandOrders(prev => prev.map(o => o.orderId === id ? { ...o, ...response.data.order } : o));
      } else {
        await fetchOrders();
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setBusyId(null);
  };
  const handleCancel = async (id: number, reason: string) => {
    if (!reason) return;
    try { 
      await apiClient.post(`/orders/admin-cancel/${id}`, { reason }); 
      toast.success("Order cancelled"); 
      await fetchOrders(); 
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };
  const handleReminder = async (id: number) => {
    setBusyId(id);
    try { 
      await apiClient.post(`/orders/garland/reminder/${id}`); 
      toast.success("Reminder sent!"); 
      await fetchOrders(); 
    } catch (e: any) { 
      toast.error(e.message); 
    }
    setBusyId(null);
  };

  const getHoursLeft = (v?: string) => {
    if (!v) return null;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? null : (t - Date.now()) / 3600000;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filteredOrders.length} orders found</p>
        </div>
        <button onClick={() => { setLoading(true); fetchOrders(); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["regular", "garland"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "regular" ? "All Orders" : "Garland Orders"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-sm shadow-sm">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or order ID..." className="bg-transparent text-sm outline-none flex-1" />
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 shadow-sm">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-sm py-2 outline-none cursor-pointer">
            <option value="ALL">All Status</option>
            {Object.keys(statusColors).map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b border-gray-100">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timeline</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((order) => {
                const status = (order.status || "").toUpperCase();
                const isBusy = busyId === order.orderId;
                const hoursLeft = getHoursLeft(order.garland_delivery_at);
                const canRemind = tab === "garland" && !!order.garland_delivery_at && !!hoursLeft && hoursLeft > 0 && (order.garland_reminder_sent || 0) === 0;

                const currentStatus = order.status || "";
                const currentDeliveryStatus = order.delivery_status || "";

                let badgeText = currentStatus || "PENDING";
                let badgeColor = "bg-gray-100 text-gray-700";

                if (currentStatus === "PENDING") {
                  badgeText = "PENDING";
                  badgeColor = "bg-yellow-100 text-yellow-800";
                } else if (currentStatus === "ACCEPTED" && currentDeliveryStatus === "PENDING") {
                  badgeText = "ACCEPTED";
                  badgeColor = "bg-blue-100 text-blue-700";
                } else if (currentDeliveryStatus === "PICKED") {
                  badgeText = "PICKED";
                  badgeColor = "bg-purple-100 text-purple-700";
                } else if (currentDeliveryStatus === "OUT_FOR_DELIVERY") {
                  badgeText = "OUT FOR DELIVERY";
                  badgeColor = "bg-orange-100 text-orange-700";
                } else if (currentStatus === "DELIVERED") {
                  badgeText = "DELIVERED";
                  badgeColor = "bg-emerald-100 text-emerald-700";
                } else if (currentStatus === "CANCELLED") {
                  badgeText = "CANCELLED";
                  badgeColor = "bg-red-100 text-red-700";
                }

                return (
                  <tr key={order.orderId} className="hover:bg-gray-50/50 transition-colors align-top">
                    <td className="px-4 py-3.5 font-semibold text-sm text-gray-900">#{order.orderId}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-700">{order.username}</td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1.5 min-w-[200px]">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                             <img src={getProductImageSrc(item.image)} alt={item.product_name} className="w-8 h-8 rounded-lg object-cover border border-gray-100" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.png"; }} />
                            <div>
                              <p className="text-sm font-medium text-gray-800 leading-tight">{item.product_name}</p>
                              <p className="text-[11px] text-gray-400">₹{item.unit_price} × {item.weight}kg</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-bold text-gray-900">₹{Number(order.total_amount).toFixed(2)}</p>
                      <p className={`text-[10px] font-bold mt-1 uppercase tracking-wide ${order.payment_method === 'cod' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {order.payment_method === 'cod' ? '💵 COD' : '💳 ONLINE'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>{badgeText}</span>
                      {order.cancel_reason && <p className="text-[11px] text-red-500 mt-1">❌ {order.cancel_reason}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-gray-500 space-y-0.5 min-w-[140px]">
                      <p>📦 {new Date(order.created_at).toLocaleString("en-IN")}</p>
                      {order.picked_at && <p>🚛 {new Date(order.picked_at).toLocaleString("en-IN")}</p>}
                      {order.out_for_delivery_at && <p>🛵 {new Date(order.out_for_delivery_at).toLocaleString("en-IN")}</p>}
                      {order.delivered_at && <p>✅ {new Date(order.delivered_at).toLocaleString("en-IN")}</p>}
                      {tab === "garland" && order.garland_delivery_at && (
                        <>
                          <p className="text-orange-600 font-semibold">💐 {new Date(order.garland_delivery_at).toLocaleString("en-IN")}</p>
                          {hoursLeft !== null && <p className="text-orange-600">⏳ {hoursLeft > 0 ? `${Math.ceil(hoursLeft)} hrs left` : "Passed"}</p>}
                          <p className="text-indigo-600">🔔 {(order.garland_reminder_sent || 0) === 1 ? "Reminder Sent" : "Not sent"}</p>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5 min-w-[110px]">
                        <button disabled={isBusy || order.status !== "PENDING"} onClick={() => handleAction(order.orderId, "CONFIRM")} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Confirm</button>
                        <button disabled={isBusy || order.status !== "ACCEPTED" || order.delivery_status !== "PENDING"} onClick={() => handleAction(order.orderId, "PICK")} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Pick</button>
                        <button disabled={isBusy || order.delivery_status !== "PICKED"} onClick={() => handleAction(order.orderId, "OUT_FOR_DELIVERY")} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Out for Delivery</button>
                        <button disabled={isBusy || order.delivery_status !== "OUT_FOR_DELIVERY"} onClick={() => handleAction(order.orderId, "DELIVERED")} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Delivered</button>
                        {canRemind && (
                          <button disabled={isBusy} onClick={() => handleReminder(order.orderId)} className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors">Send Reminder</button>
                        )}
                        <select disabled={["DELIVERED", "CANCELLED"].includes(status) || isBusy} defaultValue="" onChange={(e) => { handleCancel(order.orderId, e.target.value); e.currentTarget.value = ""; }} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs cursor-pointer disabled:opacity-40">
                          <option value="">Cancel ▾</option>
                          {cancelReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
