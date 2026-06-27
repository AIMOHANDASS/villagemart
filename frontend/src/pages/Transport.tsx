import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bike,
  Navigation,
  ArrowRight,
  Truck,
  Loader2,
  LocateFixed,
  Route,
  IndianRupee,
  MapPinOff,
  Clock,
  Car,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL } from "@/api";
import { apiClient } from "@/api/apiClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmpx-api-loader': any;
      'gmpx-place-picker': any;
      'gmp-map': any;
      'gmp-advanced-marker': any;
    }
  }
}

/* ================= CONSTANTS ================= */
const AVG_SPEED_KMH = 40;
const DRAFT_KEY = "vm_pending_booking";
const KARUR_CENTER = { lat: 10.9601, lng: 78.0766 };

// 🎯 Vehicle Configuration Definition Fleet
const VEHICLE_TYPES = [
  { id: "scooter", label: "Scooter", icon: "🛵", baseRate: 10 },
  { id: "bike", label: "Bike", icon: "🏍️", baseRate: 12 },
  { id: "auto", label: "Auto", icon: "🛺", baseRate: 18 },
  { id: "car", label: "Car", icon: "🚗", baseRate: 25 },
];

export const VehicleSelectionLayout: React.FC<{
  onSelect: (type: string) => void;
  activeServices?: Record<string, boolean>;
}> = ({ onSelect, activeServices }) => {
  const [selectedType, setSelectedType] = useState("auto");

  const handleVehicleClick = (vehicleId: string) => {
    // 🎯 STRICT SYSTEM-WIDE VISIBILITY GATE: Block selections if Admin disabled the tier
    if (activeServices && activeServices[vehicleId] === false) {
      toast.error(
        `This service is currently unavailable. Please choose an available vehicle.`,
        { duration: 3000, icon: "🔴" }
      );
      return;
    }
    setSelectedType(vehicleId);
    onSelect(vehicleId);
  };

  return (
    <div className="w-full p-4 bg-white/60 dark:bg-stone-900/50 rounded-xl border border-stone-200/50 dark:border-stone-800 shadow-sm">
      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-3 pl-1">Select Vehicle Type</label>
      <div className="grid grid-cols-4 gap-2">
        {VEHICLE_TYPES.map((vehicle) => {
          const isLive = !activeServices || activeServices[vehicle.id] !== false;

          return (
            <button
              key={vehicle.id}
              type="button"
              className={`relative flex flex-col items-center justify-center py-3 px-1 rounded-xl border-2 transition-all ${
                !isLive
                  ? "opacity-40 bg-stone-100 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 cursor-not-allowed"
                  : selectedType === vehicle.id 
                    ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold" 
                    : "border-stone-200/50 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
              }`}
              onClick={() => handleVehicleClick(vehicle.id)}
            >
              {!isLive && (
                <span className="absolute -top-1.5 -right-1.5 text-[7px] bg-red-100 text-red-600 font-black uppercase px-1.5 py-0.5 rounded-full shadow-sm border border-red-200 z-10">
                  Offline
                </span>
              )}
              <span className="text-2xl mb-1 filter drop-shadow-sm">{vehicle.icon}</span>
              <span className="text-[10px] tracking-tight capitalize">{vehicle.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ================= UTILS ================= */
const toNum = (v: string) => Number(v);

const haversineKm = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
  const r = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((from.lat * Math.PI) / 180) * Math.cos((to.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const formatETA = (minutes: number): string => {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const isValidCoords = (latStr: string, lngStr: string) => {
  if (!latStr || !lngStr) return false;
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
};

type TransportProps = { user?: any };

const pageVariants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function Transport({ user }: TransportProps) {
  const navigate = useNavigate();

  const [mapHasError, setMapHasError] = useState(false);

  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(() => user?.phone || localStorage.getItem('cached_user_phone') || "");

  useEffect(() => {
    if (user && user.name) {
      setCustomerName(user.name);
    }
    if (user && user.phone) {
      setCustomerPhone(String(user.phone).trim());
    }
  }, [user]);

  const [fromAddress, setFromAddress] = useState("");
  const [fromLat, setFromLat] = useState("");
  const [fromLng, setFromLng] = useState("");

  const [toAddress, setToAddress] = useState("");
  const [toLat, setToLat] = useState("");
  const [toLng, setToLng] = useState("");

  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Road routing data
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  // Web Component Refs
  const fromPickerRef = useRef<HTMLElement>(null);
  const toPickerRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const directionsRendererRef = useRef<any>(null);

  const [isMapEngineReady, setIsMapEngineReady] = useState<boolean>(() => {
    // If the browser window has already registered gmp-map, initialize as ready immediately!
    if (typeof window !== 'undefined' && window.customElements && customElements.get('gmp-map')) {
      return true;
    }
    return false;
  });

  useEffect(() => {
    const scriptId = "google-maps-extended-components-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "module";
      script.src = "https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js";
      script.onerror = () => setMapHasError(true);
      document.head.appendChild(script);
    }

    if (!window.customElements) {
      setIsMapEngineReady(true);
      return;
    }

    // If it's already defined, skip fallback loops
    if (customElements.get('gmp-map')) {
      setIsMapEngineReady(true);
      return;
    }

    let active = true;
    customElements.whenDefined('gmp-map').then(() => {
      if (active) {
        console.log("🎯 Google Maps Web Components successfully registered and active!");
        setIsMapEngineReady(true);
      }
    });

    // Safe timeout fallback: Force the map to try to render after 1.5 seconds no matter what
    const fallbackTimer = setTimeout(() => {
      if (active) {
        console.warn("⏳ Map ready fallback triggered via timeout sequence");
        setIsMapEngineReady(true);
      }
    }, 1500);

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Bind Web Component Place Change Events
  useEffect(() => {
    const handleFromPlace = (e: any) => {
      const place = e.target.value;
      if (place?.location) {
        setFromLat(String(place.location.lat()));
        setFromLng(String(place.location.lng()));
        setFromAddress(place.formattedAddress || place.displayName || "");
        toast.success("📍 Pickup location added!");
      }
    };
    
    const handleToPlace = (e: any) => {
      const place = e.target.value;
      if (place?.location) {
        setToLat(String(place.location.lat()));
        setToLng(String(place.location.lng()));
        setToAddress(place.formattedAddress || place.displayName || "");
        toast.success("📍 Drop-off location added!");
      }
    };

    const fp = fromPickerRef.current as any;
    const tp = toPickerRef.current as any;

    if (fp && tp) {
      // Strict Tamil Nadu Bounding Box Constraints
      const tnBounds = { north: 14.0, south: 8.0, east: 80.5, west: 76.0 };
      fp.locationRestriction = tnBounds;
      tp.locationRestriction = tnBounds;
      fp.country = ['in'];
      tp.country = ['in'];

      fp.addEventListener('gmpx-placechange', handleFromPlace);
      tp.addEventListener('gmpx-placechange', handleToPlace);
    }

    return () => {
      fp?.removeEventListener('gmpx-placechange', handleFromPlace);
      tp?.removeEventListener('gmpx-placechange', handleToPlace);
    };
  }, [isMapEngineReady]);

  // Backend Pricing & Distance
  const [calcDistanceKm, setCalcDistanceKm] = useState<number>(0);
  const [vehicleType, setVehicleType] = useState<string>("auto");

  // 🛡️ System-wide vehicle availability (fetched from Admin settings)
  const [activeServices, setActiveServices] = useState<Record<string, boolean>>({ scooter: true, bike: true, auto: true, car: true });

  useEffect(() => {
    const fetchServiceAvailability = async () => {
      try {
        const res: any = await apiClient.get("/settings/global-vehicles");
        if (res?.success && res.services) {
          setActiveServices(res.services);
        }
      } catch {
        console.warn("⚠️ Could not fetch vehicle service availability");
      }
    };
    fetchServiceAvailability();
  }, []);

  // Nearby Drivers
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);

  const fromOk = isValidCoords(fromLat, fromLng);
  const toOk = isValidCoords(toLat, toLng);
  const bothReady = fromOk && toOk;

  // Straight line fallback distance
  const straightDistanceKm = useMemo(() => {
    if (!bothReady) return 0;
    return Number(haversineKm({ lat: toNum(fromLat), lng: toNum(fromLng) }, { lat: toNum(toLat), lng: toNum(toLng) }).toFixed(2));
  }, [fromLat, fromLng, toLat, toLng, bothReady]);

  // Google Maps DirectionsService Route Calculation
  useEffect(() => {
    if (isMapEngineReady && bothReady) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: toNum(fromLat), lng: toNum(fromLng) },
          destination: { lat: toNum(toLat), lng: toNum(toLng) },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirectionsResponse(result);
            const leg = result.routes[0].legs[0];
            if (leg && leg.distance) {
              const km = leg.distance.value / 1000;
              setRoadDistanceKm(km);
              setCalcDistanceKm(km);
            }
          } else {
            setDirectionsResponse(null);
          }
        }
      );
    } else {
      setDirectionsResponse(null);
      setRoadDistanceKm(null);
      setCalcDistanceKm(0);
    }
  }, [isMapEngineReady, fromLat, fromLng, toLat, toLng, bothReady]);

  // Distance & fare calculations
  const distanceKm = bothReady ? (calcDistanceKm > 0 ? calcDistanceKm : (roadDistanceKm ?? straightDistanceKm)) : 0;
  
  const getChargeAmount = () => {
    if (!bothReady) return 0;
    if (vehicleType === "scooter") return Number((10 + distanceKm * 8).toFixed(2));
    if (vehicleType === "bike") return Number((12 + distanceKm * 10).toFixed(2));
    if (vehicleType === "car") return Number((40 + distanceKm * 18).toFixed(2));
    return Number((25 + distanceKm * 12).toFixed(2)); // auto is default
  };
  const chargeAmount = getChargeAmount();
    
  const etaMinutes = distanceKm > 0 ? (distanceKm / AVG_SPEED_KMH) * 60 : 0;

  // Fetch Nearby Drivers
  useEffect(() => {
    if (fromOk) {
      const fetchNearby = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/location/nearby?lat=${fromLat}&lng=${fromLng}&type=TRANSPORT`);
          const json = await res.json();
          if (json.success) setNearbyDrivers(json.data || []);
        } catch (e) {
          console.error("Nearby drivers fetch failed", e);
        }
      };
      fetchNearby();
      const timer = setInterval(fetchNearby, 30000);
      return () => clearInterval(timer);
    } else {
      setNearbyDrivers([]);
    }
  }, [fromLat, fromLng, fromOk]);

  /* ================= DIRECTIONS RENDERER ================= */
  useEffect(() => {
    if (isMapEngineReady && mapRef.current && directionsResponse) {
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: "#10b981", strokeWeight: 5, strokeOpacity: 0.85 }
        });
      }
      directionsRendererRef.current.setMap((mapRef.current as any).innerMap);
      directionsRendererRef.current.setDirections(directionsResponse);
    } else if (directionsRendererRef.current) {
       directionsRendererRef.current.setMap(null);
    }
  }, [isMapEngineReady, directionsResponse]);

  /* ================= DRAGGABLE PIN ADJUSTMENTS ================= */
  const handleFromDragEnd = useCallback(async (lat: number, lng: number) => {
    setFromLat(String(lat));
    setFromLng(String(lng));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { "User-Agent": "VillageMart/1.0" } });
      const data = await res.json();
      if (data?.display_name) {
        const short = data.address?.village || data.address?.town || data.address?.city || data.display_name.split(",")[0];
        setFromAddress(short);
      }
    } catch { /* retain existing */ }
    toast("📍 Pickup location updated", { icon: "✅" });
  }, []);

  const handleToDragEnd = useCallback(async (lat: number, lng: number) => {
    setToLat(String(lat));
    setToLng(String(lng));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { headers: { "User-Agent": "VillageMart/1.0" } });
      const data = await res.json();
      if (data?.display_name) {
        const short = data.address?.village || data.address?.town || data.address?.city || data.display_name.split(",")[0];
        setToAddress(short);
      }
    } catch { /* retain existing */ }
    toast("📍 Drop-off location updated", { icon: "✅" });
  }, []);

  /* ================= GPS ================= */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        
        setFromLat(String(currentLat)); 
        setFromLng(String(currentLng));

        try {
          // 🚀 REFACTOR: Reverse geocode raw numbers into true text strings to resolve the blank field bug
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${currentLat},${currentLng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();

          if (data.status === "OK" && data.results[0]) {
            const formattedAddress = data.results[0].formatted_address;
            
            // 🎯 Update state automatically to populate the pickup address text bar layout
            setFromAddress(formattedAddress);
            if (fromPickerRef.current) {
              const picker = fromPickerRef.current as any;
              const input = picker.shadowRoot?.querySelector('input');
              if (input) input.value = formattedAddress;
            }
            toast.success("📍 Current location locked!");
          } else {
            console.warn("Geocoding API failed to resolve standard text address.");
            const fallbackStr = `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`;
            setFromAddress(fallbackStr);
            if (fromPickerRef.current) {
              const picker = fromPickerRef.current as any;
              const input = picker.shadowRoot?.querySelector('input');
              if (input) input.value = fallbackStr;
            }
          }
        } catch (err) {
          console.error("❌ Geocoding lookup request failed:", err);
          const fallbackStr = `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`;
          setFromAddress(fallbackStr);
          if (fromPickerRef.current) {
            const picker = fromPickerRef.current as any;
            const input = picker.shadowRoot?.querySelector('input');
            if (input) input.value = fallbackStr;
          }
        } finally { 
          setLocating(false); 
        }
      },
      (error) => { 
        console.error("GPS location permission denied:", error);
        setLocating(false); 
        toast.error("Failed to fetch your live location coordinates."); 
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ================= CHECKOUT ================= */
  const proceedToCheckout = () => {
    if (!user?.id || !customerName || !customerPhone) { toast.error("Fill name & phone"); return; }
    if (!fromOk) { toast.error("Select a pickup location"); return; }
    if (!toOk) { toast.error("Select a drop-off location"); return; }

    // 🛡️ Final booking guard: prevent checkout with a disabled vehicle type
    if (activeServices[vehicleType] === false) {
      toast.error("This service is currently unavailable. Please choose an available vehicle.", { icon: "🔴" });
      return;
    }

    const draft = {
      type: "transport",
      payload: {
        userId: user.id, customerName, customerPhone, fromAddress,
        fromLat: toNum(fromLat), fromLng: toNum(fromLng), toAddress,
        toLat: toNum(toLat), toLng: toNum(toLng), notes, distanceKm, chargeAmount,
        vehicleType,
      },
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    
    // Show celebratory overlay before navigating
    setShowSuccessOverlay(true);
    setTimeout(() => {
      navigate("/checkout", { state: { checkoutMode: "transport", bookingDraft: draft } });
    }, 600);
  };

  const fromPos: [number, number] | null = fromOk ? [toNum(fromLat), toNum(fromLng)] : null;
  const toPos: [number, number] | null = toOk ? [toNum(toLat), toNum(toLng)] : null;

  return (
    <>
      {/* SUCCESS OVERLAY */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white/50 shadow-2xl flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 mb-1">Ride Secured!</h2>
              <p className="text-stone-500 font-medium">Navigating to checkout...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <gmpx-api-loader
        ref={(el: HTMLElement | null) => {
          if (el && !el.getAttribute('key')) {
            el.setAttribute('key', 'AIzaSyA4fn80rgW3sPP4OwrImLTTuqqCoappPFE');
          }
        }}
        solution-channel="GMP_GE_mapsandplacesautocomplete_v2"
      ></gmpx-api-loader>

      <motion.div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-100 to-emerald-50/30 dark:from-stone-950 dark:via-neutral-950 dark:to-emerald-950/20 font-sans"
        variants={pageVariants} initial="initial" animate="animate" transition={{ duration: 0.4 }}>
      
        <Header user={user} />

        <div className="container mx-auto px-4 py-6 md:py-8 h-[calc(100vh-80px)]">
          {!isMapEngineReady ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/40 dark:border-white/10">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-stone-500 font-bold tracking-wide">Initializing Map Engine...</p>
            </div>
          ) : (
          <>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full pb-20 lg:pb-0">
          {/* ================= LEFT PANEL: BOOKING CONFIGURATION ================= */}
          <div className="lg:col-span-4 flex flex-col h-full space-y-6">
            <div className="flex-1 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl rounded-[2rem] border border-white/40 dark:border-white/10 p-6 md:p-8 flex flex-col">
              
              <div className="mb-6">
                <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2 tracking-tight">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <Route className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Book a Ride
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-sm mt-2 font-medium">Real distance mapping across Tamil Nadu.</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                
                {/* User Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider pl-1">Name</Label>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-12 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm border-stone-200/50 dark:border-stone-700/50 rounded-xl shadow-sm focus-visible:ring-emerald-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider pl-1">Phone</Label>
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-12 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm border-stone-200/50 dark:border-stone-700/50 rounded-xl shadow-sm focus-visible:ring-emerald-500" />
                  </div>
                </div>

                {/* GPS current location */}
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  type="button" 
                  onClick={useCurrentLocation} 
                  disabled={locating}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors font-bold shadow-sm disabled:opacity-50"
                >
                  {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
                  {locating ? "Locating..." : "Use Current Location"}
                </motion.button>

                {/* Pickers */}
                <div className="space-y-5 relative z-50">
                  {/* Visual Route Connector */}
                  <div className="absolute left-3.5 top-10 bottom-10 w-0.5 bg-gradient-to-b from-emerald-400 via-stone-300 to-rose-400 rounded-full z-0 opacity-50"></div>

                  <div className="relative z-10 pl-10 space-y-1.5 group">
                    <div className="absolute left-0 top-3 w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm border border-emerald-50 group-focus-within:ring-4 ring-emerald-500/20 transition-all">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-inner"></div>
                    </div>
                    <Label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Pickup</Label>
                    <motion.div whileTap={{ scale: 0.99 }} className="h-12 w-full rounded-xl overflow-hidden shadow-sm border border-stone-200/50 dark:border-stone-700/50 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all">
                      <gmpx-place-picker
                        ref={fromPickerRef}
                        placeholder="Type pickup address (e.g. Karur)..."
                        class="w-full h-full"
                        style={{ '--gmpx-color-surface': 'transparent' } as any}
                      ></gmpx-place-picker>
                    </motion.div>
                  </div>

                  <div className="relative z-10 pl-10 space-y-1.5 group">
                    <div className="absolute left-0 top-3 w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center shadow-sm border border-rose-50 group-focus-within:ring-4 ring-rose-500/20 transition-all">
                      <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-inner"></div>
                    </div>
                    <Label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Drop-off</Label>
                    <motion.div whileTap={{ scale: 0.99 }} className="h-12 w-full rounded-xl overflow-hidden shadow-sm border border-stone-200/50 dark:border-stone-700/50 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-rose-500/50 focus-within:border-rose-500 transition-all">
                      <gmpx-place-picker
                        ref={toPickerRef}
                        placeholder="Type destination address (e.g. Kulithalai)..."
                        class="w-full h-full"
                        style={{ '--gmpx-color-surface': 'transparent' } as any}
                      ></gmpx-place-picker>
                    </motion.div>
                  </div>
                </div>

                {/* Dynamic Quote & Vehicle Picker */}
                <AnimatePresence>
                  {bothReady && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-5 pt-4 border-t border-stone-200/50 dark:border-stone-700/50">
                      
                      <div className="flex justify-between items-center bg-white/50 dark:bg-stone-900/50 rounded-2xl p-4 border border-stone-100 dark:border-stone-800 shadow-sm">
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Distance</p>
                          <p className="font-black text-xl text-stone-900 dark:text-stone-100">{distanceKm.toFixed(1)} km</p>
                        </div>
                        <div className="w-px h-10 bg-stone-200 dark:bg-stone-800"></div>
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Est. Time</p>
                          <p className="font-black text-xl text-emerald-600 dark:text-emerald-400">{formatETA(etaMinutes)}</p>
                        </div>
                      </div>

                      <VehicleSelectionLayout onSelect={(type) => setVehicleType(type)} activeServices={activeServices} />

                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>

            {/* Desktop Checkout Button pinned to bottom of left column */}
            <div className="hidden lg:block">
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={proceedToCheckout}
                disabled={!bothReady}
                className="w-full h-16 flex items-center justify-center text-lg rounded-2xl font-bold shadow-xl shadow-stone-900/20 bg-gradient-to-r from-stone-800 to-stone-900 text-white disabled:opacity-50 disabled:shadow-none transition-all">
                {bothReady ? `Confirm ${vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)} — ₹${chargeAmount.toFixed(0)}` : "Enter locations to proceed"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
            </div>
          </div>

          {/* ================= RIGHT PANEL: INTERACTIVE MAP ================= */}
          <div className="lg:col-span-8 h-[300px] lg:h-full relative rounded-[2rem] overflow-hidden shadow-xl border border-white/60 dark:border-white/10 bg-stone-100 dark:bg-stone-900">
              {mapHasError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 p-8 text-center rounded-[2rem]">
                  <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
                    <MapPinOff className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-black text-stone-800 mb-2 tracking-tight">Map Preview Unavailable</h3>
                  <p className="text-stone-500 font-medium text-sm max-w-sm">
                    Our high-definition route map is temporarily offline. You can still use the location search to instantly book your transport.
                  </p>
                </div>
              ) : (
                <gmp-map
                  ref={mapRef}
                  center={fromPos ? `${fromPos[0]},${fromPos[1]}` : (toPos ? `${toPos[0]},${toPos[1]}` : `10.9384,78.4186`)}
                  zoom={bothReady ? "12" : "12"}
                  map-id="DEMO_MAP_ID"
                  class="rounded-2xl w-full h-full outline-none"
                >
                  {/* Draggable Pickup Marker */}
                  {fromPos && (
                    <gmp-advanced-marker
                      position={`${fromPos[0]},${fromPos[1]}`}
                      gmp-draggable="true"
                      onDragEnd={(e: any) => {
                        const el = e.target;
                        if (el && el.position) {
                          const lat = typeof el.position.lat === 'function' ? el.position.lat() : el.position.lat;
                          const lng = typeof el.position.lng === 'function' ? el.position.lng() : el.position.lng;
                          handleFromDragEnd(lat, lng);
                        }
                      }}
                    >
                      <div className="w-10 h-10 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <Navigation className="w-5 h-5 text-white rotate-45" />
                      </div>
                    </gmp-advanced-marker>
                  )}

                  {/* Draggable Drop Marker */}
                  {toPos && (
                    <gmp-advanced-marker
                      position={`${toPos[0]},${toPos[1]}`}
                      gmp-draggable="true"
                      onDragEnd={(e: any) => {
                        const el = e.target;
                        if (el && el.position) {
                          const lat = typeof el.position.lat === 'function' ? el.position.lat() : el.position.lat;
                          const lng = typeof el.position.lng === 'function' ? el.position.lng() : el.position.lng;
                          handleToDragEnd(lat, lng);
                        }
                      }}
                    >
                      <div className="w-10 h-10 bg-rose-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                        <MapPinOff className="w-5 h-5 text-white" />
                      </div>
                    </gmp-advanced-marker>
                  )}

                  {/* Nearby Drivers pins */}
                  {nearbyDrivers.map((driver, idx) => (
                    <gmp-advanced-marker
                      key={`driver-${driver.id}-${idx}`}
                      position={`${driver.latitude},${driver.longitude}`}
                    >
                      <div className="text-2xl drop-shadow-lg filter hover:scale-110 transition-transform">🚕</div>
                    </gmp-advanced-marker>
                  ))}
                </gmp-map>
              )}

            {/* Map UI Overlay (Stats) */}
            <AnimatePresence>
              {bothReady && (
                <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute top-6 left-6 right-6 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl shadow-xl rounded-2xl p-4 border border-white/50 dark:border-white/10 flex justify-between items-center z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shadow-inner">
                      <Route className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-0.5">Optimal Route</p>
                      <p className="font-black text-stone-900 dark:text-stone-100">{distanceKm.toFixed(1)} km mapped</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-0.5">Arrival</p>
                    <p className="font-black text-emerald-600 dark:text-emerald-400">{formatETA(etaMinutes)}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Sticky Checkout */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-t border-stone-200/50 dark:border-stone-700/50 lg:hidden z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
          <motion.button 
            whileTap={{ scale: 0.96 }}
            onClick={proceedToCheckout}
            disabled={!bothReady}
            className="w-full h-14 flex items-center justify-center text-lg rounded-2xl font-bold shadow-lg shadow-stone-900/20 bg-gradient-to-r from-stone-800 to-stone-900 text-white disabled:opacity-50 transition-all">
            {bothReady ? `Confirm ${vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)} — ₹${chargeAmount.toFixed(0)}` : "Select Locations"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </motion.button>
        </div>
        </>
        )}
        </div>
      </motion.div>
    </>
  );
}
