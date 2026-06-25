import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import ProductCard from "@/components/ProductCard";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/api/apiClient";
import {
  Home as HomeIcon,
  ShoppingCart,
  Package,
  Bell,
  User,
  Search,
  Leaf,
  Sparkles,
  ArrowRight,
  Cherry,
  Carrot,
  Wheat,
  Flower2,
  Milk,
  ShoppingBasket,
  LayoutGrid,
  RefreshCw,
} from "lucide-react";

/* ======================================================
   🎨 TYPES & CONSTANTS
====================================================== */

interface HomeProps {
  user?: { username?: string; id?: number; user_id?: number };
}

const CATEGORIES = [
  { value: "all", label: "All", icon: LayoutGrid, color: "from-slate-500 to-slate-700" },
  { value: "Groceries", label: "Groceries", icon: ShoppingBasket, color: "from-amber-500 to-orange-600" },
  { value: "Dairy", label: "Dairy", icon: Milk, color: "from-sky-400 to-blue-600" },
  { value: "Vegetables", label: "Vegetables", icon: Carrot, color: "from-emerald-500 to-green-700" },
  { value: "Fruits", label: "Fruits", icon: Cherry, color: "from-rose-400 to-red-600" },
  { value: "Grains", label: "Grains", icon: Wheat, color: "from-yellow-500 to-amber-700" },
  { value: "Garlands", label: "Garlands", icon: Flower2, color: "from-purple-400 to-violet-600" },
  { value: "Village Specials", label: "Village Specials", icon: Leaf, color: "from-lime-500 to-emerald-600" },
];

const SIDEBAR_NAV = [
  { path: "/", label: "Home", icon: HomeIcon },
  { path: "/products", label: "Browse", icon: Search },
  { path: "/cart", label: "Cart", icon: ShoppingCart },
  { path: "/my-orders", label: "Orders", icon: Package },
  { path: "/notifications", label: "Alerts", icon: Bell },
  { path: "/profile", label: "Profile", icon: User },
];

/* ======================================================
   ⏳ SKELETON COMPONENTS
====================================================== */

const BentoSkeleton: React.FC<{ isLarge: boolean }> = ({ isLarge }) => (
  <div
    className={`rounded-3xl overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-sm border border-white/30 dark:border-white/10 animate-pulse ${
      isLarge ? "col-span-2 row-span-2" : "col-span-1"
    }`}
  >
    <div className={`w-full ${isLarge ? "h-64" : "h-44"} bg-stone-200/70 dark:bg-stone-700/40`} />
    <div className="p-4 space-y-3">
      <div className="h-3 w-20 bg-stone-200/70 dark:bg-stone-700/40 rounded-full" />
      <div className="h-5 w-3/4 bg-stone-200/70 dark:bg-stone-700/40 rounded-full" />
      <div className="h-3 w-1/2 bg-stone-200/70 dark:bg-stone-700/40 rounded-full" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-6 w-16 bg-stone-200/70 dark:bg-stone-700/40 rounded-full" />
        <div className="h-9 w-20 bg-stone-200/70 dark:bg-stone-700/40 rounded-full" />
      </div>
    </div>
  </div>
);

/* ======================================================
   🧭 DESKTOP SIDEBAR RAIL
====================================================== */

