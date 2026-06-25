import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Clock, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import tomatoesImg from "@/assets/tomatoes.jpg";
import bananasImg from "@/assets/bananas.jpg";
import carrotsImg from "@/assets/carrots.jpg";

interface FlashProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  sold: number;
  total: number;
}

const flashProducts: FlashProduct[] = [
  {
    id: "f1",
    name: "Fresh Tomatoes",
    price: 25,
    originalPrice: 60,
    image: tomatoesImg,
    sold: 78,
    total: 100,
  },
  {
    id: "f2",
    name: "Organic Bananas",
    price: 20,
    originalPrice: 45,
    image: bananasImg,
    sold: 55,
    total: 80,
  },
  {
    id: "f3",
    name: "Fresh Carrots",
    price: 18,
    originalPrice: 40,
    image: carrotsImg,
    sold: 42,
    total: 60,
  },
];

// Countdown hook (4 hours from now, resets on mount)
const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const end = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
    return { end, h: 4, m: 0, s: 0 };
  });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, timeLeft.end - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft((prev) => ({ ...prev, h, m, s }));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [timeLeft.end]);

  return timeLeft;
};

const FlashDealSection: React.FC = () => {
  const navigate = useNavigate();
  const { h, m, s } = useCountdown();

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <section
      id="flash-deals"
      className="py-5 sm:py-8"
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
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30"
            >
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </motion.div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
                Flash Deals
                <motion.span
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-xs sm:text-sm bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold"
                >
                  LIVE
                </motion.span>
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Deals end soon!
              </p>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-red-500 hidden sm:block" />
            {[pad(h), pad(m), pad(s)].map((unit, i) => (
              <React.Fragment key={i}>
                <motion.span
                  key={`${unit}-${i}`}
                  initial={{ scale: 0.9, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold font-mono shadow-md"
                >
                  {unit}
                </motion.span>
                {i < 2 && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-xs sm:text-sm font-bold text-gray-400"
                  >
                    :
                  </motion.span>
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Flash Products Scroll */}
        <div
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {flashProducts.map((product, idx) => {
            const discount = Math.round(
              ((product.originalPrice - product.price) / product.originalPrice) * 100
            );
            const soldPercent = Math.round((product.sold / product.total) * 100);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.35 }}
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0 w-[160px] sm:w-[200px] bg-card rounded-2xl border border-red-100 dark:border-red-900/30 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => navigate("/products")}
              >
                {/* Image */}
                <div className="relative overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-28 sm:h-36 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Discount badge */}
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5"
                  >
                    🔥 {discount}% OFF
                  </motion.div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                    {product.name}
                  </h3>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm sm:text-base font-bold text-red-600">
                      ₹{product.price}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                      ₹{product.originalPrice}
                    </span>
                  </div>

                  {/* Sold Progress Bar */}
                  <div>
                    <div className="w-full h-1.5 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${soldPercent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                      />
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
                      {product.sold}/{product.total} sold
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FlashDealSection;
