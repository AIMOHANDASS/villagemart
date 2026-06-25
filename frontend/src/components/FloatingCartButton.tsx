import React, { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Floating sticky cart button for mobile — appears when cart has items.
 * Shows on all pages except /cart and /checkout.
 * UI-only; reads cart from localStorage.
 */
const FloatingCartButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartCount, setCartCount] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const updateCart = () => {
    try {
      const raw = localStorage.getItem("cart");
      const cart: any[] = raw ? JSON.parse(raw) : [];
      setCartCount(cart.length);
      setTotalPrice(
        cart.reduce(
          (sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1),
          0
        )
      );
    } catch {
      setCartCount(0);
      setTotalPrice(0);
    }
  };

  useEffect(() => {
    updateCart();
    window.addEventListener("storage", updateCart);
    const interval = setInterval(updateCart, 3000);
    return () => {
      window.removeEventListener("storage", updateCart);
      clearInterval(interval);
    };
  }, []);

  // Hide on cart/checkout pages and desktop
  const hiddenPaths = ["/cart", "/checkout"];
  const isHidden = hiddenPaths.includes(location.pathname);

  if (isHidden || cartCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/cart")}
        className="fixed bottom-[72px] left-4 right-4 z-40 md:hidden flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary to-emerald-600 text-white rounded-2xl shadow-2xl shadow-primary/40 ripple-container"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 3 }}
          >
            <ShoppingCart className="h-5 w-5" />
          </motion.div>
          <div className="text-left">
            <span className="text-xs font-medium opacity-90">
              {cartCount} {cartCount === 1 ? "item" : "items"}
            </span>
            <span className="text-sm font-bold block leading-tight">
              ₹{totalPrice.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">View Cart</span>
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            →
          </motion.span>
        </div>
      </motion.button>
    </AnimatePresence>
  );
};

export default FloatingCartButton;
