import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ShoppingCart,
  Menu,
  Search,
  Bell,
  Package,
  X,
  Clock,
  Flame,
  Building2,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../api/apiClient";
import truckImage from "@/assets/truck.png";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import NavbarLocationRibbon from "./NavbarLocationRibbon";

type Props = { user?: any };

// API_BASE_URL imported from centralized apiClient module
const POPULAR_SEARCHES = ["Onion", "Tomato", "Rice", "Oil", "Garland", "Milk"];

const serviceItems = [
  {
    key: "villagemart",
    label: "VillageMart",
    path: "/",
    icon: <img src="/favicon.png" alt="VillageMart" className="h-6 w-6 rounded" />,
  },
  {
    key: "transport",
    label: "Transport",
    path: "/transport",
    icon: <img src={truckImage} alt="Transport" className="h-6 w-6 rounded" />,
  },
  {
    key: "partyhall",
    label: "Party Hall",
    path: "/party-hall",
    icon: <Building2 className="h-5 w-5 text-violet-700" />,
  },
];

const Header: React.FC<Props> = ({ user }) => {
  const [cartCount, setCartCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifyCount, setNotifyCount] = useState(0);

  const [searchText, setSearchText] = useState("");
  const [allProductNames, setAllProductNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  /* ================= VOICE SEARCH ================= */
  const handleVoiceResult = useCallback((text: string) => {
    setSearchText(text);
    // Auto-trigger search after voice input
    setTimeout(() => {
      if (!text.trim()) return;
      const updated = [text, ...recent.filter((r) => r !== text)].slice(0, 5);
      setRecent(updated);
      localStorage.setItem("recent-searches", JSON.stringify(updated));
      navigate(`/products?search=${encodeURIComponent(text)}`);
    }, 400);
  }, [navigate, recent]);

  const voice = useVoiceSearch(handleVoiceResult);

  const toggleVoice = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  };

  /* ================= CART COUNT ================= */
  const updateCartCount = () => {
    const raw = localStorage.getItem("cart");
    const cart = raw ? JSON.parse(raw) : [];
    setCartCount(cart.length);
  };

  useEffect(() => {
    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    return () => window.removeEventListener("storage", updateCartCount);
  }, []);

  /* ================= LOAD PRODUCT NAMES ================= */
  useEffect(() => {
    fetch("/datadetails1.csv")
      .then((res) => res.text())
      .then((csvText) => {
        const rows = csvText.split("\n").slice(1);
        const names = rows
          .map((row) => row.split(",")[1]?.replace(/"/g, ""))
          .filter(Boolean);
        setAllProductNames(names);
      })
      .catch(() => { });
  }, []);

  /* ================= LOAD RECENT ================= */
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("recent-searches") || "[]");
    setRecent(saved);
  }, []);

  /* ================= FETCH NOTIFICATION COUNT ================= */
  useEffect(() => {
    const activeSessionId = user?.id || user?.user_id || user?.data?.id;
    const currentToken = localStorage.getItem("jwt_token") || localStorage.getItem("token");

    if (!activeSessionId || !currentToken || String(activeSessionId) === 'undefined') {
      setNotifyCount(0);
      return;
    }

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${currentToken}`,
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/${activeSessionId}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch notification count");

        const text = await res.text();
        if (text.includes('<!DOCTYPE') || text.trim().startsWith('<')) {
          console.warn("Intercepted HTML response from notification endpoint, safely defaulting to empty array.");
          setNotifyCount(0);
          return;
        }

        const response = JSON.parse(text);
        // Guard clause to ensure object payloads or 401 data cannot crash React
        const safeArray = Array.isArray(response)
          ? response
          : (response && typeof response === 'object' && Array.isArray((response as any).notifications))
            ? (response as any).notifications
            : [];

        const unread = safeArray.filter((item: any) => {
          if (!item || typeof item !== 'object') return false;
          const isReadVal = item.isRead !== undefined ? item.isRead : item.is_read;
          return !isReadVal;
        });
        setNotifyCount(unread.length);
      } catch (error) {
        console.warn("Gracefully bypassed background tracking authentication fault:", error);
        setNotifyCount(0); // Safe fallback baseline
      }
    };

    fetchNotifications();
  }, [user]);

  /* ================= LIVE SUGGESTIONS ================= */
  useEffect(() => {
    if (!searchText.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allProductNames
      .filter((name) =>
        name.toLowerCase().includes(searchText.toLowerCase())
      )
      .slice(0, 6);

    setSuggestions(filtered);
    setShowSuggestions(true);
    setActiveIndex(-1);
  }, [searchText, allProductNames]);

  useEffect(() => {
    setShowSuggestions(false);
  }, [location.pathname, location.search]);

  /* ================= SEARCH ================= */
  const doSearch = (value: string) => {
    if (!value.trim()) return;

    setSearchText(value);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveIndex(-1);

    const updated = [value, ...recent.filter((r) => r !== value)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem("recent-searches", JSON.stringify(updated));

    navigate(`/products?search=${encodeURIComponent(value)}`);
    inputRef.current?.blur();
    setIsMenuOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch(activeIndex >= 0 ? suggestions[activeIndex] : searchText);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const highlight = (text: string) => {
    const idx = text.toLowerCase().indexOf(searchText.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-emerald-600 font-bold">
          {text.slice(idx, idx + searchText.length)}
        </span>
        {text.slice(idx + searchText.length)}
      </>
    );
  };

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    localStorage.removeItem("cart");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("storage"));
    navigate("/");
    window.location.reload();
  };

  /* ================= OPEN NOTIFICATIONS ================= */
  const openNotifications = () => {
    navigate("/notifications");
    setNotifyCount(0);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/40 dark:border-stone-800/40 shadow-sm transition-all duration-300">

      {/* 📍 MULTI-ADDRESS RIBBON INJECTION */}
      {user && <NavbarLocationRibbon />}

      {/* 💻 DESKTOP HEADER */}
      <div className="hidden md:flex items-center space-x-6 container mx-auto px-4 py-3">

        <Link to="/" className="flex items-center space-x-2 group">
          <motion.img
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.4 }}
            src="/logo-consumer.png"
            alt="VillageMart"
            className="h-12 w-auto object-contain"
          />
          <span className="text-xl font-bold text-emerald-600 group-hover:text-emerald-500 transition-colors">VillageMart</span>
        </Link>

        {/* SEARCH */}
        <div className="flex-1 max-w-sm mx-4 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
          <Input
            ref={inputRef}
            value={voice.isListening ? (voice.interimText || "Listening...") : searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={onKeyDown}
            type="search"
            placeholder={voice.isListening ? (voice.lang === "ta-IN" ? "பேசுங்கள்..." : "Speak now...") : "Search groceries, fruits, vegetables..."}
            className={`pl-9 pr-20 bg-stone-50/50 dark:bg-stone-900/50 rounded-xl border-stone-200/50 dark:border-stone-800 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm ${voice.isListening ? "border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/40" : ""}`}
            readOnly={voice.isListening}
          />

          {/* Voice Search Controls (Desktop) */}
          {voice.isSupported && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Language Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={voice.toggleLang}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                title={`Switch to ${voice.lang === "en-IN" ? "Tamil" : "English"}`}
              >
                {voice.lang === "en-IN" ? "EN" : "தமி"}
              </motion.button>

              {/* Mic Button */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={toggleVoice}
                className={`relative w-7 h-7 flex items-center justify-center rounded-full transition-all shadow-sm ${voice.isListening
                    ? "bg-rose-500 text-white shadow-rose-500/40"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  }`}
                title={voice.isListening ? "Stop" : "Voice Search"}
              >
                {voice.isListening ? (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-rose-500/30"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <MicOff className="h-3.5 w-3.5 relative z-10" />
                  </>
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </motion.button>
            </div>
          )}

          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800 rounded-xl shadow-xl z-50 p-2 mt-1"
              >
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onMouseDown={() => doSearch(s)}
                    className={`px-3 py-2.5 cursor-pointer text-sm flex items-center justify-between rounded-lg transition-all ${i === 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-stone-50 dark:hover:bg-stone-800"
                      }`}
                  >
                    <span>{highlight(s)}</span>
                    {i === 0 && (
                      <Badge className="bg-emerald-600 text-white text-[10px] uppercase tracking-wider">Top</Badge>
                    )}
                  </div>
                ))}

                {recent.length > 0 && (
                  <div className="mt-2 border-t border-stone-100 dark:border-stone-800 pt-2 text-xs text-stone-500">
                    <div className="font-bold mb-1 flex items-center gap-1 px-2 uppercase tracking-wider text-[10px]">
                      <Clock className="h-3 w-3" /> Recent
                    </div>
                    {recent.map((r) => (
                      <div
                        key={r}
                        onMouseDown={() => doSearch(r)}
                        className="px-3 py-1.5 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors font-medium"
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 border-t border-stone-100 dark:border-stone-800 pt-2 text-xs text-stone-500">
                  <div className="font-bold mb-1 flex items-center gap-1 px-2 uppercase tracking-wider text-[10px]">
                    <Flame className="h-3 w-3" /> Popular
                  </div>
                  {POPULAR_SEARCHES.map((p) => (
                    <div
                      key={p}
                      onMouseDown={() => doSearch(p)}
                      className="px-3 py-1.5 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors font-medium"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* NAV */}
        <nav className="flex items-center space-x-1 relative">
          {serviceItems.map((service) => {
            const active =
              service.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(service.path);

            return (
              <motion.button
                key={service.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(service.path)}
                className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors z-10"
              >
                {active && (
                  <motion.div
                    layoutId="activeHeaderLink"
                    className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {service.icon}
                  <span className={active ? "text-emerald-700 dark:text-emerald-400" : "text-stone-600 dark:text-stone-300"}>{service.label}</span>
                </span>
              </motion.button>
            );
          })}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/products")}
            className="relative px-3 py-2 text-sm font-bold text-stone-600 dark:text-stone-300 transition-colors z-10"
          >
            {location.pathname.startsWith("/products") && (
              <motion.div
                layoutId="activeHeaderLink"
                className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">All Products</span>
          </motion.button>
        </nav>

        {/* ACTIONS */}
        <div className="flex items-center space-x-2">

          {user && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" className="relative rounded-xl text-stone-600 hover:text-emerald-600 hover:bg-emerald-50" onClick={openNotifications}>
                <Bell className="h-5 w-5" />
                {notifyCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    <Badge className="absolute -top-1 -right-1 bg-rose-500 text-white h-5 min-w-[20px] flex items-center justify-center text-[10px] font-bold rounded-full border-2 border-white shadow-sm">
                      {notifyCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </motion.div>
          )}

          {user && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" onClick={() => navigate("/my-orders")} className="rounded-xl font-bold text-stone-600 hover:text-emerald-600 hover:bg-emerald-50">
                <Package className="h-4 w-4 mr-1.5" />
                My Orders
              </Button>
            </motion.div>
          )}

          {user && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="rounded-xl text-stone-600 hover:text-emerald-600 hover:bg-emerald-50">
                👤
              </Button>
            </motion.div>
          )}

          {user ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl px-5 font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                Logout
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => navigate("/login")} className="rounded-xl bg-stone-900 text-white px-6 font-bold hover:bg-stone-800 shadow-md hover:shadow-lg transition-all duration-300">
                Login
              </Button>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-xl text-stone-600 hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] rounded-full p-0 flex items-center justify-center text-[10px] font-bold bg-emerald-600 text-white border-2 border-white shadow-sm">
                      {cartCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* 📱 MOBILE HEADER */}
      <div className="md:hidden px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9, rotate: 90 }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-stone-700 dark:text-stone-300 p-1"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.button>

          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-consumer.png" alt="VillageMart" className="h-10 w-auto object-contain" />
            <span className="font-black text-emerald-600 text-lg tracking-tight">VillageMart</span>
          </Link>

          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/cart")}
              className="relative p-1 text-stone-700 dark:text-stone-300"
            >
              <ShoppingCart className="h-6 w-6" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.div
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full p-0 flex items-center justify-center text-[9px] font-bold bg-emerald-600 text-white border border-white shadow-sm">
                      {cartCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {user ? (
              <button onClick={handleLogout} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors bg-rose-50 dark:bg-rose-900/20 px-4 py-1.5 rounded-full shadow-sm">
                Logout
              </button>
            ) : (
              <button onClick={() => navigate("/login")} className="text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 transition-all px-4 py-1.5 rounded-full shadow-sm">
                Login
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 custom-scrollbar">
          {serviceItems.map((service) => {
            const active =
              service.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(service.path);

            return (
              <motion.button
                key={service.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(service.path)}
                className={`shrink-0 min-w-[120px] rounded-2xl border-2 px-3 py-2.5 flex items-center gap-2.5 transition-all duration-300 shadow-sm ${active
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30 shadow-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-white/50 dark:bg-stone-900/50 border-stone-200/50 dark:border-stone-800 text-stone-600 dark:text-stone-400 backdrop-blur-sm"
                  }`}
              >
                <span className="h-6 w-6 flex items-center justify-center rounded-lg bg-white dark:bg-stone-800 shadow-sm shrink-0">
                  {service.icon}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider">{service.label}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
          <Input
            ref={inputRef}
            value={voice.isListening ? (voice.interimText || "Listening...") : searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={voice.isListening ? (voice.lang === "ta-IN" ? "பேசுங்கள்..." : "Speak now...") : "Search products..."}
            className={`pl-10 pr-20 bg-stone-50/80 dark:bg-stone-900/80 rounded-2xl border-stone-200/50 dark:border-stone-700 transition-all shadow-sm h-11 ${voice.isListening ? "border-rose-400 ring-2 ring-rose-200 dark:ring-rose-900/40" : ""}`}
            readOnly={voice.isListening}
          />

          {/* Voice Search Controls (Mobile) */}
          {voice.isSupported && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {/* Language Toggle */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={voice.toggleLang}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 transition-colors"
              >
                {voice.lang === "en-IN" ? "EN" : "தமி"}
              </motion.button>

              {/* Mic Button */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={toggleVoice}
                className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all shadow-sm ${voice.isListening
                    ? "bg-rose-500 text-white shadow-rose-500/40"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}
              >
                {voice.isListening ? (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-rose-500/30"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <MicOff className="h-4 w-4 relative z-10" />
                  </>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </motion.button>
            </div>
          )}

          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800 rounded-xl shadow-xl z-50 p-2 mt-2"
              >
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onMouseDown={() => doSearch(s)}
                    className={`px-3 py-2.5 cursor-pointer text-sm font-medium rounded-lg transition-colors ${i === 0 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700" : "hover:bg-stone-50 dark:hover:bg-stone-800"
                      }`}
                  >
                    {highlight(s)}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
