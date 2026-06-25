import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, RefreshCw } from "lucide-react";
import { getAdminPanelData, confirmPartyHallBooking } from "../api";
import type { PartyHallBooking } from "../types";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const parseAddOns = (v?: string) => { try { const p = JSON.parse(v || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } };

export default function PartyHallPage() {
  const [bookings, setBookings] = useState<PartyHallBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const data = await getAdminPanelData();
      setBookings(data.partyHallBookings || []);
    } catch { toast.error("Failed to load party hall bookings"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, []);

  const handleConfirm = async (id: number) => {
    setBusyId(id);
    try { await confirmPartyHallBooking(id); toast.success("Booking confirmed!"); await fetchData(); } catch (e: any) { toast.error(e.message); }
    setBusyId(null);
  };

  const filtered = bookings.filter((b) =>
    !search || b.username?.toLowerCase().includes(search.toLowerCase()) || b.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Party Hall Bookings</h1>
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
        {filtered.map((b, i) => {
          const addOns = parseAddOns(b.add_ons_json);
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 p-5 hover:shadow-[var(--shadow-elevated)] transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-900">#{b.id}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[b.status?.toUpperCase()] || "bg-gray-100 text-gray-700"}`}>{b.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700"><span className="font-medium">Customer:</span> {b.username || b.customer_name}</p>
                <p className="text-gray-700"><span className="font-medium">Phone:</span> {b.customer_phone}</p>
                <div className="bg-purple-50 rounded-xl p-3 space-y-1">
                  <p className="text-gray-700 font-medium">🎉 {b.event_date}</p>
                  <p className="text-gray-600">{String(b.start_time).slice(0, 5)} – {String(b.end_time).slice(0, 5)}</p>
                  <p className="text-gray-600">👥 {b.person_count} persons</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.snacks_count > 0 && <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-lg">🍿 Snacks ×{b.snacks_count}</span>}
                  {b.water_count > 0 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">💧 Water ×{b.water_count}</span>}
                  {b.cake_count > 0 && <span className="text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded-lg">🎂 Cake ×{b.cake_count}</span>}
                </div>
                {addOns.length > 0 && <p className="text-xs text-gray-400">Services: {addOns.join(", ")}</p>}
                {b.notes && <p className="text-xs text-gray-400 italic">📝 {b.notes}</p>}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleString("en-IN")}</p>
                  <p className="text-lg font-bold text-green-700">₹{Number(b.total_charge).toFixed(2)}</p>
                </div>
              </div>
              <button disabled={b.status?.toUpperCase() === "CONFIRMED" || busyId === b.id} onClick={() => handleConfirm(b.id)}
                className="mt-4 w-full py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {busyId === b.id ? "Confirming..." : b.status?.toUpperCase() === "CONFIRMED" ? "✓ Confirmed" : "Confirm Booking"}
              </button>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">No party hall bookings found</div>
        )}
      </div>
    </div>
  );
}
