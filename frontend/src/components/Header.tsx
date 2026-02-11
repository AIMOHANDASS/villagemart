import React, { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useLocation, useNavigate } from "react-router-dom";
import truckImage from "@/assets/truck.png";

type Props = { user?: any };

const API_BASE_URL = "https://villagesmart.in/api";
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
      .catch(() => {});
  }, []);

  /* ================= LOAD RECENT ================= */
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("recent-searches") || "[]");
    setRecent(saved);
  }, []);

  /* ================= FETCH NOTIFICATION COUNT ================= */
  useEffect(() => {
    if (!user?.id) return;

    fetch(`${API_BASE_URL}/notifications/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        const unread = data.filter((n: any) => !n.is_read);
        setNotifyCount(unread.length);
      })
      .catch(() => {});
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
        <span className="text-green-600 font-bold">
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">

      {/* 💻 DESKTOP HEADER */}
      <div className="hidden md:flex items-center space-x-6 container mx-auto px-4 py-3">

        <Link to="/" className="flex items-center space-x-2">
          <img src="/favicon.png" alt="VillageMart" className="h-10 w-10 rounded" />
          <span className="text-xl font-bold text-primary">VillageMart</span>
        </Link>

        {/* SEARCH */}
        <div className="flex-1 max-w-sm mx-4 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={onKeyDown}
            type="search"
            placeholder="Search groceries, fruits, vegetables..."
            className="pl-8 bg-muted/50"
          />

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow z-50 p-2">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => doSearch(s)}
                  className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
                    i === 0 ? "bg-green-50" : "hover:bg-gray-100"
                  }`}
                >
                  <span>{highlight(s)}</span>
                  {i === 0 && (
                    <Badge className="bg-green-600 text-white">Top</Badge>
                  )}
                </div>
              ))}

              {recent.length > 0 && (
                <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                  <div className="font-semibold mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Recent
                  </div>
                  {recent.map((r) => (
                    <div
                      key={r}
                      onMouseDown={() => doSearch(r)}
                      className="px-3 py-1 cursor-pointer hover:bg-gray-100"
                    >
                      {r}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                <div className="font-semibold mb-1 flex items-center gap-1">
                  <Flame className="h-3 w-3" /> Popular
                </div>
                {POPULAR_SEARCHES.map((p) => (
                  <div
                    key={p}
                    onMouseDown={() => doSearch(p)}
                    className="px-3 py-1 cursor-pointer hover:bg-gray-100"
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* NAV */}
        <nav className="flex items-center space-x-3">
          {serviceItems.map((service) => {
            const active =
              service.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(service.path);

            return (
              <button
                key={service.key}
                onClick={() => navigate(service.path)}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-green-100 text-green-800"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {service.icon}
                <span>{service.label}</span>
              </button>
            );
          })}

          <Link to="/products" className="text-sm font-medium hover:text-primary px-2">
            All Products
          </Link>
        </nav>

        {/* ACTIONS */}
        <div className="flex items-center space-x-2">

          {user && (
            <Button variant="ghost" size="icon" className="relative" onClick={openNotifications}>
              <Bell className="h-5 w-5" />
              {notifyCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-600 text-white">
                  {notifyCount}
                </Badge>
              )}
            </Button>
          )}

          {user && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/my-orders")}>
              <Package className="h-4 w-4 mr-1" />
              My Orders
            </Button>
          )}

          {user && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              👤
            </Button>
          )}

          {user ? (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              Login
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("/cart")}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* 📱 MOBILE HEADER */}
      <div className="md:hidden px-3 py-2 flex flex-col gap-2 bg-white shadow">
        <div className="flex items-center justify-between">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>

          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" className="h-8 w-8 rounded" />
            <span className="font-bold text-primary">VillageMart</span>
          </Link>

          {user ? (
            <button onClick={handleLogout} className="text-sm font-semibold text-red-600">
              Logout
            </button>
          ) : (
            <button onClick={() => navigate("/login")} className="text-sm font-semibold text-primary">
              Login
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {serviceItems.map((service) => {
            const active =
              service.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(service.path);

            return (
              <button
                key={service.key}
                onClick={() => navigate(service.path)}
                className={`shrink-0 min-w-[120px] rounded-2xl border px-3 py-2 flex items-center gap-2 transition-colors ${
                  active
                    ? "bg-yellow-100 border-yellow-400"
                    : "bg-white border-gray-200"
                }`}
              >
                <span className="h-6 w-6 flex items-center justify-center rounded-full bg-white">
                  {service.icon}
                </span>
                <span className="text-sm font-semibold">{service.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search products..."
            className="pl-8 bg-muted/50"
          />

          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow z-50 p-2">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => doSearch(s)}
                  className={`px-3 py-2 cursor-pointer text-sm ${
                    i === 0 ? "bg-green-50" : "hover:bg-gray-100"
                  }`}
                >
                  {highlight(s)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
