import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext, useNavigate, Link } from "react-router-dom";
import { MapPin, Navigation, Phone, Clock, IndianRupee, CheckCircle2, RefreshCw, Languages, ShieldCheck } from "lucide-react";
import { getTransportBookings, confirmTransportBooking, updateRideStatus, updateLocation, toggleOnline, API_BASE_URL, apiClient } from "../api";
import { TAMILNADU_COMPLETE_GEO, TalukCoordinates } from "../../../data/tamilNaduGeoData";
import toast from "react-hot-toast";

interface Booking {
    id: number;
    username: string;
    customer_name: string;
    customer_phone: string;
    from_address: string;
    pickup_location?: string;
    pickup_address?: string;
    to_address: string;
    drop_location?: string;
    drop_address?: string;
    from_lat?: number;
    from_latitude?: number;
    latitude?: number;
    from_lng?: number;
    from_longitude?: number;
    longitude?: number;
    to_lat?: number;
    to_lng?: number;
    distance_km: number;
    distance?: number;
    charge_amount: number;
    fare?: number;
    amount?: number;
    vehicle_type: string;
    status: string;
    notes?: string;
    created_at: string;
}

type RideState = "IDLE" | "ACCEPTED" | "STARTED" | "ENDED";

// 🎯 Highly accurate geographic Haversine utility to compute mileage constraints
const computeHaversineDistanceKM = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Earth perimeter radius in KM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function TransportHome() {
    const context: any = useOutletContext();
    const user = context?.user || JSON.parse(localStorage.getItem("transport_user") || localStorage.getItem("user") || "{}");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [driverVehicleType, setDriverVehicleType] = useState<string>("");
    const [selectedDistrict, setSelectedDistrict] = useState<string>("");
    const [selectedTaluk, setSelectedTaluk] = useState<TalukCoordinates | null>(null);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [activeRide, setActiveRide] = useState<Booking | null>(null);
    const [rideState, setRideState] = useState<RideState>("IDLE");
    const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [lang, setLang] = useState<'EN' | 'TA'>('EN');
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);
    const trackingRef = useRef<number | null>(null);
    const navigate = useNavigate();

    // 1. Fetch available jobs and partner details relative to base endpoint configurations
    const loadDashboardContextData = async (showSilent = false) => {
        if (!showSilent) setLoading(true);
        try {
            // Fetch profile safely to calculate driver asset type restrictions
            const profileRes = await apiClient.get("/transport/earnings");
            if (profileRes.data) {
                const partner = profileRes.data.profile || profileRes.data.partner || profileRes.data;
                setDriverVehicleType(String(partner.vehicle_type || user?.vehicle_type || user?.vehicle || "").toLowerCase().trim());
            }

            // Fetch open jobs catalog
            const data = await getTransportBookings();
            setBookings(data || []);
        } catch (err) {
            console.error("❌ Dashboard data layer synchronization failed:", err);
            toast.error("Failed to load rides");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardContextData();
        const refreshTimer = setInterval(() => loadDashboardContextData(true), 10000);
        return () => clearInterval(refreshTimer);
    }, []);

    // Live GPS tracking lifecycle configurations
    useEffect(() => {
        if (rideState === "STARTED" && navigator.geolocation) {
            const sendLocation = () => {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setDriverPos(loc);
                        try {
                            await updateLocation(loc.lat, loc.lng);
                        } catch (err) { console.warn("Location sync failed", err); }
                    },
                    (err) => console.warn("GPS error:", err),
                    { enableHighAccuracy: true }
                );
            };
            sendLocation();
            trackingRef.current = window.setInterval(sendLocation, 5000);
        }
        return () => {
            if (trackingRef.current) clearInterval(trackingRef.current);
        };
    }, [rideState]);

    // ENFORCE RIGID VEHICLE BOUNDARY SAFETY CHECKS
    useEffect(() => {
        if (activeRide) {
            const currentDriverVehicle = String(driverVehicleType || "").toLowerCase().trim();
            const currentRideVehicle = String(activeRide.vehicle_type || "").toLowerCase().trim();
            
            // Strict check protects drivers from layout bugs or matching leakage patterns
            if (currentDriverVehicle && currentRideVehicle !== currentDriverVehicle) {
                console.warn("⚠️ Fleet alignment anomaly caught: Resetting mismatched active state configuration.");
                setActiveRide(null);
                setRideState("IDLE");
            }
        }
    }, [activeRide, driverVehicleType]);

    // 2. High-Performance Multi-Stage Case Insensitive Geofence Pipeline 🚀
    const processedFilteredRides = useMemo(() => {
        // RULE 1: If the driver toggles to an offline status state, empty out the feed immediately
        if (!isOnline) {
            return [];
        }

        let filteredQueue = bookings || [];

        // RULE 2: Enforce strict, case-insensitive vehicle type matching
        if (driverVehicleType) {
            const cleanDriverVehicle = driverVehicleType.toLowerCase().trim();
            filteredQueue = filteredQueue.filter((ride) => {
                const cleanRideVehicle = String(ride.vehicle_type || "").toLowerCase().trim();
                return cleanRideVehicle === cleanDriverVehicle;
            });
        }

        // RULE 3: Cascading Multi-Stage Location Resolution Matrix
        if (selectedDistrict) {
            const currentDistrictUpper = selectedDistrict.toUpperCase().trim();
            const associatedDistrictTaluks = TAMILNADU_COMPLETE_GEO[selectedDistrict] || [];

            // Stage A: If a specific Taluk is chosen, handle precise radius math and local landmark text matches
            if (selectedTaluk) {
                const targetTalukUpper = selectedTaluk.name.toUpperCase().trim();

                filteredQueue = filteredQueue.filter((ride) => {
                    const pickupAddress = String(
                        ride.from_address || ride.pickup_location || ride.pickup_address || ""
                    ).toUpperCase();

                    // 🎯 SMART LANDMARK OVERRIDES: Instantly match key sub-regions or local landmarks to prevent data drops
                    if (pickupAddress.includes(targetTalukUpper)) return true;

                    // Contextual checks for your mapped region keywords (e.g., Thandai, Ayyarmalai, Murali Tower matching KULITHALAI)
                    if (targetTalukUpper === "KULITHALAI" && (
                        pickupAddress.includes("AYYARMALAI") ||
                        pickupAddress.includes("THANDAI") ||
                        pickupAddress.includes("MURALI TOWER") ||
                        pickupAddress.includes("VALAYAPATTI")
                    )) {
                        return true;
                    }

                    // Secondary Backup: Evaluate geographic boundary points using the Haversine formula
                    const orderLat = parseFloat(String(ride.from_lat || ride.from_latitude || ride.latitude || 0));
                    const orderLng = parseFloat(String(ride.from_lng || ride.from_longitude || ride.longitude || 0));

                    if (orderLat && orderLng) {
                        const totalDistanceAway = computeHaversineDistanceKM(selectedTaluk.lat, selectedTaluk.lng, orderLat, orderLng);
                        return totalDistanceAway <= 20; // Operational 20 KM radius cap parameter limit
                    }

                    return false;
                });
            } else {
                // Stage B: If only a District is selected, parse address tokens for matches
                filteredQueue = filteredQueue.filter((ride) => {
                    const pickupAddress = String(
                        ride.from_address || ride.pickup_location || ride.pickup_address || ""
                    ).toUpperCase();

                    const matchesDistrictName = pickupAddress.includes(currentDistrictUpper);
                    const matchesAnyChildTaluk = associatedDistrictTaluks.some(taluk =>
                        pickupAddress.includes(taluk.name.toUpperCase().trim())
                    );

                    return matchesDistrictName || matchesAnyChildTaluk;
                });
            }
        }

        return filteredQueue;
    }, [bookings, driverVehicleType, selectedDistrict, selectedTaluk, isOnline]);

    const handleAcceptRide = async (booking: Booking) => {
        setBusyId(booking.id);
        try {
            await confirmTransportBooking(booking.id);
            setActiveRide(booking);
            setRideState("ACCEPTED");
            toast.success("Ride accepted! Navigate to pickup.");
            await loadDashboardContextData(true);
        } catch (e: any) {
            toast.error(e.message || "Could not accept ride request at this time. Please retry.");
        } finally {
            setBusyId(null);
        }
    };

    const handleStartRide = async () => {
        if (!activeRide || otp.length < 4) {
            toast.error("Please enter the 4-digit OTP from customer");
            return;
        }
        setVerifying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/transport/verify-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("jwt_token_transport")}`
                },
                body: JSON.stringify({ rideId: activeRide.id, otp })
            });
            const data = await res.json();
            if (data.success) {
                setRideState("STARTED");
                setOtp("");
                toast.success("OTP Verified! Ride started.");
            } else {
                toast.error(data.message || "Verification failed");
            }
        } catch (e: any) {
            toast.error("Verification error");
        } finally {
            setVerifying(false);
        }
    };

    const handleEndRide = async () => {
        if (!activeRide) return;
        try {
            await updateRideStatus(activeRide.id, "COMPLETED");
            setRideState("ENDED");
            if (trackingRef.current) clearInterval(trackingRef.current);
            toast.success("Ride completed! 🎉");
        } catch (e: any) { toast.error(e.message); }
    };

    const handleNewRide = () => {
        setActiveRide(null);
        setRideState("IDLE");
        setDriverPos(null);
        loadDashboardContextData();
    };

    const handleToggleOnline = async () => {
        setToggling(true);
        try {
            const next = !isOnline;
            await toggleOnline(next);
            setIsOnline(next);
            toast.success(next ? "You are now ONLINE" : "You are now OFFLINE");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setToggling(false);
        }
    };

    const t = (en: string, ta: string) => lang === 'TA' ? ta : en;
    const calculateETA = (km: number) => {
        const avgSpeedKmH = 25;
        const mins = Math.round((km / avgSpeedKmH) * 60);
        return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    };

    if (!loading && user?.status && user.status !== 'approved') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-amber-100">
                    <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
                </motion.div>
                <h1 className="text-2xl font-black text-gray-900 mb-2">Account Pending Approval</h1>
                <p className="text-gray-500 max-w-xs mb-8">
                    Thanks for signing up! Our admin team is currently reviewing your vehicle details and documents. You'll be notified once approved.
                </p>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm w-full max-w-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-gray-900">Application Submitted</p>
                            <p className="text-[11px] text-gray-500">Document verification in progress</p>
                        </div>
                    </div>
                    <button onClick={() => window.location.reload()}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all">
                        Check Status
                    </button>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Loading ride requests...</p>
            </div>
        </div>
    );

    // Active Map and Ride Navigation Render Block
    if (activeRide && rideState !== "IDLE") {
        const activeDistance = Number(activeRide.distance_km || activeRide.distance || 0);
        const activeFare = Number(activeRide.charge_amount || activeRide.fare || activeRide.amount || 0);

        return (
            <div className="pb-24 space-y-4">
                <h1 className="text-xl font-bold text-gray-900">
                    {rideState === "ACCEPTED" ? "🚗 Navigate to Pickup" : rideState === "STARTED" ? "🛣️ Ride in Progress" : "✅ Ride Completed"}
                </h1>

                <div className="w-full bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                    <div className="bg-stone-950 p-3 text-white flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {rideState === "ACCEPTED" ? "📍 Route 1: Going to Boarding Point" : "🛣️ Route 2: Traveling to Drop Point"}
                        </span>
                        <span className="text-[11px] bg-emerald-600 px-2 py-0.5 rounded font-black animate-pulse">LIVE GPS</span>
                    </div>

                    <div className="w-full h-72 bg-stone-100 relative">
                        <iframe
                            title="VillageMart Embedded Routing System Map"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            src={
                                rideState === "ACCEPTED" && driverPos
                                    ? `https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&origin=${driverPos.lat},${driverPos.lng}&destination=${activeRide.from_lat || activeRide.latitude},${activeRide.from_lng || activeRide.longitude}&mode=driving`
                                    : `https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&origin=${activeRide.from_lat || activeRide.latitude},${activeRide.from_lng || activeRide.longitude}&destination=${activeRide.to_lat || activeRide.longitude},${activeRide.to_lng || activeRide.longitude}&mode=driving`
                            }
                        />
                    </div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-gray-900">Ride #{activeRide.id}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${rideState === "ENDED" ? "bg-emerald-100 text-emerald-700" : rideState === "STARTED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                            }`}>
                            {rideState === "ENDED" ? "Completed" : rideState === "STARTED" ? "In Progress" : "Accepted"}
                        </span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full" />
                                <div className="w-0.5 h-8 bg-gray-200" />
                                <div className="w-3 h-3 bg-red-500 rounded-full" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-xs text-gray-400 font-medium">PICKUP</p>
                                    <p className="text-sm font-medium text-gray-800">{activeRide.from_address || activeRide.pickup_location || activeRide.pickup_address}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-medium">DROP</p>
                                    <p className="text-sm font-medium text-gray-800">{activeRide.to_address || activeRide.drop_location || activeRide.drop_address}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-gray-900">{activeDistance.toFixed(1)}</p>
                            <p className="text-[10px] text-gray-400 font-medium">KM</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-green-600">₹{activeFare.toFixed(0)}</p>
                            <p className="text-[10px] text-gray-400 font-medium">FARE</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-blue-600">{calculateETA(activeDistance)}</p>
                            <p className="text-[10px] text-gray-400 font-medium">ETA</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{activeRide.customer_name || activeRide.username}</p>
                            <p className="text-xs text-gray-500">{activeRide.customer_phone}</p>
                        </div>
                        <div className="flex gap-2">
                            <a href={`tel:${activeRide.customer_phone}`} className="p-2.5 bg-green-100 rounded-xl hover:bg-green-200 transition-colors">
                                <Phone className="w-5 h-5 text-green-700" />
                            </a>
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-3">
                    {rideState === "ACCEPTED" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center shadow-sm">
                                <p className="text-sm font-bold text-gray-500 mb-4">{t('Enter Passenger OTP', 'பயணியின் OTP ஐ உள்ளிடவும்')}</p>
                                <div className="flex justify-center gap-3 mb-6">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-all ${otp.length > i ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-gray-100 bg-gray-50 text-gray-300'}`}>
                                            {otp[i] || "•"}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"].map((btn) => (
                                        <motion.button key={btn} whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                if (btn === "C") setOtp("");
                                                else if (btn === "⌫") setOtp(prev => prev.slice(0, -1));
                                                else if (otp.length < 4) setOtp(prev => prev + btn);
                                            }}
                                            className="h-12 rounded-xl bg-gray-50 text-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                            {btn}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>

                            <motion.button whileTap={{ scale: 0.96 }} disabled={otp.length < 4 || verifying} onClick={handleStartRide}
                                className="w-full py-4 bg-amber-500 text-white text-lg font-bold rounded-2xl hover:bg-amber-600 disabled:opacity-50 transition-all shadow-sm">
                                {verifying ? "Verifying..." : t('🏁 Start Ride', '🏁 பயணத்தைத் தொடங்கு')}
                            </motion.button>
                        </motion.div>
                    )}

                    {rideState === "STARTED" && (
                        <motion.button whileTap={{ scale: 0.96 }} onClick={handleEndRide}
                            className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-2xl hover:bg-red-700 transition-all shadow-md">
                            🏁 End Ride
                        </motion.button>
                    )}
                    {rideState === "ENDED" && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                            <div className="bg-emerald-50 rounded-2xl p-6 text-center border border-emerald-100">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                                <p className="text-lg font-bold text-emerald-800">Ride Completed!</p>
                                <p className="text-3xl font-extrabold text-emerald-600 mt-2">₹{activeFare.toFixed(0)}</p>
                                <p className="text-sm text-emerald-600 mt-1">Earned</p>
                            </div>
                            <motion.button whileTap={{ scale: 0.96 }} onClick={handleNewRide}
                                className="w-full py-4 bg-black text-white text-lg font-bold rounded-2xl hover:bg-gray-900 transition-all shadow-md">
                                Find New Rides →
                            </motion.button>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    }

    // Primary Open Requests Dashboard Pipeline View Layout
    return (
        <div className="pb-24 space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Verified Driver</p>
                        <p className="text-xs font-bold text-gray-500 leading-none">ID: VM-DR-00{user?.id || '?'}</p>
                    </div>
                </div>
                <button onClick={() => setLang(lang === 'EN' ? 'TA' : 'EN')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                    <Languages className="w-3.5 h-3.5" />
                    {lang === 'EN' ? 'தமிழ்' : 'English'}
                </button>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-amber-500 animate-pulse shadow-sm' : 'bg-gray-300'}`} />
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            {isOnline ? t('Active', 'ஆன்லைனில்') : t('Offline', 'ஆஃப்லைனில்')}
                        </h2>
                        <p className="text-[10px] text-gray-400 leading-none">
                            {isOnline ? t('Waiting for ride requests...', 'சவாரி கோரிக்கைகளுக்காக காத்திருக்கிறது...') : t('Tap toggle to go online', 'ஆன்லைனில் செல்ல தட்டவும்')}
                        </p>
                    </div>
                </div>
                <button onClick={handleToggleOnline} disabled={toggling}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${isOnline ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-amber-600 text-white hover:bg-amber-700'
                        }`}
                >
                    {toggling ? '...' : isOnline ? t('Go Offline', 'செல்லுங்கள்') : t('Go Online', 'ஆன்லைன் செல்')}
                </button>
            </div>

            {/* 🚀 Tamil Nadu Geographic Selector Dropdown Deck */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex flex-col">
                    <label className="text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wider">Select District</label>
                    <select
                        className="border border-gray-300 rounded-xl p-2.5 text-sm bg-gray-50 text-gray-700 font-semibold shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        value={selectedDistrict}
                        onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedTaluk(null); }}
                    >
                        <option value="">All Districts (All Tamil Nadu)</option>
                        {Object.keys(TAMILNADU_COMPLETE_GEO).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wider">Select Taluk (20km Radius Fence)</label>
                    <select
                        className="border border-gray-300 rounded-xl p-2.5 text-sm bg-gray-50 text-gray-700 font-semibold shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                        disabled={!selectedDistrict}
                        value={selectedTaluk?.name || ""}
                        onChange={(e) => {
                            const match = TAMILNADU_COMPLETE_GEO[selectedDistrict]?.find(t => t.name === e.target.value);
                            setSelectedTaluk(match || null);
                        }}
                    >
                        <option value="">Select Taluk Area Hub...</option>
                        {selectedDistrict && TAMILNADU_COMPLETE_GEO[selectedDistrict].map(t => (
                            <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">{t('Ride Requests', 'சவாரி கோரிக்கைகள்')}</h1>
                    <p className="text-sm text-gray-500">{processedFilteredRides.length} {t('available rides', 'கிடைக்கும் சவாரிகள்')}</p>
                </div>
                <button onClick={() => { setLoading(true); loadDashboardContextData(); }} className="p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors">
                    <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <AnimatePresence>
                {processedFilteredRides.map((booking, index) => {
                    const distanceKM = Number(booking.distance_km || booking.distance || 0);
                    const fareAmount = Number(booking.charge_amount || booking.fare || booking.amount || 0);

                    return (
                        <motion.div key={booking.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: index * 0.06 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4"
                        >
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-900">Ride #{booking.id}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md uppercase tracking-wider">
                                            {booking.vehicle_type || "Bike"}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(booking.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center pt-1">
                                        <div className="w-3 h-3 bg-green-500 rounded-full ring-4 ring-green-100" />
                                        <div className="w-0.5 h-10 bg-gradient-to-b from-green-300 to-red-300" />
                                        <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-100" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Pickup</p>
                                            <p className="text-sm font-medium text-gray-800 leading-snug">
                                                {booking.from_address || booking.pickup_location || booking.pickup_address}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Drop</p>
                                            <p className="text-sm font-medium text-gray-800 leading-snug">
                                                {booking.to_address || booking.drop_location || booking.drop_address}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                    <div className="flex items-center gap-1.5">
                                        <Navigation className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-semibold text-gray-700">{distanceKM.toFixed(1)} km</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-semibold text-gray-700">{calculateETA(distanceKM)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <IndianRupee className="w-4 h-4 text-green-600" />
                                        <span className="text-lg font-bold text-green-700">{fareAmount.toFixed(0)}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <p className="text-xs text-gray-500 font-medium">{booking.customer_name || booking.username} · {booking.customer_phone}</p>
                                </div>
                            </div>

                            <motion.button whileTap={{ scale: 0.97 }} disabled={busyId === booking.id} onClick={() => handleAcceptRide(booking)}
                                className="w-full py-4 bg-black text-white text-base font-bold hover:bg-gray-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                {busyId === booking.id ? "Accepting..." : "Accept Ride 🚖"}
                            </motion.button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {processedFilteredRides.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="w-10 h-10 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No Ride Requests</h3>
                    <p className="text-sm text-gray-400">New requests matching your verified constraints will appear here.</p>
                </motion.div>
            )}
        </div>
    );
}