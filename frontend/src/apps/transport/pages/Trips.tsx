import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, IndianRupee, CheckCircle2 } from "lucide-react";
import { getTransportBookings } from "../api";

interface Booking {
  id: number;
  username: string;
  customer_name: string;
  from_address: string;
  to_address: string;
  distance_km: number;
  charge_amount: number;
  status: string;
  created_at: string;
}

export default function Trips() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getTransportBookings();
        setBookings(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const confirmedTrips = bookings.filter((b) => b.status?.toUpperCase() !== "PENDING");

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="pb-24 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Trips</h1>
        <p className="text-sm text-gray-500">{confirmedTrips.length} total trips</p>
      </div>

      {confirmedTrips.map((trip, i) => (
        <motion.div key={trip.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Trip #{trip.id}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {trip.status}
            </span>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
              <div className="w-0.5 h-6 bg-gray-200" />
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-gray-700 leading-tight">{trip.from_address}</p>
              <p className="text-sm text-gray-700 leading-tight">{trip.to_address}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-500"><MapPin className="w-3.5 h-3.5" />{Number(trip.distance_km).toFixed(1)} km</span>
            <span className="flex items-center gap-1 text-gray-500"><Clock className="w-3.5 h-3.5" />{new Date(trip.created_at).toLocaleDateString("en-IN")}</span>
            <span className="flex items-center gap-0.5 font-bold text-green-700"><IndianRupee className="w-3.5 h-3.5" />{Number(trip.charge_amount).toFixed(0)}</span>
          </div>
        </motion.div>
      ))}

      {confirmedTrips.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
            <MapPin className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">No trips yet. Accept a ride to get started!</p>
        </div>
      )}
    </div>
  );
}
