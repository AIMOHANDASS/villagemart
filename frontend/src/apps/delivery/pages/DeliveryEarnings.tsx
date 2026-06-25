import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IndianRupee, TrendingUp, Package, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { getDeliveryEarnings } from "../api";
import { apiClient } from "../../../api/apiClient";

interface EarningsStats {
  totalEarnings: number;
  totalDeliveries: number;
  todayEarnings: number;
  todayDeliveries: number;
  history: any[];
  walletBalance?: number;
  commission_due_since?: string;
}

export default function DeliveryEarnings() {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [commissionDueSince, setCommissionDueSince] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPartnerLedger = async () => {
      try {
        setLoading(true);
        const res: any = await apiClient.get("/delivery/earnings"); // Match your API profile route
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
      <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  );

  const { totalEarnings = 0, totalDeliveries = 0, todayEarnings = 0, todayDeliveries = 0, history = [] } = earningsData || {};

  // Safeguard values explicitly against null/undefined/NaN
  const safeTotalEarnings = Number(totalEarnings) || 0;
  const safeTotalDeliveries = Number(totalDeliveries) || 0;
  const safeTodayEarnings = Number(todayEarnings) || 0;
  const safeTodayDeliveries = Number(todayDeliveries) || 0;
  const safeHistory = Array.isArray(history) ? history : [];

  const getLockoutStatusText = () => {
    if (!commissionDueSince || walletBalance >= 0) return null;
    const hoursElapsed = (new Date().getTime() - new Date(commissionDueSince).getTime()) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, 30 - hoursElapsed);
    return hoursRemaining <= 0 
      ? "🚨 Account Locked out: Pay dues immediately to restore your order feeds." 
      : `⏰ Notice: Clear within ${hoursRemaining.toFixed(1)} hours to avoid account automatic order lockout.`;
  };

  // 1. Filter or calculate directly from the active item list rows on screen 🎯
  const activeListItems = safeHistory || [];

  // 2. Sum up the exact Gross Total from the visible list rows
  const cleanGrossTotal = activeListItems.reduce((acc: number, item: any) => {
    // Read target payout key depending on your column naming layout (payout, fare, amount)
    const rowAmount = parseFloat(item.amount || item.delivery_fee || item.delivery_payout || item.fare || 0);
    return acc + rowAmount;
  }, 0);

  // 3. Filter unpaid items based on local settlement timestamp
  const lastSettledTime = parseInt(localStorage.getItem('delivery_last_settled_time') || "0");
  const unpaidItems = activeListItems.filter((item: any) => new Date(item.created_at).getTime() > lastSettledTime);
  const unpaidGrossTotal = unpaidItems.reduce((acc: number, item: any) => {
    const rowAmount = parseFloat(item.amount || item.delivery_fee || item.delivery_payout || item.fare || 0);
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
            localStorage.setItem('delivery_last_settled_time', Date.now().toString());
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
      <h1 className="text-xl font-bold text-gray-900">My Earnings</h1>

      {/* Today's Earnings Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-3xl p-6 text-white shadow-xl shadow-green-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
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
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Lifetime Earnings", value: `₹${safeTotalEarnings.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total Deliveries", value: safeTotalDeliveries, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Success Rate", value: "98%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Work Hours", value: "42h", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label} 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-wider">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent History */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Recent Deliveries</h3>
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>
        <div className="divide-y divide-gray-50">
          {safeHistory.length > 0 ? safeHistory.slice(0, 15).map((order) => (
            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Order #{order.id}</p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    {new Date(order.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })} · 
                    {new Date(order.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-green-600">+₹{Number(order.delivery_fee || 20).toFixed(0)}</p>
                <p className="text-[10px] text-gray-400 font-medium">Delivery Payout</p>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center flex flex-col items-center">
                <Package className="w-12 h-12 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Your earnings will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
