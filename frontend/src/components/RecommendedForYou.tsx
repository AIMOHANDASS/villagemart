import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingCart,
  Star,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  recommendProducts,
  parseProductCSV,
  getCartItems,
  type Recommendation,
  type Product,
  type CartItem,
} from "@/lib/recommendations";

/* ================= BADGE STYLES ================= */

const typeBadge: Record<string, { bg: string; icon: string }> = {
  "cart-based": { bg: "bg-emerald-500", icon: "🛒" },
  "category-based": { bg: "bg-blue-500", icon: "📦" },
  trending: { bg: "bg-amber-500", icon: "🔥" },
};

/* ================= COMPONENT ================= */

const RecommendedForYou: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  /* ---------- Load products + generate recommendations ---------- */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/datadetails1.csv");
        if (!res.ok) throw new Error();
        const csv = await res.text();
        const products = parseProductCSV(csv);
        if (!mounted) return;

        setAllProducts(products);

        const cartItems = getCartItems();
        const recs = recommendProducts(cartItems, products, 10);
        setRecommendations(recs);
      } catch {
        // Silently fail — recommendations are non-critical
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();

    // Re-calculate when cart changes
    const onStorageChange = () => {
      if (allProducts.length === 0) return;
      const cartItems = getCartItems();
      const recs = recommendProducts(cartItems, allProducts, 10);
      setRecommendations(recs);
    };

    window.addEventListener("storage", onStorageChange);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  // Re-run recommendations when allProducts changes (initial load)
  useEffect(() => {
    if (allProducts.length === 0) return;
    const cartItems = getCartItems();
    const recs = recommendProducts(cartItems, allProducts, 10);
    setRecommendations(recs);
  }, [allProducts]);

  /* ---------- Add to cart ---------- */
  const addToCart = (product: Product) => {
    const rawCart = localStorage.getItem("cart");
    let cart: any[] = rawCart ? JSON.parse(rawCart) : [];

    if (cart.find((item: any) => item.id === product.id)) {
      toast("Already in cart!", {
        icon: "ℹ️",
        style: {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fcd34d",
        },
      });
      return;
    }

    let initialUnit = "unit";
    if (
      product.category === "Groceries" ||
      product.category === "Vegetables" ||
      product.category === "Fruits"
    ) {
      initialUnit = "kg";
    }

    const initialQuantity = initialUnit === "kg" ? 0.5 : 1;

    cart.push({
      ...product,
      quantity: initialQuantity,
      unit: initialUnit,
      deliveryDate: null,
    });

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));

    setAddedIds((prev) => new Set(prev).add(product.id));
    toast.success(`${product.name} added to cart!`);

    // Bounce reset
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 800);
  };

  /* ---------- Scroll controls ---------- */
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -240 : 240;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  /* ---------- Don't render if empty ---------- */
  if (!isLoading && recommendations.length === 0) return null;

  return (
    <section
      id="recommended-for-you"
      className="py-5 sm:py-8 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/10 dark:to-transparent"
    >
      <div className="container px-4 mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-4 sm:mb-6"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30"
            >
              <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </motion.div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
                Recommended for You
                <motion.span
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </motion.span>
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Smart picks based on your cart & preferences
              </p>
            </div>
          </div>

          {/* Scroll Arrows (desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Scroll recommendations left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Scroll recommendations right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Loading skeleton */}
        {isLoading ? (
          <div
            className="flex gap-3 sm:gap-4 overflow-hidden"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[170px] sm:w-[210px] bg-card rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-800"
              >
                <div className="w-full h-32 sm:h-40 skeleton animate-shimmer" />
                <div className="p-3 space-y-2">
                  <div className="skeleton-text w-24 h-3" />
                  <div className="skeleton-text w-full h-4" />
                  <div className="skeleton-text w-16 h-5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Recommendation Cards */
          <div
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <AnimatePresence>
              {recommendations.map((rec, idx) => {
                const { product, reason, type } = rec;
                const badge = typeBadge[type];
                const justAdded = addedIds.has(product.id);

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06, duration: 0.35 }}
                    whileHover={{ scale: 1.04, y: -5 }}
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0 w-[170px] sm:w-[210px] bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-800 transition-all duration-300 cursor-pointer group"
                  >
                    {/* Image */}
                    <div
                      className="relative overflow-hidden"
                      onClick={() => navigate("/products")}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Recommendation Type Badge */}
                      <Badge
                        className={`absolute top-2 left-2 ${badge.bg} text-white text-[9px] sm:text-[10px] px-1.5 py-0 rounded-md shadow-md`}
                      >
                        {badge.icon} {type === "cart-based" ? "For You" : type === "category-based" ? "Similar" : "Trending"}
                      </Badge>

                      {/* Organic badge */}
                      {product.isOrganic && (
                        <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] px-1 py-0 rounded-md shadow-md">
                          🌱
                        </Badge>
                      )}

                      {/* Hover Add Button (floating) */}
                      {product.category !== "Garlands" && (
                        <motion.div
                          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100"
                          initial={{ scale: 0.8 }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className="w-8 h-8 bg-primary text-white rounded-full shadow-lg flex items-center justify-center ripple-container"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-1.5">
                      {/* Reason tag */}
                      <p className="text-[9px] sm:text-[10px] text-violet-600 dark:text-violet-400 font-medium truncate">
                        ✨ {reason}
                      </p>

                      <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {product.rating}
                        </span>
                      </div>

                      {/* Price + Add */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-sm sm:text-base font-bold text-primary">
                          ₹{product.price}
                        </span>

                        <AnimatePresence mode="wait">
                          <motion.button
                            key={justAdded ? "added" : "add"}
                            initial={{ scale: 0.8 }}
                            animate={{
                              scale: justAdded ? [1, 1.25, 1] : 1,
                            }}
                            transition={{ duration: 0.4 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (product.category === "Garlands") {
                                navigate("/products?category=Garlands");
                              } else {
                                addToCart(product);
                              }
                            }}
                            className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm transition-all ripple-container ${
                              justAdded
                                ? "bg-emerald-500 text-white"
                                : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                            }`}
                          >
                            {product.category === "Garlands"
                              ? "View"
                              : justAdded
                              ? "Added ✓"
                              : "Add +"}
                          </motion.button>
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedForYou;
