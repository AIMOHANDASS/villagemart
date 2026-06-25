// src/components/ProductCard.tsx

import { ShoppingCart, Star, CalendarClock, Leaf, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseCustomQuantityInput, formatInitialDisplay } from "../utils/quantityParser";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ProductCardProps {
  id: string;
  name: string;
  T_name?: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  product_type?: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isOrganic?: boolean;
  onAddToCart?: (deliveryDate?: string, size?: string, quantity?: number, unitPrice?: number) => void; 
}

const getPriceMultiplier = (unitString: string): number => {
  switch (unitString) {
    case "1 kg":
    case "1 ltr":
    case "1 qty":
      return 1.0;
    case "500g":
    case "500ml":
      return 0.5;
    case "250g":
    case "250ml":
      return 0.25;
    case "100g":
    case "100ml":
      return 0.1;
    case "50g":
      return 0.05;
    default:
      return 1.0; // Fallback safe multi-value
  }
};

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  T_name,
  price,
  originalPrice,
  image,
  category,
  product_type = "solid",
  rating,
  reviews,
  inStock,
  isOrganic,
  onAddToCart,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const existing = cart.find((item: any) => item.id === id);
      return existing ? existing.quantity : 0;
    } catch {
      return 0;
    }
  });

  const dynamicSizes = product_type === "solid" 
    ? ["50g", "100g", "250g", "500g", "1 kg"] 
    : product_type === "liquid" 
      ? ["50ml", "100ml", "250ml", "500ml", "1 ltr"]
      : ["1 qty"];

  const [selectedSize, setSelectedSize] = useState(() => {
    if (product_type === "solid") return "1 kg";
    if (product_type === "liquid") return "1 ltr";
    return "1 qty";
  });

  // Calculate active single item fractional rates dynamically 🎯
  const basePrice = Number(price);
  const baseMRP = Number(originalPrice || price);
  const sizeMultiplier = getPriceMultiplier(selectedSize);

  const adjustedPricePerItem = basePrice * sizeMultiplier;
  const adjustedMRPPerItem = baseMRP * sizeMultiplier;

  // Final pricing multiplied by the plus/minus stepper count wrapper 🎯
  const totalDisplayPrice = adjustedPricePerItem * (cartQuantity || 1);

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleStepChange = (delta: number) => {
    const newQty = Math.max(0, cartQuantity + delta);
    if (newQty === 0 && cartQuantity === 0) return; // do nothing if already 0
    handleUpdateQuantity(newQty);
  };

  const handleUpdateQuantity = (newQty: number) => {
    if (category === "Garlands") {
      if (!deliveryDate) {
        alert("❌ Please select delivery date & time for Garlands");
        return;
      }

      const selected = new Date(deliveryDate);
      const now = new Date();
      const diffHours = (selected.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24) {
        alert("❌ Garland orders must be placed at least 24 hours in advance.");
        return;
      }

      onAddToCart?.(deliveryDate, selectedSize, newQty, adjustedPricePerItem);
      setShowPicker(false);
    } else {
      onAddToCart?.(undefined, selectedSize, newQty, adjustedPricePerItem);
    }

    setCartQuantity(newQty);

    // Bounce animation if incrementing
    if (newQty > cartQuantity) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 600);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card 
        className="group cursor-pointer transition-all duration-300 hover:shadow-xl rounded-2xl overflow-hidden border-0 shadow-md bg-card"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('select') || target.closest('input')) {
            return;
          }
          setIsModalOpen(true);
        }}
      >
        <CardContent className="p-0">
          {/* Image Container with Hover Zoom */}
          <div className="relative overflow-hidden rounded-t-2xl img-zoom-container">
            <img
              src={image}
              alt={name}
              className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
            />

            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Discount Badge */}
            {discount > 0 && (
              <Badge className="absolute top-3 left-3 bg-red-500 text-white shadow-lg text-xs px-2 py-0.5 rounded-full">
                {discount}% OFF
              </Badge>
            )}

            {/* Organic Badge */}
            {isOrganic && (
              <motion.div
                className="absolute top-3 right-3"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Badge className="bg-emerald-500 text-white shadow-lg text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Leaf className="h-3 w-3" />
                  Organic
                </Badge>
              </motion.div>
            )}

            {/* Fresh Badge for non-organic, non-garland */}
            {!isOrganic && category !== "Garlands" && inStock && (
              <motion.div
                className="absolute top-3 right-3"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Badge className="bg-sky-500 text-white shadow-lg text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Fresh
                </Badge>
              </motion.div>
            )}

            {/* Out of Stock Overlay */}
            {!inStock && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white font-bold text-lg tracking-wide">Out of Stock</span>
              </div>
            )}

            {/* Floating Add Button (appears on hover) */}
            {inStock && category !== "Garlands" && (
              <motion.div
                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100"
                initial={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  size="sm"
                  className="rounded-full h-10 w-10 p-0 shadow-xl bg-primary hover:bg-primary/90 ripple-container"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateQuantity(cartQuantity + 1);
                  }}
                >
                  <ShoppingCart className="h-4 w-4 text-white" />
                </Button>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {category}
              </p>
              <div className="my-2">
                <h4 className="text-lg font-bold text-gray-900 capitalize line-clamp-2">{name}</h4>
                {/* Display the Tamil name directly underneath in a muted, clean localized font style 🎯 */}
                {T_name && <p className="text-sm font-medium text-emerald-600 truncate">{T_name}</p>}
              </div>

              {category === "Garlands" && (
                <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Pre-order only (24 hrs advance)
                </p>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-muted-foreground ml-1">
                {rating} ({reviews})
              </span>
            </div>

            {category === "Garlands" && showPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-xs font-medium flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Delivery Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </motion.div>
            )}

            {/* Dynamic Size Selector */}
            {category !== "Garlands" && dynamicSizes.length > 0 && (
              <div className="pt-1">
                <select 
                  value={selectedSize} 
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full text-xs font-medium border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-primary outline-none bg-gray-50/50"
                >
                  {dynamicSizes.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity Stepper Controller Interface Layout 🎯 */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-gray-950">
                  ₹{totalDisplayPrice.toFixed(2)}
                </span>
                {originalPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    ₹{adjustedMRPPerItem.toFixed(2)}
                  </span>
                )}
              </div>

              {category === "Garlands" ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={justAdded ? "added" : "normal"}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: justAdded ? [1, 1.2, 1] : 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Button
                      size="sm"
                      disabled={!inStock}
                      className="rounded-full shadow-md ripple-container text-xs px-3"
                      onClick={() => setShowPicker(true)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                      {justAdded ? "Added!" : "Select Date"}
                    </Button>
                  </motion.div>
                </AnimatePresence>
              ) : cartQuantity === 0 ? (
                <button 
                  onClick={() => handleUpdateQuantity(1)}
                  disabled={!inStock}
                  className="flex items-center justify-center w-10 h-10 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl font-light leading-none mb-0.5">+</span>
                </button>
              ) : (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center justify-center w-10 h-10 bg-emerald-50 border-2 border-emerald-500 text-emerald-700 rounded-full font-extrabold hover:bg-emerald-100 transition-all shadow-md shadow-emerald-500/20"
                >
                  {cartQuantity}
                </button>
              )}
            </div>

            {category === "Garlands" && showPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Button
                  size="sm"
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500 shadow-lg ripple-container mt-3"
                  onClick={() => handleUpdateQuantity(1)}
                >
                  Confirm Pre-Order
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
         setIsModalOpen(open);
         if (!open) setTimeout(() => setIsImageExpanded(false), 300);
      }}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-[420px] border-0 rounded-t-[2rem] sm:rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl [&>button]:bg-white/80 [&>button]:p-1.5 [&>button]:rounded-full [&>button]:top-3 [&>button]:right-3">
          {/* Modal Header Image */}
          <div 
             className={`relative w-full cursor-pointer transition-all duration-300 bg-stone-100 dark:bg-stone-900 ${isImageExpanded ? 'min-h-[300px] h-auto max-h-[70vh]' : 'h-64'}`}
             onClick={() => setIsImageExpanded(!isImageExpanded)}
          >
            <img
              src={image}
              alt={name}
              className={`w-full transition-all duration-300 ${isImageExpanded ? 'h-auto object-contain max-h-[70vh]' : 'h-full object-cover'}`}
            />
          </div>

          <div className="p-6 space-y-6">
            {/* Title & Category */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{name}</h2>
              {T_name && <p className="text-sm font-bold text-emerald-600 mt-1">{T_name}</p>}
              <p className="text-xs uppercase tracking-wider text-muted-foreground mt-2 font-bold">
                {category}
              </p>
            </div>

            {/* Price & Quantity Controls */}
            <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
               <div className="flex items-center gap-4">
                  {cartQuantity === 0 ? (
                    <span className="text-sm font-bold text-stone-500">Not in cart</span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStepChange(-1); }}
                        className="w-8 h-8 flex items-center justify-center bg-white dark:bg-stone-800 rounded-full shadow-sm text-lg font-bold hover:bg-stone-100 border border-stone-200 dark:border-stone-700"
                      >
                        −
                      </button>
                      <span className="font-bold w-6 text-center">{cartQuantity}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleStepChange(1); }}
                        className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 rounded-full shadow-sm text-lg font-bold hover:bg-emerald-200 border border-emerald-200 dark:border-emerald-800"
                      >
                        +
                      </button>
                    </div>
                  )}
               </div>
               <div className="text-right">
                  <span className="block text-2xl font-black text-emerald-600">
                    ₹{totalDisplayPrice.toFixed(2)}
                  </span>
                  {originalPrice && (
                    <span className="block text-xs text-muted-foreground line-through">
                      ₹{adjustedMRPPerItem.toFixed(2)}
                    </span>
                  )}
               </div>
            </div>

            {/* Size Selector */}
            {category !== "Garlands" && dynamicSizes.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-bold">Select Size / Unit</label>
                <div className="grid grid-cols-3 gap-2">
                  {dynamicSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border-2 transition-all ${
                        selectedSize === size
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-600"
                          : "border-stone-200 bg-white text-stone-600 hover:border-emerald-200 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Garlands Date Picker */}
            {category === "Garlands" && (
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-orange-500" />
                  Delivery Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all outline-none"
                />
                <p className="text-xs text-orange-600 font-medium">
                  Pre-order only (24 hrs advance required)
                </p>
              </div>
            )}

            {/* Add to Cart Footer Button */}
            <Button 
               className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 text-lg font-bold shadow-xl shadow-emerald-600/20"
               onClick={() => {
                  if (cartQuantity === 0) {
                     handleUpdateQuantity(1);
                  } else {
                     setIsModalOpen(false);
                  }
               }}
            >
               {cartQuantity === 0 ? `Add to Cart (₹${totalDisplayPrice.toFixed(2)})` : "Done"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ProductCard;
