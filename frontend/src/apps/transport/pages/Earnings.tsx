import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IndianRupee, TrendingUp, Car, Calendar } from "lucide-react";
import { getDriverEarnings } from "../api";
import { apiClient } from "../../../api/apiClient";

interface EarningsStats {
  totalEarnings: number;
  totalRides: number;
  totalDistance: number;
  todayEarnings: number;
  todayRides: number;
  rides: any[];
  walletBalance?: number;
  commission_due_since?: string;
}

export default function Earnings() {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [commissionDueSince, setCommissionDueSince] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPartnerLedger = async () => {
      try {
        setLoading(true);
        const res: any = await apiClient.get("/transport/earnings"); // Match your API profile route
        if (res.data || res) {
          const payload = res.data || res;
          const target = payload.profile || payload.partner || payload;
          
          setEarningsData(target);
          setWalletBalance(parseFloat(target.wallet_balance || 0));
          setCommissionDueSince(target.commission_due_since || null);
        }
      } catch (err) {
        console.error("Error reading data properties:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPartnerLedger();
  }, []);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
    </div>
  );

  const { totalEarnings = 0, totalRides = 0, totalDistance = 0, todayEarnings = 0, todayRides = 0, rides = [] } = earningsData || {};

  // Safeguard values explicitly against null/undefined/NaN
  const safeTotalEarnings = Number(totalEarnings) || 0;
  const safeTotalRides = Number(totalRides) || 0;
  const safeTotalDistance = Number(totalDistance) || 0;
  const safeTodayEarnings = Number(todayEarnings) || 0;
  const safeTodayRides = Number(todayRides) || 0;
  const safeRides = Array.isArray(rides) ? rides : [];

  const getLockoutStatusText = () => {
    if (!commissionDueSince || walletBalance >= 0) return null;
    const hoursElapsed = (new Date().getTime() - new Date(commissionDueSince).getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 30 - hoursElapsed);
    return hoursRemaining <= 0 
      ? "🚨 Account Locked out: Pay dues immediately to restore your order feeds." 
      : `⏰ Notice: Clear within ${hoursRemaining.toFixed(1)} hours to avoid account automatic order lockout.`;
  };

  // 1. Filter or calculate directly from the active item list rows on screen 🎯
  const activeListItems = safeRides || [];

  // 2. Sum up the exact Gross Total from the visible list rows
  const cleanGrossTotal = activeListItems.reduce((acc: number, item: any) => {
    // Read target payout key depending on your column naming layout (payout, fare, amount)
    const rowAmount = parseFloat(item.amount || item.delivery_payout || item.charge_amount || item.fare || 0);
    return acc + rowAmount;
  }, 0);

  // 3. Filter unpaid items based on local settlement timestamp
  const lastSettledTime = parseInt(localStorage.getItem('transport_last_settled_time') || "0");
  const unpaidItems = activeListItems.filter((item: any) => new Date(item.created_at).getTime() > lastSettledTime);
  const unpaidGrossTotal = unpaidItems.reduce((acc: number, item: any) => {
    const rowAmount = parseFloat(item.amount || item.delivery_payout || item.charge_amount || item.fare || 0);
    return acc + rowAmount;
  }, 0);

  // 4. Compute the exact 10% Platform Admin Cut from only the UNPAID list total 🎯
  const commissionOwed = unpaidGrossTotal * 0.10;

  // 5. Compute the exact Net Earnings remainder (Statically 90% of Gross Fare)
  const cleanNetEarnings = cleanGrossTotal * 0.90;

  console.log(`✅ Financial Reset -> Count: ${activeListItems.length} | Gross: ₹${cleanGrossTotal} | Commission: ₹${commissionOwed} | Net: ₹${cleanNetEarnings}`);

  const handlePayCommissionDues = async (amountToSettle: number) => {
    try {
      console.log(`📡 Dispaching payment registration pipeline context for amount: ₹${amountToSettle}`);
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_S5dc6OUqbnjbGQ", // Loaded from env or fallback
        amount: amountToSettle * 100,
        currency: "INR",
        name: "VillageMart Core Admin",
        description: `Settle Commission Dues: ₹${amountToSettle.toFixed(2)}`,
        handler: async function (authRes: any) {
          const verifyRes: any = await apiClient.post("/payment/razorpay/verify", {
            razorpay_payment_id: authRes.razorpay_payment_id
          });

          if (verifyRes.success || verifyRes.data?.success) {
            localStorage.setItem('transport_last_settled_time', Date.now().toString());
            alert("🎉 Commission payment complete! Account balances cleared successfully.");
            window.location.reload();
          }
        },
        theme: { color: "#10b981" }
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();

    } catch (err: any) {
      console.error("🚨 Razorpay checkout lifecycle failure:", err);
      alert(`Payment initialization failed: ${err.message}`);
    }
  };

  return (
    <div className="pb-24 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Earnings</h1>

      {/* Today's Earnings Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-200">
        {/* Net Earnings Display Header Card UI Element 🎯 */}
        <div className="flex flex-col text-left">
          <span className="text-xs uppercase font-bold tracking-wider text-white/70">Net Earnings Displayed</span>
          <span className="text-3xl font-black text-white">
            ₹{cleanNetEarnings.toFixed(2)}
          </span>
          <div className="mt-1 flex gap-3 text-xs font-semibold text-white/80">
            <span>📦 {activeListItems.length} {activeListItems.length === 1 ? 'Job' : 'Jobs'} Today</span>
            <span>•</span>
            <span>Gross Fare: ₹{cleanGrossTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Platform Commission Razorpay Trigger Panel */}
        <div className="mt-4 bg-black/15 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/70">Platform Commission Balance</span>
            <span className="text-xl font-black text-white">₹{commissionOwed.toFixed(2)} Pending</span>
            {commissionOwed > 0 && (
              <span className="text-[11px] font-semibold text-amber-300 mt-1">
                ⚠️ Attention: Platform commission balances must be settled via Razorpay within 30 hours of accumulation to prevent automated system lockouts from active order feeds.
              </span>
            )}
          </div>
          <button
            onClick={() => handlePayCommissionDues(commissionOwed)}
            className="bg-white text-stone-900 font-extrabold text-xs px-4 py-2 rounded-xl shadow-md hover:bg-stone-50 active:scale-95 transition-all w-full md:w-auto"
          >
            Pay Dues Now
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Earnings", value: `₹${safeTotalEarnings.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Rides", value: safeTotalRides, icon: Car, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Distance", value: `${safeTotalDistance.toFixed(1)} km`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Avg per Ride", value: safeTotalRides > 0 ? `₹${Math.round(safeTotalEarnings / safeTotalRides)}` : "₹0", icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 p-4">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Earnings List */}
      <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Recent Earnings</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {safeRides.slice(0, 10).map((b) => (
            <div key={b.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Ride #{b.id}</p>
                <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleString("en-IN")} · {Number(b.distance_km).toFixed(1)} km</p>
              </div>
              <p className="text-sm font-bold text-green-700">+₹{Number(b.charge_amount).toFixed(0)}</p>
            </div>
          ))}
          {safeRides.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">No earnings yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
