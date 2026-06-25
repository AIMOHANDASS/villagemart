import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "../api/apiClient";

interface OrderItem {
  product_name: string;
  unit_price: number;
  weight: number;
  total_price: number;
  image: string;
}

interface Order {
  orderId: number;
  username: string;
  total_amount: number;
  status: string;
  tracking_status?: string;
  cancel_reason?: string;
  created_at: string;
  picked_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  garland_delivery_at?: string;
  garland_reminder_sent?: number;
  garland_last_reminder_at?: string;
  items: OrderItem[];
}

interface TransportBooking {
  id: number;
  username: string;
  customer_name: string;
  customer_phone: string;
  from_address: string;
  from_lat?: number;
  from_lng?: number;
  to_address: string;
  to_lat?: number;
  to_lng?: number;
  distance_km: number;
  charge_amount: number;
  status: string;
  notes?: string;
  created_at: string;
}

interface PartyHallBooking {
  id: number;
  username: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  start_time: string;
  end_time: string;
  person_count: number;
  snacks_count: number;
  water_count: number;
  cake_count: number;
  add_ons_json?: string;
  notes?: string;
  total_charge: number;
  status: string;
  created_at: string;
}

const cancelReasons = [
  "More orders",
  "Distance unavailable",
  "Product not available",
  "Wrong location",
];

const getStatusColor = (status?: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "confirmed": return "bg-green-100 text-green-800";
    case "picked": return "bg-blue-100 text-blue-800";
    case "out_for_delivery": return "bg-purple-100 text-purple-800";
    case "delivered": return "bg-emerald-100 text-emerald-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
};

const getCurrentStatus = (order: Order) =>
  (order.tracking_status || order.status || "").toUpperCase();

const parseAddOns = (value?: string) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) { return []; }
};

const getHoursLeft = (value?: string) => {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return (target - Date.now()) / (1000 * 60 * 60);
};

