import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "../api";

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
  to_address: string;
  distance_km: number;
  charge_amount: number;
  status: string;
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
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "picked":
      return "bg-blue-100 text-blue-800";
    case "out_for_delivery":
      return "bg-purple-100 text-purple-800";
    case "delivered":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
};

const getCurrentStatus = (order: Order) =>
  (order.tracking_status || order.status || "").toUpperCase();

const getHoursLeft = (value?: string) => {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  const hoursLeft = (target - Date.now()) / (1000 * 60 * 60);
  return hoursLeft;
};

const AdminPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [garlandOrders, setGarlandOrders] = useState<Order[]>([]);
  const [transportBookings, setTransportBookings] = useState<TransportBooking[]>([]);
  const [partyHallBookings, setPartyHallBookings] = useState<PartyHallBooking[]>([]);

  const garlandOrderIds = useMemo(
    () => new Set(garlandOrders.map((o) => o.orderId)),
    [garlandOrders]
  );

  const nonGarlandOrders = useMemo(
    () => orders.filter((o) => !garlandOrderIds.has(o.orderId)),
    [orders, garlandOrderIds]
  );

  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [remindingId, setRemindingId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const [
        allOrdersRes,
        garlandOrdersRes,
        transportRes,
        partyHallRes,
      ] = await Promise.all([
        axios.get<Order[]>(`${API_BASE_URL}/orders`),
        axios.get<Order[]>(`${API_BASE_URL}/orders/garland`),
        axios.get<TransportBooking[]>(`${API_BASE_URL}/transport`),
        axios.get<PartyHallBooking[]>(`${API_BASE_URL}/party-hall`),
      ]);

      setOrders(allOrdersRes.data || []);
      setGarlandOrders(garlandOrdersRes.data || []);
      setTransportBookings(transportRes.data || []);
      setPartyHallBookings(partyHallRes.data || []);
    } catch (err) {
      console.error("❌ Error fetching admin data:", err);
      alert("❌ Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  const busyOrderId = useMemo(() => {
    if (confirmingId) return confirmingId;
    if (updatingId) return updatingId;
    if (remindingId) return remindingId;
    return null;
  }, [confirmingId, updatingId, remindingId]);

  const confirmOrder = async (orderId: number) => {
    try {
      setConfirmingId(orderId);
      const res = await fetch(`${API_BASE_URL}/orders/confirm/${orderId}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Confirm failed");

      await fetchOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Confirm failed";
      console.error("❌ Confirm order failed:", error);
      alert(`❌ ${message}`);
    } finally {
      setConfirmingId(null);
    }
  };

  const updateStatus = async (orderId: number, status: string) => {
    try {
      setUpdatingId(orderId);

      const res = await fetch(`${API_BASE_URL}/orders/status/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      await fetchOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed";
      console.error("❌ Status update failed:", error);
      alert(`❌ ${message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelOrder = async (orderId: number, reason: string) => {
    if (!reason) return;

    try {
      const res = await fetch(`${API_BASE_URL}/orders/admin-cancel/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Cancel failed");

      await fetchOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cancel failed";
      console.error("❌ Cancel failed:", error);
      alert(`❌ ${message}`);
    }
  };

  const sendGarlandReminder = async (orderId: number) => {
    try {
      setRemindingId(orderId);
      const res = await fetch(
        `${API_BASE_URL}/orders/garland/reminder/${orderId}`,
        { method: "POST" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reminder failed");

      alert("✅ Reminder sent to user");
      await fetchOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reminder failed";
      console.error("❌ Reminder failed:", error);
      alert(`❌ ${message}`);
    } finally {
      setRemindingId(null);
    }
  };

  const renderOrderRows = (list: Order[], isGarlandTable = false) => (
    <tbody>
      {list.map((order) => {
        const displayStatus = order.tracking_status || order.status;
        const status = getCurrentStatus(order);
        const isBusy = busyOrderId === order.orderId;

        const canConfirm = status === "PENDING";
        const canPick = status === "CONFIRMED";
        const canOut = status === "PICKED";
        const canDeliver = status === "OUT_FOR_DELIVERY";
        const canCancel = !["DELIVERED", "CANCELLED"].includes(status);

        const hoursLeft = getHoursLeft(order.garland_delivery_at);
        const canRemind =
          isGarlandTable &&
          !!order.garland_delivery_at &&
          !!hoursLeft &&
          hoursLeft > 0 &&
          (order.garland_reminder_sent || 0) === 0;

        return (
          <tr key={order.orderId} className="hover:bg-gray-50 align-top">
            <td className="p-3 border font-medium">#{order.orderId}</td>
            <td className="p-3 border">{order.username}</td>

            <td className="p-3 border min-w-[280px]">
              <div className="space-y-2">
                {order.items?.length > 0 ? (
                  order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <img
                        src={item.image || "https://via.placeholder.com/40"}
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/40")
                        }
                        alt={item.product_name}
                        className="w-10 h-10 rounded object-cover border"
                      />

                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-gray-500">
                          ₹{item.unit_price} × {item.weight}kg = ₹{item.total_price}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-400 italic">No items</span>
                )}
              </div>
            </td>

            <td className="p-3 border font-semibold">
              ₹{Number(order.total_amount || 0).toFixed(2)}
            </td>

            <td className="p-3 border">
              <Badge className={getStatusColor(displayStatus)}>{displayStatus}</Badge>

              {order.cancel_reason && (
                <p className="text-xs text-red-600 mt-1">❌ {order.cancel_reason}</p>
              )}
            </td>

            <td className="p-3 border text-gray-600">
              <p>Placed: {formatDate(order.created_at)}</p>
              <p className="text-xs">Picked: {formatDate(order.picked_at)}</p>
              <p className="text-xs">Out: {formatDate(order.out_for_delivery_at)}</p>
              <p className="text-xs">Delivered: {formatDate(order.delivered_at)}</p>

              {isGarlandTable && (
                <>
                  <p className="text-xs font-semibold text-orange-700 mt-1">
                    Garland Delivery: {formatDate(order.garland_delivery_at)}
                  </p>
                  {hoursLeft !== null && (
                    <p className="text-xs text-orange-700">
                      Time left: {hoursLeft > 0 ? `${Math.ceil(hoursLeft)} hrs` : "Passed"}
                    </p>
                  )}
                  <p className="text-xs text-indigo-700">
                    Reminder: {(order.garland_reminder_sent || 0) === 1 ? "Sent" : "Not sent"}
                  </p>
                  {(order.garland_reminder_sent || 0) === 1 && (
                    <p className="text-xs text-indigo-700">
                      Reminder at: {formatDate(order.garland_last_reminder_at)}
                    </p>
                  )}
                </>
              )}
            </td>

            <td className="p-3 border">
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  disabled={isBusy || !canConfirm}
                  onClick={() => confirmOrder(order.orderId)}
                >
                  {confirmingId === order.orderId ? "Confirming..." : "Confirm"}
                </Button>

                <Button
                  size="sm"
                  disabled={isBusy || !canPick}
                  onClick={() => updateStatus(order.orderId, "PICKED")}
                >
                  Pick
                </Button>

                <Button
                  size="sm"
                  disabled={isBusy || !canOut}
                  onClick={() => updateStatus(order.orderId, "OUT_FOR_DELIVERY")}
                >
                  Out
                </Button>

                <Button
                  size="sm"
                  disabled={isBusy || !canDeliver}
                  onClick={() => updateStatus(order.orderId, "DELIVERED")}
                >
                  Delivered
                </Button>

                {isGarlandTable && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isBusy || !canRemind}
                    onClick={() => sendGarlandReminder(order.orderId)}
                  >
                    {remindingId === order.orderId ? "Sending..." : "Send Reminder"}
                  </Button>
                )}

                <select
                  className="border p-1 rounded text-sm"
                  defaultValue=""
                  disabled={!canCancel || isBusy}
                  onChange={(e) => {
                    cancelOrder(order.orderId, e.target.value);
                    e.currentTarget.value = "";
                  }}
                >
                  <option value="">Cancel</option>
                  {cancelReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  );

  const renderOrderTable = (
    title: string,
    list: Order[],
    isGarlandTable = false
  ) => (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>

        {loading ? (
          <p className="text-gray-500">Loading orders...</p>
        ) : list.length === 0 ? (
          <p className="text-gray-500">No orders found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border">Order ID</th>
                  <th className="p-3 border">User</th>
                  <th className="p-3 border">Items</th>
                  <th className="p-3 border">Amount</th>
                  <th className="p-3 border">Status</th>
                  <th className="p-3 border">Timeline</th>
                  <th className="p-3 border">Action</th>
                </tr>
              </thead>
              {renderOrderRows(list, isGarlandTable)}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTransportTable = () => (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Transport Bookings</h2>
        {loading ? (
          <p className="text-gray-500">Loading transport bookings...</p>
        ) : transportBookings.length === 0 ? (
          <p className="text-gray-500">No transport bookings found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border">ID</th>
                  <th className="p-3 border">User</th>
                  <th className="p-3 border">From</th>
                  <th className="p-3 border">To</th>
                  <th className="p-3 border">KM</th>
                  <th className="p-3 border">Charge</th>
                  <th className="p-3 border">Phone</th>
                  <th className="p-3 border">Date</th>
                </tr>
              </thead>
              <tbody>
                {transportBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 align-top">
                    <td className="p-3 border">#{b.id}</td>
                    <td className="p-3 border">{b.username || b.customer_name}</td>
                    <td className="p-3 border">{b.from_address}</td>
                    <td className="p-3 border">{b.to_address}</td>
                    <td className="p-3 border">{Number(b.distance_km).toFixed(2)}</td>
                    <td className="p-3 border font-semibold">₹{Number(b.charge_amount).toFixed(2)}</td>
                    <td className="p-3 border">{b.customer_phone}</td>
                    <td className="p-3 border">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPartyHallTable = () => (
    <Card className="shadow-lg">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Party Hall Bookings (3hr)</h2>
        {loading ? (
          <p className="text-gray-500">Loading party hall bookings...</p>
        ) : partyHallBookings.length === 0 ? (
          <p className="text-gray-500">No party hall bookings found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border">ID</th>
                  <th className="p-3 border">User</th>
                  <th className="p-3 border">Event</th>
                  <th className="p-3 border">Persons</th>
                  <th className="p-3 border">Snacks/Water/Cake</th>
                  <th className="p-3 border">Services</th>
                  <th className="p-3 border">Total</th>
                  <th className="p-3 border">Phone</th>
                </tr>
              </thead>
              <tbody>
                {partyHallBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 align-top">
                    <td className="p-3 border">#{b.id}</td>
                    <td className="p-3 border">{b.username || b.customer_name}</td>
                    <td className="p-3 border">
                      <p>{b.event_date}</p>
                      <p className="text-xs">{String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}</p>
                    </td>
                    <td className="p-3 border">{b.person_count}</td>
                    <td className="p-3 border">{b.snacks_count}/{b.water_count}/{b.cake_count}</td>
                    <td className="p-3 border">{b.add_ons_json ? JSON.parse(b.add_ons_json).join(", ") : "-"}</td>
                    <td className="p-3 border font-semibold">₹{Number(b.total_charge).toFixed(2)}</td>
                    <td className="p-3 border">{b.customer_phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
      {renderOrderTable("All Orders (excluding Garland)", nonGarlandOrders)}
      {renderOrderTable(
        "Garland Orders (date/time + reminder)",
        garlandOrders,
        true
      )}
      {renderTransportTable()}
      {renderPartyHallTable()}
    </div>
  );
};

export default AdminPanel;