const DesktopSidebarRail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <motion.nav
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[72px] hover:w-[200px] flex-col items-center py-6 gap-1
                 backdrop-blur-xl bg-white/60 dark:bg-stone-900/60 border-r border-stone-200/50 dark:border-stone-700/30
                 shadow-[4px_0_30px_-10px_rgba(0,0,0,0.06)] transition-all duration-300 group/rail"
    >
      {/* Brand Logo */}
      <motion.div
        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/25 cursor-pointer"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/")}
      >
        <span className="text-white text-xl font-black">V</span>
      </motion.div>

      {/* Nav Items */}
      <div className="flex-1 flex flex-col gap-1 w-full px-3">
        {SIDEBAR_NAV.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const isHovered = hoveredItem === item.path;

          return (
            <motion.button
              key={item.path}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`relative flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all duration-200 overflow-hidden
                ${isActive
                  ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "text-stone-500 dark:text-stone-400 hover:bg-stone-100/60 dark:hover:bg-stone-800/40 hover:text-stone-800 dark:hover:text-stone-200"
                }`}
              whileTap={{ scale: 0.95 }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-500 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}

              <motion.div
                animate={isHovered ? { scale: 1.15, rotate: isActive ? 0 : -8 } : { scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </motion.div>

              {/* Label text — visible when rail expands on hover */}
              <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

/* ======================================================
   🏠 HOME PAGE — THE MAIN COMPONENT
====================================================== */

const Home: React.FC<HomeProps> = ({ user }) => {
  const navigate = useNavigate();
  const username = user?.username ?? "Guest";

  /* ================= LIVE DATABASE FETCH ================= */
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLiveDatabaseCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        // 🎯 Fetch products directly from our live MySQL database endpoint
        const response: any = await apiClient.get("/products");

        // apiClient response interceptor returns response.data automatically,
        // so `response` here is already the parsed JSON body: { success, data, count }
        const rows = response?.data || response || [];

        const parsed = (Array.isArray(rows) ? rows : []).map((row: any) => ({
          id: String(row.id),
          name: row.E_name || "",
          T_name: row.T_name || "",
          price: Number(row.s_price) || 0,
          originalPrice: Number(row.MRP) || undefined,
          image: row.imageurl || "",
          category: row.category || "",
          product_type: row.product_type || "solid",
          rating: 4.5,
          reviews: Number(row.inStock) || 0,
          inStock: Number(row.inStock) > 0,
          stock: Number(row.inStock) || 0,
          isOrganic: !!row.isOrganic,
        }));

        setFeaturedProducts(parsed);
      } catch (err: any) {
        console.error("❌ Customer homepage data fetch failure:", err.message || err);
        setError("Unable to load product catalog. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    loadLiveDatabaseCatalog();
  }, []);

  /* ================= CATEGORY FILTER STATE ================= */
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return featuredProducts;
    return featuredProducts.filter(
      (p) => p.category.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [featuredProducts, activeCategory]);

  /* ================= CART LOGIC ================= */
  const addToCart = (product: any, deliveryDate?: string, size?: string, quantity?: number, unitPrice?: number) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingIndex = cart.findIndex((item: any) => item.id === product.id);

    const newQty = quantity ?? 1;
    const newUnit = size || "1 qty";

    if (newQty === 0) {
      if (existingIndex >= 0) cart.splice(existingIndex, 1);
    } else {
      if (existingIndex >= 0) {
        cart[existingIndex].quantity = newQty;
        cart[existingIndex].selectedSize = newUnit;
        if (unitPrice !== undefined) cart[existingIndex].calculatedUnitPrice = unitPrice;
      } else {
        cart.push({
          ...product,
          quantity: newQty,
          selectedSize: newUnit,
          calculatedUnitPrice: unitPrice !== undefined ? unitPrice : product.price,
          deliveryDate: product.category === "Garlands" ? deliveryDate || null : null,
        });
      }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
  };

  /* ================= BENTO GRID SIZE LOGIC ================= */
  const isBentoLarge = (product: any, index: number): boolean => {
    return (Number(product.id) % 2 === 0) || !!product.isOrganic;
  };

  /* ======================================================
     🎨 RENDER
  ====================================================== */

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-100 to-emerald-50/30 dark:from-stone-950 dark:via-neutral-950 dark:to-emerald-950/20">

      {/* 🧭 Desktop Sidebar Rail — Hidden on mobile */}
      <DesktopSidebarRail />

      {/* ═══════════════════════════════════════════════════════
         📄 MAIN CONTENT AREA — Offset for desktop sidebar
      ═══════════════════════════════════════════════════════ */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="md:ml-[72px] min-h-screen"
      >
        {/* 🔝 Top Header */}
        <Header user={user} />

        {/* 🎯 Hero Banner Carousel */}
        <div className="px-2 md:px-6 pt-2 md:pt-4">
          <div className="rounded-2xl md:rounded-3xl overflow-hidden">
            <HeroBanner />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
           🎤 WELCOME & SEARCH AREA
        ═══════════════════════════════════════════════════════ */}
        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <motion.div
                className="flex items-center gap-2 mb-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Fresh Picks Daily
                </span>
              </motion.div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                Welcome, <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">{username}</span>
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Discover farm-fresh products delivered to your doorstep
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold
                         bg-stone-900 dark:bg-white text-white dark:text-stone-900
                         hover:shadow-lg hover:shadow-stone-900/20 dark:hover:shadow-white/20
                         transition-shadow duration-300"
            >
              View Full Catalog
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════
           🏷️ GLASSMORPHIC CATEGORY CHIP TRACK
        ═══════════════════════════════════════════════════════ */}
        <motion.section
          className="max-w-7xl mx-auto px-4 md:px-6 py-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div
            className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.value;
              const Icon = cat.icon;

              return (
                <motion.button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap
                    transition-colors duration-200 shrink-0
                    ${isActive
                      ? "text-white shadow-lg"
                      : "bg-white/60 dark:bg-white/5 backdrop-blur-md border border-stone-200/50 dark:border-stone-700/30 text-stone-600 dark:text-stone-300 hover:bg-white/80 dark:hover:bg-white/10"
                    }`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Animated pill background — slides to active category */}
                  {isActive && (
                    <motion.div
                      layoutId="activeCategoryIndicator"
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${cat.color} shadow-lg`}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon size={16} strokeWidth={2} />
                    {cat.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ═══════════════════════════════════════════════════════
           🧱 BENTO-GRID LIVE INVENTORY CANVAS
        ═══════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-10">
          {/* Section header */}
          <motion.div
            className="flex items-center justify-between mb-6"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Leaf className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {activeCategory === "all" ? "Featured Products" : CATEGORIES.find(c => c.value === activeCategory)?.label || "Products"}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {filteredProducts.length} items • Live from database
                </p>
              </div>
            </div>
          </motion.div>

          {/* ─── Loading State ─── */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 auto-rows-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <BentoSkeleton key={i} isLarge={i === 0 || i === 3} />
              ))}
            </div>
          )}

          {/* ─── Error State ─── */}
          {!loading && error && (
            <motion.div
              className="flex flex-col items-center justify-center py-20 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <span className="text-3xl">😔</span>
              </div>
              <p className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">{error}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 mt-2 px-5 py-2.5 rounded-2xl text-sm font-semibold
                           bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
                           border border-red-200 dark:border-red-800/30
                           hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </motion.button>
            </motion.div>
          )}

          {/* ─── Empty State ─── */}
          {!loading && !error && filteredProducts.length === 0 && (
            <motion.div
              className="flex flex-col items-center justify-center py-20 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 rounded-3xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
                <span className="text-3xl">🛒</span>
              </div>
              <p className="text-lg font-semibold text-stone-700 dark:text-stone-300">
                {activeCategory === "all" ? "No products available yet." : `No ${activeCategory} products found.`}
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Check back soon for fresh village goods!</p>
              {activeCategory !== "all" && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory("all")}
                  className="mt-4 px-5 py-2 rounded-2xl text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/20
                             text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30
                             hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  Show All Products
                </motion.button>
              )}
            </motion.div>
          )}

          {/* ─── ✅ Bento Grid — Live Product Cards ─── */}
          {!loading && !error && filteredProducts.length > 0 && (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 auto-rows-auto"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.06 } },
              }}
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, index) => {
                  const isLarge = isBentoLarge(product, index);

                  return (
                    <motion.div
                      key={product.id}
                      layout
                      variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.95 },
                        visible: { opacity: 1, y: 0, scale: 1 },
                      }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{
                        y: -8,
                        scale: 1.02,
                        boxShadow: "0 20px 40px -15px rgba(16, 185, 129, 0.15)",
                      }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className={`relative overflow-hidden bg-white/70 dark:bg-white/5 backdrop-blur-md
                        border border-white/40 dark:border-white/10 rounded-3xl group cursor-pointer
                        ${isLarge ? "col-span-2 row-span-1 sm:row-span-1" : "col-span-1"}`}
                    >
                      {/* Ambient glow overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none z-0" />

                      {/* Organic badge accent stripe */}
                      {product.isOrganic && (
                        <div className="absolute top-3 right-3 z-10">
                          <motion.div
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                       bg-emerald-500/90 text-white shadow-md shadow-emerald-500/20 backdrop-blur-sm"
                          >
                            <Leaf className="h-3 w-3" />
                            Organic
                          </motion.div>
                        </div>
                      )}

                      {/* Bilingual label accent — shown on large cards */}
                      {isLarge && product.T_name && (
                        <div className="absolute top-3 left-3 z-10">
                          <div className="px-2.5 py-1 rounded-full text-[10px] font-semibold
                                          bg-white/80 dark:bg-stone-800/80 backdrop-blur-sm
                                          text-emerald-700 dark:text-emerald-400
                                          border border-emerald-200/50 dark:border-emerald-700/30">
                            {product.T_name}
                          </div>
                        </div>
                      )}

                      {/* Product Card content */}
                      <div className="relative z-[1]">
                        <ProductCard
                          {...product}
                          onAddToCart={(deliveryDate, size, quantity, unitPrice) =>
                            addToCart(product, deliveryDate, size, quantity, unitPrice)
                          }
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Mobile "View All" CTA */}
          {!loading && !error && filteredProducts.length > 0 && (
            <motion.div
              className="flex justify-center mt-8 sm:hidden"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/products")}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold
                           bg-white/70 dark:bg-white/5 backdrop-blur-md
                           border border-stone-200/50 dark:border-stone-700/30
                           text-stone-700 dark:text-stone-300
                           hover:bg-white dark:hover:bg-white/10 transition-colors shadow-sm"
              >
                View All Products
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </motion.div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════
           ✅ TRUST / WHY CHOOSE US — Glassmorphic Cards
        ═══════════════════════════════════════════════════════ */}
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-12">
          <motion.div
            className="rounded-3xl bg-gradient-to-br from-emerald-500/5 via-stone-50/50 to-amber-500/5
                       dark:from-emerald-500/5 dark:via-stone-900/30 dark:to-amber-500/5
                       border border-white/40 dark:border-white/5 backdrop-blur-md p-8 md:p-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <motion.h2
              className="text-xl sm:text-2xl font-bold text-center mb-8 text-stone-900 dark:text-stone-100"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Why Choose VillageMart?
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
              {[
                { icon: "🚚", title: "Fast Delivery", desc: "Same day delivery in most areas", gradient: "from-emerald-500 to-green-600" },
                { icon: "🌱", title: "Fresh Quality", desc: "Direct from farms and local vendors", gradient: "from-amber-500 to-orange-600" },
                { icon: "💳", title: "Easy Payments", desc: "Multiple UPI options available", gradient: "from-violet-500 to-purple-600" },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  className="flex flex-col items-center text-center space-y-3 p-6 rounded-2xl
                             bg-white/50 dark:bg-white/5 backdrop-blur-sm
                             border border-white/40 dark:border-white/10
                             hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-300"
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.12, duration: 0.4 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                >
                  <motion.div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="text-white text-2xl">{item.icon}</span>
                  </motion.div>
                  <h3 className="font-bold text-stone-800 dark:text-stone-200">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Bottom spacing for mobile floating dock */}
        <div className="h-24 md:h-6" />

      </motion.main>
    </div>
  );
};

export default Home;
