import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import truckImg from "../assets/truck.png";

type Props = {
  user: any;
};

interface OrderItem {
  product_name: string;
  unit_price: number;
  weight: number;
  total_price: number;
  image: string;
}

interface Order {
  orderId: number;
  status: string;
  tracking_status?: string;
  cancel_reason?: string;
  delivery_fee?: number;
  total_amount: number;
  items: OrderItem[];
}

const CANCEL_REASONS = ["Wrong product", "Wrong location"];

const MyOrders: React.FC<Props> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedReason, setSelectedReason] = useState<Record<number, string>>(
    {}
  );
  const [loadingCancel, setLoadingCancel] = useState<number | null>(null);

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/orders/user/${user.id}`);
      const data = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error("❌ Orders fetch error:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6000);
    return () => clearInterval(interval);
  }, [user]);

  /* ---------------- USER CANCEL ORDER ---------------- */
  const submitCancel = async (orderId: number) => {
    const reason = selectedReason[orderId];
    if (!reason) {
      alert("⚠ Please select cancel reason");
      return;
    }

    const ok = window.confirm(
      `Cancel order #${orderId} for reason:\n"${reason}" ?`
    );
    if (!ok) return;

    try {
      setLoadingCancel(orderId);

      const res = await fetch(
        `${API_BASE_URL}/orders/user-cancel/${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      if (!res.ok) throw new Error("Cancel failed");

      alert("✅ Order cancelled.");
      setSelectedReason((prev) => ({ ...prev, [orderId]: "" }));
      fetchOrders();
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      alert("❌ Failed to cancel order");
    } finally {
      setLoadingCancel(null);
    }
  };

  /* ---------------- STATUS COLOR ---------------- */
  const getStatusColor = (status?: string) => {
    const s = status?.toLowerCase();

    switch (s) {
      case "pending":
        return "text-yellow-600";
      case "confirmed":
        return "text-indigo-600";
      case "picked":
        return "text-blue-600";
      case "out_for_delivery":
        return "text-purple-600";
      case "delivered":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  /* ---------------- VEHICLE POSITION ---------------- */
  const getVehiclePosition = (status?: string) => {
    switch (status) {
      case "CONFIRMED":
        return "left-[10%]";
      case "PICKED":
        return "left-[35%]";
      case "OUT_FOR_DELIVERY":
        return "left-[65%]";
      case "DELIVERED":
        return "left-[calc(100%-3rem)]"; // ✅ reach end safely
      case "CANCELLED":
      default:
        return "left-0";
    }
  };

  /* ---------------- STATUS LABEL ---------------- */
  const getFlowLabel = (status?: string) => {
    switch (status) {
      case "CONFIRMED":
        return "✅ Order Confirmed";
      case "PICKED":
        return "📦 Packed";
      case "OUT_FOR_DELIVERY":
        return "🚚 On the Road";
      case "DELIVERED":
        return "🎉 Delivered";
      case "CANCELLED":
        return "❌ Cancelled";
      default:
        return "🕒 Pending";
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-24">
      <h1 className="text-2xl font-bold mb-4">📦 My Orders</h1>

      {orders.length === 0 && (
        <p className="text-gray-500">No orders found.</p>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const delivery = order.delivery_fee ?? 5;
          const total = order.total_amount;
          const tracking = order.tracking_status || "PENDING";

          const subtotal = order.items.reduce(
            (sum, i) => sum + Number(i.total_price || 0),
            0
          );

          // ✅ Cancel allowed until OUT_FOR_DELIVERY
          const allowCancel =
            tracking !== "DELIVERED" && tracking !== "CANCELLED";

          return (
            <div
              key={order.orderId}
              className="border rounded-lg p-4 bg-white shadow-sm"
            >
              {/* Header */}
              <div className="flex justify-between mb-2">
                <span className="font-medium">
                  Order #{order.orderId}
                </span>

                <span
                  className={`font-semibold ${getStatusColor(tracking)}`}
                >
                  {tracking}
                </span>
              </div>

              {/* Product Images */}
              <div className="flex gap-3 flex-wrap mt-2">
                {order.items.map((item, idx) => (
                  <img
                    key={idx}
                    src={item.image || "https://via.placeholder.com/60"}
                    onError={(e) =>
                      ((e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/60")
                    }
                    className="w-14 h-14 object-cover rounded border"
                  />
                ))}
              </div>

              {/* Item Details */}
              <div className="mt-3 text-sm space-y-1">
                {order.items.map((item, idx) => (
                  <p key={idx}>
                    {item.product_name} — ₹{item.unit_price} ×{" "}
                    {item.weight}kg = ₹{item.total_price}
                  </p>
                ))}
              </div>

              {/* Price Summary */}
              <div className="mt-3 text-sm space-y-1">
                <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
                <p>Delivery: ₹{delivery.toFixed(2)}</p>
                <p className="font-bold text-lg">
                  Total: ₹{total.toFixed(2)}
                </p>
              </div>

              {/* ---------------- VEHICLE FLOW ---------------- */}
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1">
                  {getFlowLabel(tracking)}
                </p>

                <div className="relative h-3 bg-gray-200 rounded-full overflow-visible">
                  <img
                    src={truckImg}
                    alt="Delivery Truck"
                    className={`absolute -top-7 w-12 h-12 transition-all duration-1000 ease-in-out ${getVehiclePosition(
                      tracking
                    )}`}
                  />
                </div>
              </div>

              {/* ---------------- CANCEL REASON ---------------- */}
              {tracking === "CANCELLED" && (
                <p className="text-red-600 text-xs mt-2">
                  ❌ {order.cancel_reason}
                </p>
              )}

              {/* ---------------- USER CANCEL UI ---------------- */}
              {allowCancel && (
                <div className="mt-3 flex gap-2 items-center">
                  <select
                    className="border p-1 rounded text-sm flex-1"
                    value={selectedReason[order.orderId] || ""}
                    onChange={(e) =>
                      setSelectedReason((prev) => ({
                        ...prev,
                        [order.orderId]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select cancel reason</option>
                    {CANCEL_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <button
                    disabled={loadingCancel === order.orderId}
                    onClick={() => submitCancel(order.orderId)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded disabled:opacity-50"
                  >
                    {loadingCancel === order.orderId
                      ? "Cancelling..."
                      : "Cancel"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrders;
