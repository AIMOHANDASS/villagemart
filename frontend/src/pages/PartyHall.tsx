import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Music, Users, PartyPopper, ArrowRight, Wind, Car, Users as UsersIcon, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type PartyHallProps = {
  user?: any;
};

const BASE_CHARGE = 700;
const SUPPORT_NUMBER = "91+ 8903003808";
const DRAFT_KEY = "vm_pending_booking";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const PartyHall: React.FC<PartyHallProps> = ({ user }) => {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [personCount, setPersonCount] = useState("50");
  const [snacksCount, setSnacksCount] = useState("50");
  const [waterCount, setWaterCount] = useState("50");
  const [cakeCount, setCakeCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [addOns, setAddOns] = useState<string[]>(["water", "snacks"]);
  const [availability, setAvailability] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!eventDate) {
        setAvailability([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/party-hall/availability?date=${eventDate}`);
        const data = await res.json();
        setAvailability(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch availability", err);
        setAvailability([]);
      }
    };
    load();
  }, [eventDate]);

  const addOnCharge = useMemo(() => {
    const persons = Math.max(0, Number(personCount || 0));
    const snacks = Math.max(0, Number(snacksCount || 0));
    const water = Math.max(0, Number(waterCount || 0));
    const cake = Math.max(0, Number(cakeCount || 0));
    let total = 0;

    if (addOns.includes("snacks")) total += snacks * 30;
    if (addOns.includes("water")) total += water * 5;
    if (addOns.includes("cake")) total += cake * 450;
    if (addOns.includes("decoration")) total += 350;
    if (addOns.includes("tea")) total += persons * 15;

    return Number(total.toFixed(2));
  }, [addOns, cakeCount, personCount, snacksCount, waterCount]);

  const totalCharge = Number((BASE_CHARGE + addOnCharge).toFixed(2));

  const toggleAddOn = (value: string) => {
    setAddOns((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  };

  const proceedToCheckout = () => {
    if (!user?.id || !customerName || !customerPhone || !eventDate || !startTime) {
      toast.error("Please fill all required details");
      return;
    }

    if (Number(personCount) <= 0) {
      toast.error("Person count should be greater than 0");
      return;
    }

    const draft = {
      type: "partyHall",
      payload: {
        userId: user.id,
        customerName,
        customerPhone,
        eventDate,
        startTime,
        personCount: Number(personCount),
        snacksCount: Number(snacksCount || 0),
        waterCount: Number(waterCount || 0),
        cakeCount: Number(cakeCount || 0),
        addOns,
        notes,
        baseCharge: BASE_CHARGE,
        addOnCharge,
        totalCharge,
      },
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    navigate("/checkout", {
      state: { checkoutMode: "partyHall", bookingDraft: draft },
    });
  };

  const addOnConfig = [
    { key: "water", label: "💧 Water", price: "₹5/pc" },
    { key: "snacks", label: "🍿 Snacks", price: "₹30/pc" },
    { key: "cake", label: "🎂 Cake", price: "₹450/pc" },
    { key: "decoration", label: "🎊 Decoration", price: "₹350" },
    { key: "tea", label: "☕ Tea", price: "₹15/person" },
  ];

  return (
    <motion.div
      className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-32"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >
      <Header user={user} />

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-8 max-w-4xl">
        
        {/* Immersive Media Carousel Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full h-64 md:h-80 rounded-[2rem] overflow-hidden shadow-2xl shadow-purple-900/20 group"
        >
          {/* Simulated Parallax Background Image Layer */}
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" 
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200")' }}>
          </div>
          {/* Dark Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/40 to-transparent"></div>
          
          <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/30 backdrop-blur-md mb-3 hover:bg-purple-500/30">Premium Venue</Badge>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">The Grand Crystal Hall</h1>
              <p className="text-stone-300 font-medium text-sm md:text-base max-w-lg mb-6">Experience luxury and elegance for your next grand celebration. Fully equipped for weddings, birthdays, and corporate events.</p>
              
              {/* Amenity Badges */}
              <div className="flex flex-wrap gap-2 md:gap-3">
                {[
                  { icon: <Wind className="w-4 h-4" />, label: "Central AC" },
                  { icon: <Car className="w-4 h-4" />, label: "Valet Parking" },
                  { icon: <UsersIcon className="w-4 h-4" />, label: "500+ Capacity" },
                ].map((amenity, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 text-white text-xs font-bold shadow-sm">
                    {amenity.icon}
                    {amenity.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            {/* Polished Calendar & Schedule Selector */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800 rounded-[2rem] p-6 md:p-8 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100">Schedule</h2>
                  <p className="text-stone-500 text-sm font-medium">Select your date and 3-hour time slot</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <motion.div whileTap={{ scale: 0.98 }} className="space-y-2 group focus-within:ring-2 ring-purple-500/50 rounded-2xl transition-all">
                  <Label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1">Event Date</Label>
                  <div className="relative">
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} 
                      className="h-14 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm text-lg font-medium px-4 appearance-none custom-date-input" />
                  </div>
                </motion.div>
                
                <motion.div whileTap={{ scale: 0.98 }} className="space-y-2 group focus-within:ring-2 ring-purple-500/50 rounded-2xl transition-all">
                  <Label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1">Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} 
                    className="h-14 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm text-lg font-medium px-4" />
                </motion.div>
              </div>

              <AnimatePresence>
                {availability.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden">
                    <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 rounded-2xl p-4">
                      <p className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" /> Unavailable Slots on this Date:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availability.map((slot: any) => (
                          <div key={slot.id} className="bg-white/80 dark:bg-rose-950/50 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-sm">
                            {String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* Guest Details & Catering */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800 rounded-[2rem] p-6 md:p-8 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-2xl">
                  <PartyPopper className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100">Event Details</h2>
                  <p className="text-stone-500 text-sm font-medium">Guest count and catering setup</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5 mb-6">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1">Host Name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-12 bg-white/50 dark:bg-stone-950/50 rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1">Contact Phone</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-12 bg-white/50 dark:bg-stone-950/50 rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Guests", val: personCount, set: setPersonCount },
                  { label: "Snacks", val: snacksCount, set: setSnacksCount },
                  { label: "Water", val: waterCount, set: setWaterCount },
                  { label: "Cake", val: cakeCount, set: setCakeCount },
                ].map((f, i) => (
                  <div key={i} className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1">{f.label}</Label>
                    <Input type="number" value={f.val} onChange={(e) => f.set(e.target.value)} className="h-12 bg-white/50 dark:bg-stone-950/50 rounded-xl font-bold text-lg text-center" />
                  </div>
                ))}
              </div>

              {/* Modern Add-ons Grid */}
              <div>
                <Label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider pl-1 block mb-3">Premium Add-ons</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {addOnConfig.map(({ key, label, price }) => {
                    const isSelected = addOns.includes(key);
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleAddOn(key)}
                        className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left ${
                          isSelected
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md shadow-purple-500/10"
                            : "border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-950/50 hover:bg-stone-50 dark:hover:bg-stone-900"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 className="w-5 h-5 text-purple-500" />
                          </div>
                        )}
                        <span className={`text-sm font-bold mb-1 ${isSelected ? "text-purple-900 dark:text-purple-100" : "text-stone-700 dark:text-stone-300"}`}>{label}</span>
                        <span className={`text-xs font-semibold ${isSelected ? "text-purple-600 dark:text-purple-400" : "text-stone-500"}`}>{price}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          </div>

          {/* Right Sidebar - Support Info */}
          <div className="lg:col-span-4">
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
              className="sticky top-24 bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-[2rem] p-6 md:p-8 shadow-2xl"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Music className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="text-xl font-black mb-2">Need Assistance?</h3>
              <p className="text-stone-400 text-sm mb-6 leading-relaxed">Our event coordinators are available 24/7 to help you plan the perfect setup for your celebration.</p>
              
              <div className="bg-black/20 rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold mb-0.5">Direct Line</p>
                  <p className="font-bold">{SUPPORT_NUMBER}</p>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Sticky Glassmorphic Checkout Bar */}
      <motion.div 
        initial={{ y: 150 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.8 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl border-t border-stone-200/50 dark:border-stone-800/50 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]"
      >
        <div className="container mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-6 px-2">
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Base Hall</p>
              <p className="font-bold text-stone-900 dark:text-stone-100">₹{BASE_CHARGE.toFixed(2)}</p>
            </div>
            <div className="w-px h-8 bg-stone-300 dark:bg-stone-700"></div>
            <div>
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Add-ons</p>
              <motion.p key={addOnCharge} initial={{ scale: 1.2, color: "#9333ea" }} animate={{ scale: 1, color: "inherit" }} className="font-bold text-stone-900 dark:text-stone-100">₹{addOnCharge.toFixed(2)}</motion.p>
            </div>
            <div className="w-px h-8 bg-stone-300 dark:bg-stone-700 hidden sm:block"></div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Total</p>
              <motion.p key={totalCharge} initial={{ scale: 1.2, color: "#9333ea" }} animate={{ scale: 1, color: "inherit" }} className="font-black text-2xl text-purple-600 dark:text-purple-400">₹{totalCharge.toFixed(2)}</motion.p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
            <div className="sm:hidden">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-0.5">Total Pay</p>
              <motion.p key={totalCharge} initial={{ scale: 1.2, color: "#9333ea" }} animate={{ scale: 1, color: "inherit" }} className="font-black text-xl text-purple-600 dark:text-purple-400">₹{totalCharge.toFixed(2)}</motion.p>
            </div>
            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={proceedToCheckout}
              className="h-14 px-8 rounded-2xl font-bold shadow-lg shadow-purple-500/20 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white transition-all flex items-center justify-center sm:min-w-[200px]"
            >
              Reserve Slot
              <ArrowRight className="ml-2 h-5 w-5" />
            </motion.button>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

export default PartyHall;
