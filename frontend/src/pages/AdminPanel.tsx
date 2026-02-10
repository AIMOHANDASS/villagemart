import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "../api";

/* ================= TYPES ================= */

interface OrderItem {
  product_name: string;
  unit_price: number;     // ✅ NEW
  weight: number;         // ✅ NEW
  total_price: number;    // ✅ NEW
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
  items: OrderItem[];
}

/* ================= COMPONENT ================= */

const AdminPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    try {
      const res = await axios.get<Order[]>(`${API_BASE_URL}/orders`);
      setOrders(res.data || []);
    } catch (err) {
      console.error("❌ Error fetching orders:", err);
      alert("❌ Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  /* 🔁 AUTO REFRESH EVERY 8 SECONDS */
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- CONFIRM ORDER ---------------- */
  const confirmOrder = async (orderId: number) => {
    if (!orderId) return alert("Invalid order ID");

    try {
      setConfirmingId(orderId);

      const res = await fetch(
        `${API_BASE_URL}/orders/confirm/${orderId}`,
        { method: "POST" }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Confirm failed");

      alert("✅ Order confirmed & mail sent");
      fetchOrders();
    } catch (error: any) {
      console.error("❌ Confirm order failed:", error);
      alert("❌ Confirm failed: " + error.message);
    } finally {
      setConfirmingId(null);
    }
  };

  /* ---------------- UPDATE TRACKING STATUS ---------------- */
  const updateStatus = async (orderId: number, status: string) => {
    if (!orderId) return;

    try {
      setUpdatingId(orderId);

      const res = await fetch(
        `${API_BASE_URL}/orders/status/${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      fetchOrders();
    } catch (err) {
      console.error("❌ Status update failed:", err);
      alert("❌ Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------------- ADMIN CANCEL ORDER ---------------- */
  const cancelReasons = [
    "More orders",
    "Distance unavailable",
    "Product not available",
    "Wrong location",
  ];

  const cancelOrder = async (orderId: number, reason: string) => {
    if (!reason) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/orders/admin-cancel/${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Cancel failed");

      fetchOrders();
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      alert("❌ Failed to cancel order");
    }
  };

  /* ---------------- STATUS COLOR ---------------- */
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

  /* ================= RENDER ================= */

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>

      <Card className="shadow-lg">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>

          {loading ? (
            <p className="text-gray-500">Loading orders...</p>
          ) : orders.length === 0 ? (
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
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => {
                    const displayStatus =
                      order.tracking_status || order.status;

                    return (
                      <tr
                        key={order.orderId}
                        className="hover:bg-gray-50 align-top"
                      >
                        {/* ORDER ID */}
                        <td className="p-3 border font-medium">
                          #{order.orderId}
                        </td>

                        {/* USER */}
                        <td className="p-3 border">{order.username}</td>

                        {/* ITEMS */}
                        <td className="p-3 border min-w-[280px]">
                          <div className="space-y-2">
                            {order.items?.length > 0 ? (
                              order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-3"
                                >
                                  <img
                                    src={
                                      item.image ||
                                      "https://via.placeholder.com/40"
                                    }
                                    onError={(e) =>
                                      ((e.target as HTMLImageElement).src =
                                        "https://via.placeholder.com/40")
                                    }
                                    alt={item.product_name}
                                    className="w-10 h-10 rounded object-cover border"
                                  />

                                  <div>
                                    <p className="font-medium">
                                      {item.product_name}
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      ₹{item.unit_price} × {item.weight}kg = ₹
                                      {item.total_price}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 italic">
                                No items
                              </span>
                            )}
                          </div>
                        </td>

                        {/* AMOUNT */}
                        <td className="p-3 border font-semibold">
                          ₹{Number(order.total_amount || 0).toFixed(2)}
                        </td>

                        {/* STATUS */}
                        <td className="p-3 border">
                          <Badge className={getStatusColor(displayStatus)}>
                            {displayStatus}
                          </Badge>

                          {order.cancel_reason && (
                            <p className="text-xs text-red-600 mt-1">
                              ❌ {order.cancel_reason}
                            </p>
                          )}
                        </td>

                        {/* DATE */}
                        <td className="p-3 border text-gray-600">
                          {new Date(order.created_at).toLocaleString()}
                        </td>

                        {/* ACTION */}
                        <td className="p-3 border">
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              disabled={
                                confirmingId === order.orderId ||
                                updatingId === order.orderId
                              }
                              onClick={() => confirmOrder(order.orderId)}
                            >
                              {confirmingId === order.orderId
                                ? "Confirming..."
                                : "Confirm"}
                            </Button>

                            <Button
                              size="sm"
                              disabled={updatingId === order.orderId}
                              onClick={() =>
                                updateStatus(order.orderId, "PICKED")
                              }
                            >
                              Pick
                            </Button>

                            <Button
                              size="sm"
                              disabled={updatingId === order.orderId}
                              onClick={() =>
                                updateStatus(
                                  order.orderId,
                                  "OUT_FOR_DELIVERY"
                                )
                              }
                            >
                              Out
                            </Button>

                            <Button
                              size="sm"
                              disabled={updatingId === order.orderId}
                              onClick={() =>
                                updateStatus(order.orderId, "DELIVERED")
                              }
                            >
                              Delivered
                            </Button>

                            {/* CANCEL */}
                            <select
                              className="border p-1 rounded text-sm"
                              defaultValue=""
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
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
