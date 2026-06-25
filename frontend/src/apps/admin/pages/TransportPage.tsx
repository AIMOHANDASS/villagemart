import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw } from "lucide-react";
import { getAdminPanelData, confirmTransportBooking } from "../api";
import { apiClient } from "../../../api/apiClient";
import type { TransportBooking } from "../types";
import toast from "react-hot-toast";

const VEHICLE_FLEET = [
  { key: "scooter", label: "Scooter", icon: "🛵" },
  { key: "bike",    label: "Bike",    icon: "🏍️" },
  { key: "auto",    label: "Auto",    icon: "🛺" },
  { key: "car",     label: "Car",     icon: "🚗" },
];

const statusColors: Record<string, string> = {
  BOOKED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-amber-100 text-amber-700",
  STARTED: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  PENDING: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-indigo-100 text-indigo-700",
};

export default function TransportPage() {
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  /* ── Fleet Service Toggle State ── */
  const [fleetServices, setFleetServices] = useState<Record<string, boolean>>({ scooter: true, bike: true, auto: true, car: true });
  const [togglingVehicle, setTogglingVehicle] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data: any = await getAdminPanelData();
      setBookings(data.transportBookings || []);
    } catch { toast.error("Failed to load transport bookings"); }
    finally { setLoading(false); }
  };

  /* ── Fetch current fleet service status from backend ── */
  const fetchFleetStatus = async () => {
    try {
      const res: any = await apiClient.get("/settings/global-vehicles");
      if (res?.success && res.services) {
        setFleetServices(res.services);
      }
    } catch {
      console.warn("⚠️ Could not fetch fleet service status");
    }
  };

  useEffect(() => {
    fetchData();
    fetchFleetStatus();
    const i = setInterval(fetchData, 10000);
    return () => clearInterval(i);
  }, []);

  /* ── Toggle a vehicle service on/off ── */
  const handleToggleService = async (vehicleKey: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTogglingVehicle(vehicleKey);
    try {
      const res: any = await apiClient.put("/settings/update-vehicle-service", {
        vehicleType: vehicleKey,
        isActive: nextStatus,
      });
      if (res?.success) {
        setFleetServices(prev => ({ ...prev, [vehicleKey]: nextStatus }));
        toast.success(res.message || `${vehicleKey} ${nextStatus ? "enabled" : "disabled"}`);
      } else {
        toast.error(res?.message || "Toggle update failed");
      }
    } catch (err: any) {
      toast.error("Failed to update service status.");
    } finally {
      setTogglingVehicle(null);
    }
  };

  const filtered = bookings.filter((b) =>
    !search || b.username?.toLowerCase().includes(search.toLowerCase()) || b.customer_name?.toLowerCase().includes(search.toLowerCase()) || String(b.id).includes(search)
  );

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">

      {/* ═══════════════════════════════════════════════════════════
         🛠️ GLOBAL FLEET SERVICE CONTROL PANEL
      ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm"
      >
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-base">🛠️</span>
          <h3 className="text-sm font-black text-stone-800 uppercase tracking-wider">Global Fleet Service Control</h3>
        </div>
        <p className="text-xs text-stone-500 font-medium mb-4 pl-7">
          Toggle vehicle tiers on/off to control customer ride choices across VillageMart.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VEHICLE_FLEET.map(({ key, label, icon }) => {
            const isActive = fleetServices[key] !== false;
            const isToggling = togglingVehicle === key;

            return (
              <div
                key={key}
                className={`relative flex items-center justify-between p-3.5 rounded-xl border-2 transition-all duration-300 ${
                  isActive
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-stone-50 border-stone-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <span className="text-xs font-black uppercase text-stone-700 tracking-tight block">{label}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-emerald-600" : "text-red-500"}`}>
                      {isActive ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggleService(key, isActive)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    isActive
                      ? "bg-emerald-500 focus:ring-emerald-400"
                      : "bg-stone-300 focus:ring-stone-400"
                  } ${isToggling ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                  aria-label={`Toggle ${label} service`}
                >
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm ${
                      isActive ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
         📋 TRANSPORT BOOKINGS LIST (unchanged)
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} bookings</p>
        </div>
        <button onClick={() => { setLoading(true); fetchData(); }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-sm shadow-sm">
        <Search className="w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bookings..." className="bg-transparent text-sm outline-none flex-1" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((booking: any) => (
          <div key={booking.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              {/* Card Metadata Title Container */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black text-stone-800">Ride #{booking.id}</span>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  booking.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                }`}>
                  {booking.status || "BOOKED"}
                </span>
              </div>

              {/* 🎯 REFACTOR: Integrated Customer Profile details block handles database fields seamlessly */}
              <div className="bg-stone-50 rounded-xl p-2.5 mb-3 border border-stone-100 text-[11px] font-medium text-stone-600 space-y-0.5">
                <p><span className="text-stone-400 font-bold">👤 Customer:</span> <span className="text-stone-800 font-black">{booking.customer_name || booking.username || "Unknown"}</span></p>
                <p><span className="text-stone-400 font-bold">📞 Phone:</span> <span className="text-stone-700 font-semibold">{booking.customer_phone || "Not provided"}</span></p>
              </div>

              {/* Route Address Details */}
              <div className="space-y-1.5 mb-4 text-xs text-stone-600 font-medium">
                <p className="line-clamp-1"><span className="text-emerald-500 font-bold">📍 From:</span> {booking.from_address || booking.pickup_location}</p>
                <p className="line-clamp-1"><span className="text-red-500 font-bold">🏁 To:</span> {booking.to_address || booking.drop_location}</p>
              </div>
            </div>

            <div className="text-xs text-stone-500 font-semibold border-t border-stone-100 pt-3 flex justify-between items-center">
              <span>Distance: {parseFloat(String(booking.distance_km || booking.distance || 0)).toFixed(2)} km</span>
              
              <div className="flex flex-col items-end">
                {/* 🎯 REFACTOR: Direct case-insensitive database column string mapping solves the wrong tag bug */}
                <span className="text-[10px] font-black bg-stone-100 text-stone-600 px-2 py-0.5 rounded uppercase tracking-widest mb-1">
                  {String(booking.vehicle_type || "Vehicle").toUpperCase()}
                </span>
                <span className="text-base font-black text-emerald-600">
                  ₹{parseFloat(String(booking.charge_amount || booking.fare || 0)).toFixed(2)}
                </span>
              </div>
            </div>

          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">No transport bookings found</div>
        )}
      </div>
    </div>
  );
}
