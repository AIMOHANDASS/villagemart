import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import truckImg from "../assets/truck.png";
import { motion, AnimatePresence } from "framer-motion";
import { Package, AlertTriangle, Star, ShieldCheck, Languages } from "lucide-react";
import toast from "react-hot-toast";

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
  delivery_status?: string;
  cancel_reason?: string;
  delivery_fee?: number;
  total_amount: number;
  delivery_otp?: string | number;
  items: OrderItem[];
}

const CANCEL_REASONS = ["Wrong product", "Wrong location"];

/* ================= SKELETON ================= */
const OrderSkeleton = () => (
  <div className="rounded-2xl bg-card shadow-md p-5 space-y-4">
    <div className="flex justify-between">
      <div className="skeleton-text w-28 h-5" />
      <div className="skeleton w-20 h-6 rounded-full" />
    </div>
    <div className="flex gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-14 h-14 skeleton rounded-xl" />
      ))}
    </div>
    <div className="space-y-2">
      <div className="skeleton-text w-full h-3" />
      <div className="skeleton-text w-3/4 h-3" />
    </div>
    <div className="skeleton w-full h-3 rounded-full" />
  </div>
);

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const MyOrders: React.FC<Props> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReason, setSelectedReason] = useState<Record<number, string>>(
    {}
  );
  const [ratingMap, setRatingMap] = useState<Record<number, number>>({});
  const [commentMap, setCommentMap] = useState<Record<number, string>>({});
  const [loadingReview, setLoadingReview] = useState<number | null>(null);
  const [loadingCancel, setLoadingCancel] = useState<number | null>(null);
  const [lang, setLang] = useState<'EN' | 'TA'>('EN');

  const t = (en: string, ta: string) => lang === 'TA' ? ta : en;

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/orders/user/${user.id}`);
      const data = await res.json();
      setOrders(data || []);
    } catch (err) {
      console.error("❌ Orders fetch error:", err);
    } finally {
      setIsLoading(false);
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
      toast.error("Please select a cancel reason");
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

      toast.success("Order cancelled successfully");
      setSelectedReason((prev) => ({ ...prev, [orderId]: "" }));
      fetchOrders();
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      toast.error("Failed to cancel order");
    } finally {
      setLoadingCancel(null);
    }
  };

  /* ---------------- SUBMIT REVIEW ---------------- */
  const handleReview = async (orderId: number) => {
    const rating = ratingMap[orderId] || 0;
    const comment = commentMap[orderId] || "";

    if (!rating) {
      toast.error("Please select a star rating");
      return;
    }

    setLoadingReview(orderId);
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`${API_BASE_URL}/reviews/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id, orderId, rating, comment })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Thanks for your feedback! ⭐");
        setRatingMap(prev => ({ ...prev, [orderId]: 0 }));
      }
    } catch (e) {
      toast.error("Failed to submit review");
    } finally {
      setLoadingReview(null);
    }
  };

  /* ---------------- ACTIVE STEP ================= */
  const getActiveStep = (status?: string, deliveryStatus?: string) => {
    const s = (status || "").toUpperCase();
    const ds = (deliveryStatus || "").toUpperCase();

    if (s === "CANCELLED") return -1;
    if (s === "DELIVERED" || ds === "DELIVERED") return 3;
    if (ds === "OUT_FOR_DELIVERY") return 2;
    if (ds === "PICKED") return 1;
    if (s === "ACCEPTED" || s === "PENDING" || s === "CONFIRMED") return 0;
    return 0;
  };

  /* ---------------- STATUS BADGE ================= */
  const getStatusBadge = (status?: string, deliveryStatus?: string) => {
    const s = (status || "").toUpperCase();
    const ds = (deliveryStatus || "").toUpperCase();

    let className = "bg-amber-100 text-amber-700";
    let label = "🕒 Pending";

    if (s === "CANCELLED") {
      className = "bg-red-100 text-red-700";
      label = "❌ Cancelled";
    } else if (s === "DELIVERED" || ds === "DELIVERED") {
      className = "bg-emerald-100 text-emerald-700";
      label = "🎉 Delivered";
    } else if (ds === "OUT_FOR_DELIVERY") {
      className = "bg-orange-100 text-orange-700";
      label = "🚚 Out for Delivery";
    } else if (ds === "PICKED") {
      className = "bg-purple-100 text-purple-700";
      label = "📦 Packed";
    } else if (s === "ACCEPTED" || s === "CONFIRMED" || s === "PENDING") {
      className = "bg-blue-100 text-blue-700";
      label = "✅ Confirmed";
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
  };

  /* ---------------- PROGRESS BAR ================= */
  const getProgressPercent = (step: number) => {
    if (step === -1) return 0;
    if (step === 0) return 25;
    if (step === 1) return 50;
    if (step === 2) return 75;
    if (step === 3) return 100;
    return 10;
  };

  /* ---------------- VEHICLE POSITION ---------------- */
  const getVehiclePosition = (step: number) => {
    if (step === -1) return "left-0";
    if (step === 0) return "left-[10%]";
    if (step === 1) return "left-[35%]";
    if (step === 2) return "left-[65%]";
    if (step === 3) return "left-[calc(100%-3rem)]";
    return "left-0";
  };

  return (
    <motion.div
      className="p-6 max-w-5xl mx-auto pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="flex items-center gap-3 mb-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t('My Orders', 'என் ஆர்டர்கள்')}</h1>
        <button 
          onClick={() => setLang(lang === 'EN' ? 'TA' : 'EN')}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <Languages className="w-4 h-4" />
          {lang === 'EN' ? 'தமிழ்' : 'English'}
        </button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderSkeleton key={i} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-6xl mb-4">📦</div>
          <p className="text-gray-500 text-lg font-medium">No orders found.</p>
          <p className="text-sm text-muted-foreground mt-2">Start shopping to see your orders here!</p>
        </motion.div>
      ) : (
        <div className="space-y-5">
          <AnimatePresence>
            {orders.map((order, index) => {
              const delivery = order.delivery_fee ?? 5;
              const total = order.total_amount;
              const status = order.status || "PENDING";
              const deliveryStatus = order.delivery_status || "PENDING";
              
              const step = getActiveStep(status, deliveryStatus);

              const subtotal = order.items.reduce(
                (sum, i) => sum + Number(i.total_price || 0),
                0
              );

              // ✅ Cancel allowed until OUT_FOR_DELIVERY
              const allowCancel = step < 2 && step !== -1;

              const progressPercent = getProgressPercent(step);

              return (
                <motion.div
                  key={order.orderId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  className="border rounded-2xl p-5 bg-white dark:bg-card shadow-md hover:shadow-lg transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-lg">
                      {t('Order', 'ஆர்டர்')} #{order.orderId}
                    </span>
                    <div className="flex items-center gap-2">
                       <div className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                          <ShieldCheck className="w-3 h-3" />
                          {t('VERIFIED', 'சரிபார்க்கப்பட்டது')}
                       </div>
                       {getStatusBadge(status, deliveryStatus)}
                    </div>
                  </div>

                  {/* Product Images */}
                  <div className="flex gap-3 flex-wrap mt-2">
                    {order.items.map((item, idx) => (
                      <motion.img
                        key={idx}
                        whileHover={{ scale: 1.1 }}
                        src={item.image || "https://via.placeholder.com/60"}
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/60")
                        }
                        className="w-16 h-16 object-cover rounded-xl border-2 border-gray-100 dark:border-gray-700 shadow-sm"
                      />
                    ))}
                  </div>

                  {/* Item Details */}
                  <div className="mt-3 text-sm space-y-1 text-muted-foreground">
                    {order.items.map((item, idx) => (
                      <p key={idx}>
                        {item.product_name} — ₹{item.unit_price} ×{" "}
                        {item.weight}kg = <span className="font-medium text-foreground">₹{item.total_price}</span>
                      </p>
                    ))}
                  </div>

                  {/* Price Summary */}
                  <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-sm space-y-1">
                    <p className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></p>
                    <p className="flex justify-between"><span>Delivery</span><span>₹{delivery.toFixed(2)}</span></p>
                    <p className="flex justify-between font-bold text-base pt-1 border-t border-gray-200 dark:border-gray-700">
                      <span>Total</span>
                      <span className="text-primary">₹{total.toFixed(2)}</span>
                    </p>
                  </div>

                  {/* OTP Display for Out for Delivery */}
                  {step === 2 && order.delivery_otp && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between shadow-sm"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 tracking-wider uppercase">
                          {t('Delivery OTP', 'டெலிவரி OTP')}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {t('Share this with delivery partner', 'டெலிவரி பார்ட்னரிடம் இதனைத் தெரிவிக்கவும்')}
                        </p>
                      </div>
                      <div className="bg-emerald-600 dark:bg-emerald-500 text-white font-mono text-2xl font-black px-4 py-2 rounded-lg tracking-widest shadow-md">
                        {order.delivery_otp}
                      </div>
                    </motion.div>
                  )}

                  {/* Animated Progress Bar */}
                  <div className="mt-4">
                    <div className="relative">
                      {/* Progress Track */}
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            step === -1
                              ? "bg-red-500"
                              : step === 3
                              ? "bg-emerald-500"
                              : "bg-gradient-to-r from-primary to-emerald-500"
                          }`}
                          initial={{ width: "0%" }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>

                      {/* Truck */}
                      {step !== -1 && (
                        <img
                          src={truckImg}
                          alt="Delivery Truck"
                          className={`absolute -top-8 w-10 h-10 transition-all duration-1000 ease-in-out ${getVehiclePosition(
                            step
                          )}`}
                        />
                      )}
                    </div>

                    {/* Step Labels */}
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>Confirmed</span>
                      <span>Packed</span>
                      <span>On Way</span>
                      <span>Delivered</span>
                    </div>
                  </div>

                  {/* Cancel Reason */}
                  {step === -1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex items-center gap-2 text-red-600 text-sm mt-3 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl"
                    >
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {order.cancel_reason}
                    </motion.div>
                  )}

                  {/* User Cancel UI */}
                  {allowCancel && (
                    <motion.div
                      className="mt-4 flex gap-2 items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <select
                        className="border border-gray-200 dark:border-gray-700 p-2 rounded-xl text-sm flex-1 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/30 transition-all"
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

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={loadingCancel === order.orderId}
                        onClick={() => submitCancel(order.orderId)}
                        className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-xl disabled:opacity-50 transition-all shadow-md hover:shadow-lg ripple-container"
                      >
                        {loadingCancel === order.orderId
                          ? "Cancelling..."
                          : "Cancel"}
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Rating UI for Delivered Orders */}
                  {step === 3 && (
                    <motion.div 
                      className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="text-sm font-bold mb-2">Rate your delivery</p>
                      <div className="flex items-center gap-1.5 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star} 
                            onClick={() => setRatingMap(p => ({ ...p, [order.orderId]: star }))}
                            className="transition-transform hover:scale-125"
                          >
                            <Star className={`w-6 h-6 ${
                              (ratingMap[order.orderId] || 0) >= star 
                                ? 'fill-amber-400 text-amber-400' 
                                : 'text-gray-300'
                            }`} />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <textarea 
                          placeholder="Tell us about your experience..."
                          className="flex-1 min-h-[40px] text-sm p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                          value={commentMap[order.orderId] || ""}
                          onChange={(e) => setCommentMap(p => ({ ...p, [order.orderId]: e.target.value }))}
                        />
                        <button 
                          disabled={loadingReview === order.orderId}
                          onClick={() => handleReview(order.orderId)}
                          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black disabled:opacity-50 h-fit self-end transition-all shadow-md shadow-gray-200"
                        >
                          {loadingReview === order.orderId ? "..." : "Send"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default MyOrders;
