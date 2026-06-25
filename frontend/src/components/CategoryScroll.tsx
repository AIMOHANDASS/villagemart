import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Category {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  count: string;
}

const categories: Category[] = [
  { name: "Groceries", icon: "🥦", color: "#16A34A", bgColor: "bg-emerald-50 dark:bg-emerald-900/20", count: "150+" },
  { name: "Vegetables", icon: "🥕", color: "#EA580C", bgColor: "bg-orange-50 dark:bg-orange-900/20", count: "120+" },
  { name: "Fruits", icon: "🍎", color: "#DC2626", bgColor: "bg-red-50 dark:bg-red-900/20", count: "85+" },
  { name: "Dairy", icon: "🥛", color: "#2563EB", bgColor: "bg-blue-50 dark:bg-blue-900/20", count: "35+" },
  { name: "Garlands", icon: "🌸", color: "#DB2777", bgColor: "bg-pink-50 dark:bg-pink-900/20", count: "50+" },
  { name: "Grains", icon: "🌾", color: "#D97706", bgColor: "bg-amber-50 dark:bg-amber-900/20", count: "25+" },
];

const CategoryScroll: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -200 : 200;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section id="category-scroll" className="py-5 sm:py-8 bg-white dark:bg-card/50">
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <motion.div
          className="flex items-center justify-between mb-4 sm:mb-6"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              Shop by Category
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Find what you need
            </p>
          </div>

          {/* Scroll Arrows (desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((cat, idx) => (
            <motion.button
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.07, duration: 0.35 }}
              whileHover={{ scale: 1.08, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/products?category=${cat.name}`)}
              className={`shrink-0 flex flex-col items-center gap-2 sm:gap-2.5 w-[80px] sm:w-[100px] py-3 sm:py-4 rounded-2xl ${cat.bgColor} border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300 cursor-pointer group`}
            >
              <motion.span
                className="text-3xl sm:text-4xl select-none"
                whileHover={{ scale: 1.25, rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
              >
                {cat.icon}
              </motion.span>
              <span className="text-[11px] sm:text-xs font-semibold text-foreground">
                {cat.name}
              </span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                {cat.count}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryScroll;