interface AdminPanelProps {
  user?: any;
}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [activeTab, setActiveTab] = useState<"orders" | "garland" | "transport" | "hall">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [garlandOrders, setGarlandOrders] = useState<Order[]>([]);
  const [transportBookings, setTransportBookings] = useState<TransportBooking[]>([]);
  const [partyHallBookings, setPartyHallBookings] = useState<PartyHallBooking[]>([]);

  const garlandOrderIds = useMemo(() => new Set(garlandOrders.map((o) => o.orderId)), [garlandOrders]);
  const nonGarlandOrders = useMemo(() => orders.filter((o) => !garlandOrderIds.has(o.orderId)), [orders, garlandOrderIds]);

  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [remindingId, setRemindingId] = useState<number | null>(null);
  const [confirmingTransportId, setConfirmingTransportId] = useState<number | null>(null);
  const [confirmingPartyHallId, setConfirmingPartyHallId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const adminRes: any = await apiClient.get("/orders/admin/panel-data");
      setOrders(adminRes?.orders || []);
      setGarlandOrders(adminRes?.garlandOrders || []);
      setTransportBookings(adminRes?.transportBookings || []);
      setPartyHallBookings(adminRes?.partyHallBookings || []);
    } catch (err) {
      console.error("❌ Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const confirmOrder = async (orderId: number) => {
    try {
      setConfirmingId(orderId);
      await apiClient.post(`/orders/confirm/${orderId}`);
      await fetchOrders();
    } catch (error) { console.error(error); } finally { setConfirmingId(null); }
  };

  const updateStatus = async (orderId: number, status: string) => {
    try {
      setUpdatingId(orderId);
      await apiClient.post(`/orders/status/${orderId}`, { status });
      await fetchOrders();
    } catch (error) { console.error(error); } finally { setUpdatingId(null); }
  };

  const cancelOrder = async (orderId: number, reason: string) => {
    if (!reason) return;
    try {
      await apiClient.post(`/orders/admin-cancel/${orderId}`, { reason });
      await fetchOrders();
    } catch (error) { console.error(error); }
  };

  const sendGarlandReminder = async (orderId: number) => {
    try {
      setRemindingId(orderId);
      await apiClient.post(`/orders/garland/reminder/${orderId}`);
      await fetchOrders();
    } catch (error) { console.error(error); } finally { setRemindingId(null); }
  };

  const confirmTransport = async (id: number) => {
    try {
      setConfirmingTransportId(id);
      await apiClient.post(`/transport/confirm/${id}`);
      await fetchOrders();
    } catch (error) { console.error(error); } finally { setConfirmingTransportId(null); }
  };

  const confirmHall = async (id: number) => {
    try {
      setConfirmingPartyHallId(id);
      await apiClient.post(`/party-hall/confirm/${id}`);
      await fetchOrders();
    } catch (error) { console.error(error); } finally { setConfirmingPartyHallId(null); }
  };

  const renderOrderTable = (title: string, list: Order[], isGarland = false) => (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 border">ID</th>
                <th className="p-3 border">User</th>
                <th className="p-3 border">Items</th>
                <th className="p-3 border">Amount</th>
                <th className="p-3 border">Status</th>
                <th className="p-3 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((order) => (
                <tr key={order.orderId} className="hover:bg-gray-50 border-b">
                  <td className="p-3 border font-medium">#{order.orderId}</td>
                  <td className="p-3 border">{order.username}</td>
                  <td className="p-3 border">
                    {order.items?.map((it, i) => (
                      <div key={i} className="text-xs truncate max-w-[200px]">{it.product_name} x {it.weight}kg</div>
                    ))}
                  </td>
                  <td className="p-3 border font-bold">₹{Number(order.total_amount).toFixed(0)}</td>
                  <td className="p-3 border">
                    <Badge className={getStatusColor(order.tracking_status || order.status)}>
                      {order.tracking_status || order.status}
                    </Badge>
                  </td>
                  <td className="p-3 border flex flex-col gap-1">
                    <Button size="sm" onClick={() => confirmOrder(order.orderId)} disabled={confirmingId === order.orderId || (order.tracking_status || order.status) !== 'PENDING'}>Confirm</Button>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.orderId, 'PICKED')}>Pick</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.orderId, 'DELIVERED')}>Done</Button>
                    </div>
                    {isGarland && (
                      <Button size="sm" variant="secondary" onClick={() => sendGarlandReminder(order.orderId)}>Remind</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Management</h1>
            <p className="text-sm text-gray-500 font-medium">Logged in as Admin Mohan 🔐</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            {(["orders", "garland", "transport", "hall"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === t ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Orders", val: nonGarlandOrders.length, color: "text-blue-600" },
            { label: "Garland", val: garlandOrders.length, color: "text-emerald-600" },
            { label: "Transport", val: transportBookings.length, color: "text-amber-600" },
            { label: "Hall", val: partyHallBookings.length, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{s.label}</p>
              <h3 className={`text-2xl font-black ${s.color}`}>{s.val}</h3>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400 animate-pulse">Syncing live data...</div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {activeTab === "orders" && renderOrderTable("Customer Orders", nonGarlandOrders)}
            {activeTab === "garland" && renderOrderTable("Garland Queue", garlandOrders, true)}
            {activeTab === "transport" && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Transport Rides</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-3 border">ID</th>
                          <th className="p-3 border">User</th>
                          <th className="p-3 border">Route</th>
                          <th className="p-3 border">Charge</th>
                          <th className="p-3 border">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transportBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50 border-b">
                            <td className="p-3 border">#{b.id}</td>
                            <td className="p-3 border">{b.customer_name}</td>
                            <td className="p-3 border text-xs">{b.from_address} ➔ {b.to_address}</td>
                            <td className="p-3 border font-bold">₹{Number(b.charge_amount).toFixed(0)}</td>
                            <td className="p-3 border font-bold">
                              <Button size="sm" disabled={confirmingTransportId === b.id} onClick={() => confirmTransport(b.id)}>Confirm</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            {activeTab === "hall" && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Party Hall Bookings</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-left">
                          <th className="p-3 border">ID</th>
                          <th className="p-3 border">User</th>
                          <th className="p-3 border">Event</th>
                          <th className="p-3 border">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partyHallBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50 border-b">
                            <td className="p-3 border">#{b.id}</td>
                            <td className="p-3 border">{b.customer_name}</td>
                            <td className="p-3 border text-xs">{b.event_date} @ {b.start_time}</td>
                            <td className="p-3 border">
                              <Button size="sm" disabled={confirmingPartyHallId === b.id} onClick={() => confirmHall(b.id)}>Confirm</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
