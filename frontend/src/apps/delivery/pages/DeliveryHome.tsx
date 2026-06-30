import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Truck,
  RefreshCw,
  Navigation,
  Languages,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getStoredDeliveryUser,
  getNearbyOrders,
  updateOrderStatus,
  updateLocation,
  toggleOnline,
  API_BASE_URL,
  verifyDeliveryOtp
} from "../api";
import axios from "axios";
import toast from "react-hot-toast";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { OrderLocationFilter } from "../../../components/OrderLocationFilter";

interface OrderItem {
  product_name: string;
  unit_price: number;
  weight: number;
  total_price: number;
  image: string;
  product_type?: string;
}
interface Order {
  orderId: number;
  username: string;
  total_amount: number;
  status: string;
  tracking_status?: string;
  delivery_status?: string;
  created_at: string;
  items: OrderItem[];
  customer_lat?: number;
  customer_lng?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  customer_phone?: string;
  customer_address?: string;
  payment_method?: string;
}

const getProductImageSrc = (url?: string) => {
  if (!url) return "/assets/placeholder-product.png";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${cleanUrl}`;
};

const statusFlow = [
  "CONFIRMED",
  "PENDING_PICKUP",
  "PICKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];
const statusLabels: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: CheckCircle2,
  },
  PENDING_PICKUP: {
    label: "Pending Pickup",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    icon: CheckCircle2,
  },
  PICKED: {
    label: "Picked Up",
    color: "text-indigo-700 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    icon: Package,
  },
  OUT_FOR_DELIVERY: {
    label: "On the Way",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    icon: Truck,
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: CheckCircle2,
  },
};

/* ======================================================
   🏠 DELIVERY HOME PAGE
====================================================== */
export default function DeliveryHome() {
  const user = getStoredDeliveryUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(
    localStorage.getItem("delivery_status_online") === "true",
  );
  const [toggling, setToggling] = useState(false);
  const [lockoutData, setLockoutData] = useState<{
    isLockedOut: boolean;
    walletBalance: number;
    hoursElapsed: number;
    message: string;
  } | null>(null);
  const [lang, setLang] = useState<"EN" | "TA">("EN");
  const [driverPos, setDriverPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>(
    {},
  );

  // State to hold active navigation parameters right inside the application canvas 🎯
  const [activeNavRoute, setActiveNavRoute] = useState<{
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    orderId: number;
  } | null>(null);

  const [otpModalData, setOtpModalData] = useState<{
    isOpen: boolean;
    orderId: number | null;
    otp: string;
  }>({ isOpen: false, orderId: null, otp: "" });

  const handleVerifyOtp = async () => {
    if (!otpModalData.orderId || otpModalData.otp.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP");
      return;
    }
    try {
      const res: any = await verifyDeliveryOtp(otpModalData.orderId, otpModalData.otp);
      if (res.success || res.data?.success || res.status === "DELIVERED") {
        toast.success(res.message || "OTP verified. Order delivered!");
        setOtpModalData({ isOpen: false, orderId: null, otp: "" });
        fetchDeliveryOrdersWithTimeout();
      } else {
        toast.error(res.message || "Failed to verify OTP.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to verify OTP.");
    }
  };

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleRazorpaySettlement = async (outstandingAmount: number) => {
    try {
      const token =
        localStorage.getItem("jwt_token_delivery") ||
        localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/payment/razorpay/order`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.data.success)
        return alert("Failed to initialize gateway session");

      const { order } = response.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY_HERE",
        amount: order.amount,
        currency: "INR",
        name: "VillageMart Core Admin",
        description: `Commission Clearance Settlement (Amount Owed: ₹${Math.abs(outstandingAmount).toFixed(2)})`,
        order_id: order.id,
        handler: async function (response: any) {
          const verifyRes = await axios.post(
            `${API_BASE_URL}/payment/razorpay/verify`,
            {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (verifyRes.data.success) {
            alert("🎉 Payment Succeeded! Your dashboard has been unlocked.");
            window.location.reload();
          }
        },
        prefill: { name: "Logistics Partner" },
        theme: { color: "#10b981" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay UI integration crash handler triggered:", err);
    }
  };

  // Active delivery order (for mapping)
  const activeOrder =
    orders.find(
      (o) =>
        o.tracking_status === "OUT_FOR_DELIVERY" ||
        o.tracking_status === "PICKED" ||
        o.status === "OUT_FOR_DELIVERY" ||
        o.status === "PICKED",
    ) || orders[0];

  useEffect(() => {
    if (
      isLoaded &&
      isOnline &&
      activeOrder &&
      activeOrder.delivery_latitude &&
      activeOrder.delivery_longitude &&
      driverPos
    ) {
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: { lat: driverPos.lat, lng: driverPos.lng },
          destination: {
            lat: Number(activeOrder.delivery_latitude),
            lng: Number(activeOrder.delivery_longitude),
          },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirectionsResponse(result);
          }
        },
      );
    }
  }, [isLoaded, isOnline, activeOrder, driverPos]);

  const executeOrdersFetch = async (targetLat: number, targetLng: number) => {
    try {
      console.log(
        `🚀 Dispatching clean request to backend matching coordinates: [${targetLat}, ${targetLng}]`,
      );
      const payload: any = await getNearbyOrders(targetLat, targetLng);
      // Determine if getNearbyOrders returned {data: [...]} or just the array / {orders: [...]}
      const all = payload.data || payload.orders || payload || [];
      const actionable = Array.isArray(all)
        ? all.filter((o: any) => {
            const s = (
              o.delivery_status ||
              o.tracking_status ||
              o.status ||
              ""
            ).toUpperCase();
            return [
              "PENDING",
              "PENDING_PICKUP",
              "CONFIRMED",
              "PICKED",
              "OUT_FOR_DELIVERY",
            ].includes(s);
          })
        : [];

      setOrders(
        actionable.map((o: any) => ({
          ...o,
          orderId: o.id,
          customer_address: o.address || o.customer_address,
          customer_phone: o.phone || o.customer_phone,
          payment_method: (o.payment_method || "cod").toLowerCase(),
          username: o.customer_name || o.username,
          total_amount: o["total amount"] || o.total_amount,
          created_at: o["created at"] || o.created_at,
          delivery_latitude: o.delivery_latitude || o.customer_lat,
          delivery_longitude: o.delivery_longitude || o.customer_lng,
          items: Array.isArray(o.items) ? o.items : [],
        })),
      );
    } catch (error: any) {
      if (error.response?.status === 402 || error.response?.data?.isLockedOut) {
        setLockoutData({
          isLockedOut: true,
          walletBalance: error.response?.data?.walletBalance || 0,
          hoursElapsed: error.response?.data?.hoursElapsed || 0,
          message: error.response?.data?.message || "Account Suspended",
        });
      }
      console.error(
        "❌ Network execution failure fetching delivery orders:",
        error,
      );
      setOrders([]);
    } finally {
      setLoading(false); // 🎯 CRITICAL: Shuts off the infinite spinner under all conditions!
    }
  };

  const fetchDeliveryOrdersWithTimeout = async () => {
    // 1. Define safe operational fallback coordinates (Karur, Tamil Nadu) 🎯
    const defaultLat = driverPos?.lat || 10.938354;
    const defaultLng = driverPos?.lng || 78.418579;

    let locationResolved = false;

    // 2. Start a hard 3-second backup rescue timer ⏱️
    const backupTimerId = setTimeout(() => {
      if (!locationResolved) {
        console.warn(
          "⏱️ Geolocation is hanging! Activating backup rescue coordinates.",
        );
        locationResolved = true;
        executeOrdersFetch(defaultLat, defaultLng);
      }
    }, 3000);

    // 3. Attempt to fetch live coordinates from the browser environment
    if (navigator.geolocation && !driverPos) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!locationResolved) {
            clearTimeout(backupTimerId); // Clear the backup timer immediately 🎯
            locationResolved = true;
            setDriverPos({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            executeOrdersFetch(
              position.coords.latitude,
              position.coords.longitude,
            );
          }
        },
        (geoError) => {
          if (!locationResolved) {
            clearTimeout(backupTimerId);
            locationResolved = true;
            console.error("⚠️ Native Geolocation Error:", geoError.message);
            executeOrdersFetch(defaultLat, defaultLng);
          }
        },
        { enableHighAccuracy: false, timeout: 2500, maximumAge: 60000 },
      );
    } else {
      // Browser doesn't support geolocation at all, or we already have cached driverPos
      clearTimeout(backupTimerId);
      locationResolved = true;
      executeOrdersFetch(defaultLat, defaultLng);
    }
  };

  useEffect(() => {
    if (!user) return; // Wait until auth state is loaded

    const currentRole = String(user.role).toUpperCase();
    if (currentRole !== "DELIVERY" && currentRole !== "ADMIN") {
      console.error(
        "🛑 Context role mismatch in Delivery portal:",
        currentRole,
      );
      return; // Break the execution loop here!
    }

    // Only call data arrays if the delivery partner has toggled their state to online! 🎯
    if (isOnline) {
      setLoading(true); // Restart loader while fetching first time
      fetchDeliveryOrdersWithTimeout();
      const i = setInterval(fetchDeliveryOrdersWithTimeout, 8000);
      return () => clearInterval(i);
    } else {
      setLoading(false); // Make sure loader is hidden when offline
    }
  }, [user?.id, user?.role, isOnline]);

  // Live Location Tracking (Zomato Style Partner App)
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          try {
            const loc = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            setDriverPos(loc);
            const response: any = await updateLocation(loc.lat, loc.lng);
            if (response?.success) {
              toast.success("Location synchronized successfully", {
                id: "loc-sync",
              });
              fetchDeliveryOrdersWithTimeout();
            }
          } catch (e) {
            console.error("Location sync failed");
          }
        },
        (error) => console.error(error.message),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 },
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const getNextStatus = (current: string): string | null => {
    if (current === "PENDING" || current === "PENDING_PICKUP")
      return "CONFIRMED";
    if (current === "CONFIRMED") return "PICKED";
    if (current === "PICKED") return "OUT_FOR_DELIVERY";
    if (current === "OUT_FOR_DELIVERY") return "DELIVERED";
    return null;
  };

  const handleAction = async (orderId: number, targetStatus: string) => {
    if (targetStatus === "DELIVERED") {
      setOtpModalData({ isOpen: true, orderId, otp: "" });
      return;
    }

    setBusyId(orderId);
    try {
      await updateOrderStatus(orderId, targetStatus);
      toast.success(`Order #${orderId} → ${targetStatus.replace("_", " ")}`);
      await fetchDeliveryOrdersWithTimeout();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Action failed");
    }
    setBusyId(null);
  };

  const handleCheckStatus = () => {
    const role = localStorage.getItem("role")?.toLowerCase();
    if (role === "delivery") {
      window.location.reload();
    } else if (role === "transport") {
      window.open("/transport/index.html", "_self");
    } else {
      window.location.reload();
    }
  };

  const t = (en: string, ta: string) => (lang === "TA" ? ta : en);

  const handleToggleOnline = async () => {
    setToggling(true);
    try {
      const nextState = !isOnline;
      await toggleOnline(nextState);
      setIsOnline(nextState);
      localStorage.setItem("delivery_status_online", String(nextState));

      if (nextState) {
        toast.success(
          "⚡ You are now Online! Fetching matching neighborhood requests...",
        );
        fetchDeliveryOrdersWithTimeout();
      } else {
        toast.error("🛑 You are now Offline. Clearing active job queues.");
        setOrders([]); // Wipe visible cards while offline
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setToggling(false);
    }
  };

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // Helper for haversine distance
  const calculateDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (!loading && user?.status && user.status !== "approved") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-amber-100 dark:shadow-none"
        >
          <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
        </motion.div>
        <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-2">
          Account Pending Approval
        </h1>
        <p className="text-stone-500 dark:text-stone-400 max-w-xs mb-8">
          Thanks for signing up! Our admin team is currently reviewing your
          documents. You'll be able to accept orders once approved.
        </p>
        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/40 dark:border-white/10 shadow-sm w-full max-w-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Signup Complete
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Wait for verification
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckStatus}
            className="w-full py-3.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl text-sm font-bold shadow-lg shadow-stone-900/20 transition-all"
          >
            Check Status
          </motion.button>
        </div>
      </div>
    );
  }

  // Main View
  return (
    <div className="pb-24 space-y-5">
      {/* 🚨 FROSTED PAYWALL OVERLAY 🚨 */}
      {lockoutData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-900/60 backdrop-blur-xl p-6">
          <div className="bg-white dark:bg-stone-900 rounded-[2rem] shadow-2xl p-8 max-w-sm w-full text-center border border-rose-500/20">
            <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShieldCheck className="w-10 h-10 text-rose-600 dark:text-rose-400" />
            </div>
            <h2 className="text-2xl font-black text-stone-900 dark:text-white mb-2 tracking-tight">
              🚨 ACCOUNT SUSPENDED
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-4 leading-relaxed">
              {lockoutData.message || "30-Hour Grace Period Expired."}
            </p>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-6">
              Outstanding Commission Due: ₹
              {Math.abs(lockoutData.walletBalance).toFixed(2)}
            </p>
            <button
              onClick={() =>
                handleRazorpaySettlement(lockoutData.walletBalance)
              }
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-base transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
            >
              Pay Dues via Razorpay
            </button>
          </div>
        </div>
      )}

      {/* Village Friendly Header */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm"
          >
            <ShieldCheck className="w-5 h-5" />
          </motion.div>
          <div>
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Verified Partner
            </p>
            <p className="text-xs font-bold text-stone-500 dark:text-stone-400 leading-none mt-1">
              ID: VM-DL-00{user?.id || "?"}
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setLang(lang === "EN" ? "TA" : "EN")}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-white/5 backdrop-blur-md rounded-xl text-[10px] font-bold text-stone-600 dark:text-stone-300 border border-white/40 dark:border-white/10 shadow-sm"
        >
          <Languages className="w-3.5 h-3.5" />
          {lang === "EN" ? "தமிழ்" : "English"}
        </motion.button>
      </div>

      {/* Online Toggle & Header */}
      <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/40 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10">
            <div
              className={`absolute inset-0 rounded-full ${isOnline ? "bg-emerald-500 opacity-20 animate-ping" : "bg-stone-300 dark:bg-stone-700 opacity-20"}`}
            />
            <div
              className={`relative w-4 h-4 rounded-full ${isOnline ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "bg-stone-400 dark:bg-stone-600"}`}
            />
          </div>
          <div>
            <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
              {isOnline ? t("Active", "ஆன்லைனில்") : t("Offline", "ஆஃப்லைனில்")}
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-none mt-1">
              {isOnline
                ? t(
                    "Waiting for orders...",
                    "ஆர்டர்களுக்காக காத்திருக்கிறது...",
                  )
                : t("Tap toggle to go online", "ஆன்லைனில் செல்ல தட்டவும்")}
            </p>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleToggleOnline}
          disabled={toggling}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg ${
            isOnline
              ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/30 shadow-rose-500/10 hover:shadow-rose-500/20"
              : "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/30 hover:shadow-emerald-500/40"
          }`}
        >
          {toggling
            ? "..."
            : isOnline
              ? t("Go Offline", "செல்லுங்கள்")
              : t("Go Online", "ஆன்லைன் செல்")}
        </motion.button>
      </div>

      <div className="flex items-end justify-between px-2 pt-2">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            {t("Active Orders", "செயலில் உள்ள ஆர்டர்கள்")}
          </h1>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-0.5">
            {orders.length} {t("orders to deliver", "ஆர்டர்கள் உள்ளன")}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ rotate: 15 }}
          onClick={() => {
            setLoading(true);
            fetchDeliveryOrdersWithTimeout();
          }}
          className="p-3 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/10 shadow-sm"
        >
          <RefreshCw className="w-5 h-5 text-stone-600 dark:text-stone-400" />
        </motion.button>
      </div>

      {/* Interactive Google Map / Embedded Navigation Target State */}
      <div className="w-full h-64 md:h-80 bg-emerald-50/50 rounded-3xl border border-stone-200/40 shadow-inner overflow-hidden relative my-4">
        {!activeNavRoute ? (
          // Default view shown on initialization or when idling
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="p-3 bg-white rounded-full shadow-md text-emerald-600 animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </div>
            <span className="text-xs font-bold text-stone-600 tracking-wide">
              Map View Initializing
            </span>
          </div>
        ) : (
          // Active embedded routing viewport state 🎯
          <div className="relative w-full h-full">
            <iframe
              title={`Live Routing for Order #${activeNavRoute.orderId}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src={`https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&origin=${activeNavRoute.originLat},${activeNavRoute.originLng}&destination=${activeNavRoute.destLat},${activeNavRoute.destLng}&mode=driving`}
            />

            <button
              onClick={() => setActiveNavRoute(null)}
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-stone-800 font-bold text-xs px-3 py-1.5 rounded-xl shadow-md hover:bg-white transition-all border border-stone-200"
            >
              ❌ Clear Route View
            </button>
          </div>
        )}
      </div>

      {/* Active Delivery Tracking Card */}
      {activeOrder &&
        (activeOrder.tracking_status === "PICKED" ||
          activeOrder.tracking_status === "OUT_FOR_DELIVERY") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-[2rem] p-5 md:p-6 text-white shadow-xl shadow-emerald-600/20"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-0.5">
                    Active Delivery
                  </p>
                  <p className="text-base font-black">
                    Order #{activeOrder.orderId}
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-inner">
                {(activeOrder.tracking_status || "").replace("_", " ")}
              </span>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-1.5 mb-5">
              {["PICKED", "OUT_FOR_DELIVERY", "DELIVERED"].map((step, i) => {
                const currentIdx = [
                  "PICKED",
                  "OUT_FOR_DELIVERY",
                  "DELIVERED",
                ].indexOf(activeOrder.tracking_status || "");
                const isComplete = i <= currentIdx;
                return (
                  <div key={step} className="flex-1 flex items-center gap-1.5">
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${isComplete ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "bg-white/20"}`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2.5 text-emerald-50 text-sm max-w-[70%]">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium line-clamp-2">
                  {activeOrder.customer_address || activeOrder.username}
                </span>
              </div>
              <p className="text-2xl font-black shrink-0">
                ₹{Number(activeOrder.total_amount).toFixed(0)}
              </p>
            </div>
          </motion.div>
        )}

      {/* 20 KM RADIUS GEOLOCATION ORDER FILTERING */}
      <OrderLocationFilter
        unfilteredOrders={orders}
        onFilterComplete={setFilteredOrders}
      />

      {/* ─── Skeleton Loading State ─── */}
      {loading && isOnline && orders.length === 0 && (
        <div className="space-y-4 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl p-5 shadow-sm animate-pulse"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-5 w-24 bg-stone-200 dark:bg-stone-700 rounded-full" />
                  <div className="h-4 w-32 bg-stone-200 dark:bg-stone-700 rounded-full" />
                </div>
                <div className="h-6 w-20 bg-stone-200 dark:bg-stone-700 rounded-full" />
              </div>
              <div className="h-12 w-full bg-stone-200 dark:bg-stone-700 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* ─── Floating Order Ticket Cards ─── */}
      {!loading && (
        <div className="space-y-4 pt-2">
          <AnimatePresence>
            {filteredOrders.map((order, index) => {
              const status = (
                order.delivery_status ||
                order.tracking_status ||
                order.status ||
                "PENDING"
              ).toUpperCase();
              const isBusy = busyId === order.orderId;
              const isExpanded = expandedOrders[order.orderId] || false;

              // Distance-based accent styling
              let distanceKm = 999;
              if (driverPos && order.delivery_latitude && order.delivery_longitude) {
                distanceKm = calculateDistanceKm(
                  driverPos.lat,
                  driverPos.lng,
                  order.delivery_latitude,
                  order.delivery_longitude,
                );
              }
              const isNearby = distanceKm <= 5.0;

              // Status badges logic mapped to visual theme
              let badgeBg = "bg-stone-100 dark:bg-stone-800",
                badgeText = "text-stone-700 dark:text-stone-300";
              if (status === "PENDING" || status === "PENDING_PICKUP") {
                badgeBg = "bg-amber-100 dark:bg-amber-900/30";
                badgeText = "text-amber-700 dark:text-amber-400";
              } else if (status === "CONFIRMED") {
                badgeBg = "bg-sky-100 dark:bg-sky-900/30";
                badgeText = "text-sky-700 dark:text-sky-400";
              } else if (status === "PICKED") {
                badgeBg = "bg-indigo-100 dark:bg-indigo-900/30";
                badgeText = "text-indigo-700 dark:text-indigo-400";
              } else if (status === "OUT_FOR_DELIVERY") {
                badgeBg = "bg-purple-100 dark:bg-purple-900/30";
                badgeText = "text-purple-700 dark:text-purple-400";
              }

              return (
                <motion.div
                  key={order.orderId}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-lg ${isNearby ? "shadow-emerald-500/5" : "shadow-stone-500/5"}`}
                >
                  {/* Subtle dynamic glow indicator based on distance */}
                  <div
                    className={`absolute top-0 left-0 w-1.5 h-full ${isNearby ? "bg-gradient-to-b from-emerald-400 to-green-500" : "bg-gradient-to-b from-rose-400 to-red-500"}`}
                  />

                  <div className="p-5 pl-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
                            #{order.orderId}
                          </h3>
                          {isNearby ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              Nearby
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                              Distant
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm text-stone-700 dark:text-stone-300">
                          {order.username}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2 max-w-[200px] leading-snug">
                          {order.customer_address}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                            order.payment_method === 'cod' 
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          }`}>
                            {order.payment_method === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xl font-black text-stone-900 dark:text-stone-100">
                          ₹{Number(order.total_amount).toFixed(0)}
                        </span>
                        <motion.span
                          layoutId={`badge-${order.orderId}-${status}`}
                          className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${badgeBg} ${badgeText}`}
                        >
                          {status.replace("_", " ")}
                        </motion.span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-5">
                      <a
                        href={`tel:${order.customer_phone || "+91"}`}
                        className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />{" "}
                        {order.customer_phone || "Call Customer"}
                      </a>
                      {order.delivery_latitude && order.delivery_longitude && (
                        <a
                          href={`https://maps.google.com/?daddr=${order.delivery_latitude},${order.delivery_longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-12 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* High-Density Item List */}
                    <div className="space-y-3 my-4 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/30">
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Items to Pick Up ({order.items?.length || 0})
                      </p>

                      {order.items &&
                        order.items.map((item: any, i: number) => (
                          <div
                            key={item.id || i}
                            className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-100 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={getProductImageSrc(item.image)}
                                alt={item.product_name}
                                className="w-12 h-12 object-cover rounded-xl border border-stone-200/60 bg-stone-50"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/assets/placeholder-product.png";
                                }}
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-stone-900 text-sm line-clamp-1">
                                  {item.product_name}
                                </span>
                                <span className="text-xs text-stone-500 font-medium">
                                  Qty:{" "}
                                  <span className="text-emerald-600 font-bold">
                                    {item.product_type === "solid"
                                      ? `${item.weight} kg`
                                      : item.product_type === "liquid"
                                      ? `${item.weight} ltr`
                                      : (item.weight && item.weight !== 1)
                                      ? `${item.weight} units/kg`
                                      : Math.round(Number(item.total_price || 0) / Number(item.unit_price || 1)) || 1}
                                  </span>
                                </span>
                              </div>
                            </div>

                            <div className="text-right flex flex-col justify-center shrink-0">
                              <span className="text-sm font-bold text-stone-900">
                                ₹
                                {Number(
                                  item.total_price ||
                                    item.unit_price * (item.weight || 1),
                                ).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-semibold text-stone-400">
                                {item.product_type === "solid"
                                  ? `(₹${(Number(item.unit_price) / (Number(item.weight) || 1)).toFixed(2)} / kg)`
                                  : item.product_type === "liquid"
                                  ? `(₹${(Number(item.unit_price) / (Number(item.weight) || 1)).toFixed(2)} / ltr)`
                                  : `(₹${Number(item.unit_price).toFixed(2)} / unit)`}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Clean Structural Grid Separating Core Action Sequence from Permanent Call Utilities 🎯 */}
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-stone-200/50">
                      <div className="grid grid-cols-1 gap-2">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm py-3 px-4 rounded-xl transition-all shadow-sm"
                        >
                          📞 Call Client ({order.username || "Mohan M"})
                        </a>
                      </div>

                      <div className="w-full">
                        {(status === "PENDING" ||
                          status === "PENDING_PICKUP" ||
                          status === "ACCEPTED" ||
                          !status) && (
                          <button
                            onClick={() =>
                              handleAction(order.orderId, "CONFIRMED")
                            }
                            disabled={isBusy}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                          >
                            🤝 Accept & Confirm Order
                          </button>
                        )}

                        {status === "CONFIRMED" && (
                          <button
                            onClick={() =>
                              handleAction(order.orderId, "PICKED")
                            }
                            disabled={isBusy}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                          >
                            📦 Confirm Item Pickup
                          </button>
                        )}

                        {(status === "PICKED" || status === "PICKED_UP") && (
                          <div className="grid grid-cols-2 gap-3.5">
                            <button
                              onClick={() => {
                                // 1. Establish absolute safe default fallbacks
                                let clientLat = 10.938354;
                                let clientLng = 78.418579;

                                // 2. Extract and sanitize incoming database row parameters safely
                                const rawDbLatitude: any = order.delivery_latitude;
                                const rawDbLongitude: any = order.delivery_longitude;

                                try {
                                  // If coordinates are accidentally stored together or flipped in a single string field 🎯
                                  if (
                                    typeof rawDbLatitude === "string" &&
                                    rawDbLatitude.includes(" ")
                                  ) {
                                    const parts = rawDbLatitude
                                      .trim()
                                      .replace(/'/g, "")
                                      .split(/\s+/);
                                    if (parts.length >= 2) {
                                      const firstVal = parseFloat(parts[0]);
                                      const secondVal = parseFloat(parts[1]);

                                      if (firstVal > 50) {
                                        // If it is 78.xx, it is definitely Longitude!
                                        clientLng = firstVal;
                                        clientLat = secondVal;
                                      } else {
                                        clientLat = firstVal;
                                        clientLng = secondVal;
                                      }
                                    }
                                  } else {
                                    // Standard individual column processing with cross-over validation checks 🎯
                                    const pLat = parseFloat(
                                      String(rawDbLatitude).replace(/'/g, ""),
                                    );
                                    const pLng = parseFloat(
                                      String(rawDbLongitude).replace(/'/g, ""),
                                    );

                                    if (!isNaN(pLat) && !isNaN(pLng)) {
                                      // Ultimate Safety Guard: If the values are swapped in the DB row, un-flip them instantly!
                                      if (pLat > pLng) {
                                        clientLat = pLng;
                                        clientLng = pLat;
                                      } else {
                                        clientLat = pLat;
                                        clientLng = pLng;
                                      }
                                    }
                                  }
                                } catch (err) {
                                  console.error(
                                    "⚠️ Spatial coordinate parser fallback triggered:",
                                    err,
                                  );
                                }

                                // 3. Capture the delivery partner's current laptop location values cleanly
                                const driverLat = Number(
                                  driverPos?.lat || 10.938351145750088,
                                );
                                const driverLng = Number(
                                  driverPos?.lng || 78.41858184882939,
                                );

                                console.log(
                                  `🚀 Route Coordinates Mounted Safely:`,
                                );
                                console.log(
                                  `📍 Driver Location (Laptop): [${driverLat}, ${driverLng}]`,
                                );
                                console.log(
                                  `🎯 Client Target Location:  [${clientLat}, ${clientLng}]`,
                                );

                                setActiveNavRoute({
                                  originLat: driverLat,
                                  originLng: driverLng,
                                  destLat: clientLat,
                                  destLng: clientLng,
                                  orderId: order.orderId,
                                });
                              }}
                              className={`flex items-center justify-center gap-2 font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all shadow-md text-center transform active:scale-95 ${
                                activeNavRoute?.orderId === order.orderId
                                  ? "bg-emerald-600 text-white animate-pulse"
                                  : "bg-stone-900 text-white hover:bg-stone-800"
                              }`}
                            >
                              {activeNavRoute?.orderId === order.orderId
                                ? "🗺️ Routing on Screen"
                                : "🗺️ View Live Route"}
                            </button>
                            <button
                              onClick={() =>
                                handleAction(order.orderId, "OUT_FOR_DELIVERY")
                              }
                              disabled={isBusy}
                              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                            >
                              🚀 Out for Delivery
                            </button>
                          </div>
                        )}

                        {status === "OUT_FOR_DELIVERY" && (
                          <button
                            onClick={() =>
                              handleAction(order.orderId, "DELIVERED")
                            }
                            disabled={isBusy}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                          >
                            ✅ Complete Drop & Deliver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {!loading && isOnline && orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-24 h-24 bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-full border border-white/40 flex items-center justify-center mb-6 shadow-xl">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-stone-800 dark:text-stone-200 mb-2 tracking-tight">
            All Caught Up!
          </h3>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400 max-w-[250px]">
            No pending deliveries right now. Stay online to receive new orders.
          </p>
        </motion.div>
      )}

      {/* OTP Entry Modal for Online Payments */}
      <AnimatePresence>
        {otpModalData.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative"
            >
              <h2 className="text-xl font-black text-stone-900 text-center mb-2">
                Verify Delivery OTP
              </h2>
              <p className="text-sm text-stone-500 text-center mb-6 px-4">
                Ask the customer for the 4-digit PIN sent to them to finalize this delivery.
              </p>
              
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="• • • •"
                  value={otpModalData.otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpModalData({ ...otpModalData, otp: val });
                  }}
                  className="w-full text-center tracking-[1em] text-3xl font-black text-stone-800 bg-stone-100 rounded-2xl py-4 border-2 border-transparent focus:border-emerald-500 focus:bg-white outline-none transition-all"
                />
                
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpModalData.otp.length !== 4}
                  className="w-full py-4 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:text-stone-500 transition-colors"
                >
                  Confirm & Deliver
                </button>
                
                <button
                  onClick={() => setOtpModalData({ isOpen: false, orderId: null, otp: "" })}
                  className="w-full py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
