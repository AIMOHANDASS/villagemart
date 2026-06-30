import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { parseCustomQuantityInput, formatInitialDisplay } from "../utils/quantityParser";
import { validateProfileStatus } from "./Profile";
import { API_BASE_URL } from "@/api/apiClient";

interface CartItem {
  id: string;
  name: string;
  E_name?: string;
  T_name?: string;
  price: number;
  base_price?: number;
  calculatedUnitPrice?: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  product_type?: "solid" | "liquid" | "other";
  quantity: number;
  selectedSize?: string;
  unit?: string;
  isOrganic?: boolean;
  deliveryDate?: string;
  slot?: "morning" | "evening";
  stock?: number;
  available_stock?: number;
}

type CartProps = {
  user: any;
};

const DRAFT_KEY = "vm_pending_booking";

const getProductImageSrc = (url?: string) => {
  if (!url) return "/placeholder.png";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${cleanUrl}`;
};

/* ================= SKELETON ================= */
const CartSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-md p-4 flex gap-4 items-center animate-pulse">
        <div className="w-24 h-24 bg-stone-200/70 dark:bg-stone-700/40 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div className="bg-stone-200/70 dark:bg-stone-700/40 rounded-full w-32 h-5" />
          <div className="bg-stone-200/70 dark:bg-stone-700/40 rounded-full w-24 h-4" />
          <div className="flex justify-between items-center">
            <div className="bg-stone-200/70 dark:bg-stone-700/40 rounded-full w-20 h-6" />
            <div className="bg-stone-200/70 dark:bg-stone-700/40 rounded-full w-28 h-8" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const Cart: React.FC<CartProps> = ({ user }) => {
  const navigate = useNavigate();
  const isProfileComplete = useMemo(() => validateProfileStatus(user), [user]);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  });

  const [editingValue, setEditingValue] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLiveStock = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/products`);
        if (res.ok) {
          const json = await res.json();
          const rows = json.data || json || [];
          setCartItems(prev => prev.map(item => {
            const liveProduct = rows.find((r: any) => String(r.id) === String(item.id));
            if (liveProduct) {
              return { 
                ...item, 
                stock: liveProduct.inStock !== undefined ? Number(liveProduct.inStock) || 0 : item.stock,
                gst: Number(liveProduct.GST || liveProduct.gst || 0),
                sale_price: Number(liveProduct.s_price || liveProduct.sale_price || 0)
              };
            }
            return item;
          }));
        }
      } catch (err) {
        console.error("Failed to sync live stock for cart", err);
      }
    };
    fetchLiveStock();
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
    window.dispatchEvent(new Event("storage"));
  }, [cartItems]);

  const finalizeTextQuantityUpdate = (id: string, textValue: string, productType: "solid" | "liquid" | "other" = "other") => {
    if (textValue === undefined) return;
    
    setCartItems(items => items.map(item => {
      if (item.id === id) {
         let parsed = parseCustomQuantityInput(textValue, productType);
         const maxAvailableStock = item.available_stock || item.stock || 9;
         
         // 🎯 CRITICAL UX GUARD RAIL: Auto-correct manual entries exceeding stock
         if (parsed.rawWeight > maxAvailableStock) {
           toast.error(`Only ${maxAvailableStock} units available in stock. Autofilled to maximum.`);
           
           // Format appropriately based on product type to keep suffix intact
           const unitSuffix = productType === "solid" ? "kg" : productType === "liquid" ? "ltr" : "qty";
           let newStr = `${maxAvailableStock} ${unitSuffix}`;
           if (productType === "solid" && maxAvailableStock < 1) newStr = `${Math.round(maxAvailableStock * 1000)}g`;
           if (productType === "liquid" && maxAvailableStock < 1) newStr = `${Math.round(maxAvailableStock * 1000)}ml`;
           
           parsed = parseCustomQuantityInput(newStr, productType);
         }
         
         const newUnitPrice = item.price * parsed.rawWeight;
         return { 
           ...item, 
           quantity: parsed.quantityMultiplier, 
           selectedSize: parsed.displayStr,
           calculatedUnitPrice: newUnitPrice
         };
      }
      return item;
    }));
    
    setEditingValue(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleStepChange = (item: CartItem, delta: number) => {
    const pt = item.product_type || "other";
    const currentStr = editingValue[item.id] !== undefined ? editingValue[item.id] : formatInitialDisplay(item);
    const parsed = parseCustomQuantityInput(currentStr, pt as "solid" | "liquid" | "other");
    
    let newRawWeight = parsed.rawWeight;
    if (pt === "solid" || pt === "liquid") {
        newRawWeight += delta * 0.5; // step by 500g / 500ml
        if (newRawWeight <= 0) newRawWeight = 0.1; // min 100g
    } else {
        newRawWeight += delta;
        if (newRawWeight < 1) newRawWeight = 1;
    }
    
    // 🎯 CRITICAL UX GUARD RAIL: Block increments passing the maximum available store supply inventory
    const maxAvailableStock = item.available_stock || item.stock || 9;
    if (delta > 0 && newRawWeight > maxAvailableStock) {
      toast.error(`Sorry, only ${maxAvailableStock} units of this item are currently available in stock.`);
      return;
    }
    
    const unitSuffix = pt === "solid" ? "kg" : pt === "liquid" ? "ltr" : "qty";
    let newStr = `${newRawWeight} ${unitSuffix}`;
    if (pt === "solid" && newRawWeight < 1) newStr = `${Math.round(newRawWeight * 1000)}g`;
    if (pt === "liquid" && newRawWeight < 1) newStr = `${Math.round(newRawWeight * 1000)}ml`;
    
    finalizeTextQuantityUpdate(item.id, newStr, pt as "solid" | "liquid" | "other");
  };

  const updateCartQty = (id: string, size: string | undefined, newQty: number) => {
    setCartItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          return { ...item, quantity: Math.max(1, newQty) };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    setCartItems((items) => items.filter((item) => item.id !== id));
    if (item) {
      toast.success(`${item.name || item.E_name} removed from cart`);
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.calculatedUnitPrice || item.price) * item.quantity,
    0
  );

  const savings = cartItems.reduce((sum, item) => {
    const saved = item.originalPrice
      ? (item.originalPrice - (item.calculatedUnitPrice || item.price)) * item.quantity
      : 0;
    return sum + saved;
  }, 0);

  const FREE_DELIVERY_THRESHOLD = 500;
  const deliveryFee = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : 5;
  const total = subtotal + deliveryFee;

  const proceedToCheckout = () => {
    localStorage.removeItem(DRAFT_KEY);
    navigate("/checkout", { state: { checkoutMode: "products" } });
  };

  if (cartItems.length === 0) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-100 to-emerald-50/30 dark:from-stone-950 dark:via-neutral-950 dark:to-emerald-950/20"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.4 }}
      >
        <Header user={user} />
        <div className="container px-4 py-32 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="text-8xl mb-6 drop-shadow-xl"
          >
            🛒
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 mb-4"
          >
            Your Shopping Cart is Empty!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-stone-600 dark:text-stone-400 mb-8"
          >
            Time to fill it up with some farm-fresh goodness.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/products")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-4"
            >
              <ShoppingBag className="h-5 w-5" />
              Start Shopping Now
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-100 to-emerald-50/30 dark:from-stone-950 dark:via-neutral-950 dark:to-emerald-950/20"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >
      <Header user={user} />
      <div className="container max-w-7xl mx-auto px-4 md:px-6 py-8 pb-32 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Cart Items Panel (Bento Left) */}
          <div className="lg:col-span-8 space-y-6">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-3 border-b border-stone-200/50 dark:border-stone-700/30 pb-4 mb-2"
            >
              Your Items <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">{cartItems.length}</Badge>
            </motion.h1>

            <AnimatePresence>
              <div className="space-y-4">
                {cartItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0, padding: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm rounded-3xl overflow-hidden group"
                  >
                    <div className="p-4 flex flex-row gap-4 items-center relative">
                      {/* Item Image */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <img
                          src={getProductImageSrc(item.images?.[0] || item.image)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.png";
                          }}
                        />
                      </motion.div>

                      {/* Item Details */}
                      <div className="flex-1 w-full space-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-lg text-stone-900 dark:text-stone-100 leading-tight">{item.name || item.E_name}</h3>
                            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">{item.T_name}</p>
                            
                            {(item.selectedSize || item.unit) && (
                              <div className="mt-1.5">
                                <span className="inline-flex text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                  Pack Size: {item.selectedSize || item.unit}
                                </span>
                              </div>
                            )}

                            {/* GARLAND DELIVERY INFO */}
                            {item.category === "Garlands" && item.deliveryDate && (
                              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1.5 flex items-center gap-1">
                                <span>📦</span> Delivery:{" "}
                                {new Date(item.deliveryDate).toLocaleString("en-IN")}{" "}
                                ({item.slot === "morning" ? "Morning" : "Evening"})
                              </p>
                            )}

                            <div className="flex space-x-2 mt-2">
                              {item.isOrganic && (
                                <Badge className="bg-emerald-500/90 text-white text-[10px] uppercase tracking-wider px-2 py-0 rounded-md shadow-sm">
                                  Organic
                                </Badge>
                              )}
                              {item.originalPrice && (
                                <Badge variant="destructive" className="text-[10px] uppercase tracking-wider px-2 py-0 rounded-md shadow-sm">Sale</Badge>
                              )}
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.15, rotate: 8 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeItem(item.id)}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                          >
                            <Trash2 className="h-5 w-5" />
                          </motion.button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/50">
                          <div className="flex items-center gap-2">
                            <motion.span
                              key={item.quantity}
                              initial={{ scale: 1.1, color: "#10b981" }}
                              animate={{ scale: 1, color: "inherit" }}
                              transition={{ duration: 0.3 }}
                              className="font-black text-xl text-emerald-600 dark:text-emerald-400"
                            >
                              ₹{((item.calculatedUnitPrice || item.price) * item.quantity).toFixed(2)}
                            </motion.span>
                            {item.originalPrice && (
                              <span className="text-sm text-stone-400 line-through font-medium">
                                ₹{(item.originalPrice * item.quantity).toFixed(2)}
                              </span>
                            )}
                          </div>

                          {/* Fully Editable Suffix Quantity Box Element 🎯 */}
                          <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm overflow-hidden shadow-sm h-10">
                            {/* Decrement Action */}
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleStepChange(item, -1)} 
                              className="px-4 font-extrabold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all h-full flex items-center justify-center"
                            >
                              <Minus className="h-4 w-4" />
                            </motion.button>

                            {/* Dynamic Editable Multi-Unit Text Box 🎯 */}
                            <motion.input
                              whileTap={{ scale: 0.97 }}
                              type="text"
                              value={editingValue[item.id] !== undefined ? editingValue[item.id] : formatInitialDisplay(item)}
                              onChange={(e) => setEditingValue(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onBlur={() => finalizeTextQuantityUpdate(item.id, editingValue[item.id], item.product_type as "solid" | "liquid" | "other")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  finalizeTextQuantityUpdate(item.id, editingValue[item.id], item.product_type as "solid" | "liquid" | "other");
                                }
                              }}
                              className="w-24 text-center font-bold text-stone-900 dark:text-stone-100 bg-transparent border-none outline-none focus:ring-0 text-sm py-1 h-full"
                            />

                            {/* Increment Action */}
                            <motion.button 
                              whileTap={{ scale: 0.9 }}
                              disabled={parseCustomQuantityInput(editingValue[item.id] !== undefined ? editingValue[item.id] : formatInitialDisplay(item), (item.product_type || "other") as "solid" | "liquid" | "other").rawWeight >= (item.available_stock || item.stock || 9)}
                              onClick={() => handleStepChange(item, 1)} 
                              className="px-4 font-extrabold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all h-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-4 w-4" />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </div>

          {/* Summary Panel (Bento Right) - Sticky */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="sticky top-24"
            >
              <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl border border-white/40 dark:border-white/10 rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600" />
                <div className="p-6 md:p-8 space-y-6">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                    Order Summary
                  </h2>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-stone-600 dark:text-stone-400 font-medium">
                      <span>Subtotal</span>
                      <span className="text-stone-900 dark:text-stone-100 font-bold">₹{subtotal.toFixed(2)}</span>
                    </div>

                    {savings > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-900/20 px-4 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm"
                      >
                        <span className="flex items-center gap-2">🎉 Instant Savings</span>
                        <span>-₹{savings.toFixed(2)}</span>
                      </motion.div>
                    )}

                    <div className="flex justify-between items-center text-stone-600 dark:text-stone-400 font-medium">
                      <span>Delivery Fee</span>
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">FREE <span className="text-lg">✨</span></span>
                      ) : (
                        <span className="text-stone-900 dark:text-stone-100 font-bold">₹{deliveryFee}</span>
                      )}
                    </div>

                    <div className="h-px bg-stone-200/50 dark:bg-stone-700/50 my-4" />

                    <motion.div
                      key={total}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      className="flex justify-between items-end"
                    >
                      <span className="text-lg text-stone-600 dark:text-stone-400 font-bold">Total</span>
                      <span className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">₹{total.toFixed(2)}</span>
                    </motion.div>
                  </div>

                  <div className="pt-2 hidden lg:block">
                    {!isProfileComplete && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-xl mb-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-amber-500 text-lg">⚠️</span>
                          <p className="text-amber-800 text-xs font-medium text-left leading-tight">
                            Order Blocked: Add a valid 10-digit Phone Number & Address in Profile to proceed.
                          </p>
                        </div>
                      </motion.div>
                    )}
                    <motion.button
                      disabled={!isProfileComplete}
                      whileHover={isProfileComplete ? { scale: 1.02, y: -2 } : {}}
                      whileTap={isProfileComplete ? { scale: 0.97 } : {}}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg shadow-lg transition-all duration-300 ${isProfileComplete ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/40' : 'bg-gray-400 text-white cursor-not-allowed opacity-70'}`}
                      onClick={(e) => {
                        if (!isProfileComplete) {
                          e.preventDefault();
                          return;
                        }
                        proceedToCheckout();
                      }}
                    >
                      Proceed to Checkout
                      <ArrowRight className="h-5 w-5" />
                    </motion.button>
                  </div>

                  {deliveryFee !== 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-stone-600 dark:text-stone-400 bg-amber-50/80 dark:bg-amber-900/20 px-4 py-3 rounded-2xl border border-amber-100 dark:border-amber-800/30"
                    >
                      🛒 Add <strong className="text-amber-700 dark:text-amber-400">₹{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)}</strong> more
                      for <strong>FREE delivery!</strong>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-t border-stone-200/50 dark:border-stone-700/50 lg:hidden z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">Total Amount</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{total.toFixed(2)}</span>
          </div>
          <motion.button
            disabled={!isProfileComplete}
            whileTap={isProfileComplete ? { scale: 0.95 } : {}}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base shadow-lg transition-all duration-300 ${isProfileComplete ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25' : 'bg-gray-400 text-white cursor-not-allowed opacity-70'}`}
            onClick={(e) => {
               if (!isProfileComplete) {
                 e.preventDefault();
                 return;
               }
               proceedToCheckout();
            }}
          >
            Checkout
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default Cart;
