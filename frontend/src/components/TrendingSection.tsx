import React, { useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, TrendingUp, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import tomatoesImg from "@/assets/tomatoes.jpg";
import jasmineGarlandImg from "@/assets/jasmine-garland.jpg";
import bananasImg from "@/assets/bananas.jpg";
import marigoldGarlandImg from "@/assets/marigold-garland.jpg";
import carrotsImg from "@/assets/carrots.jpg";
import roseGarlandImg from "@/assets/rose-garland.jpg";

interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: string;
}

const trendingProducts: TrendingProduct[] = [
  {
    id: "t1",
    name: "Fresh Tomatoes",
    price: 45,
    originalPrice: 60,
    image: tomatoesImg,
    rating: 4.5,
    reviews: 124,
    badge: "Bestseller",
  },
  {
    id: "t2",
    name: "Jasmine Garland",
    price: 250,
    originalPrice: 300,
    image: jasmineGarlandImg,
    rating: 4.8,
    reviews: 89,
    badge: "Popular",
  },
  {
    id: "t3",
    name: "Fresh Bananas",
    price: 35,
    image: bananasImg,
    rating: 4.3,
    reviews: 67,
  },
  {
    id: "t4",
    name: "Marigold Garland",
    price: 120,
    originalPrice: 150,
    image: marigoldGarlandImg,
    rating: 4.6,
    reviews: 45,
    badge: "Festival",
  },
  {
    id: "t5",
    name: "Fresh Carrots",
    price: 30,
    originalPrice: 42,
    image: carrotsImg,
    rating: 4.4,
    reviews: 56,
  },
  {
    id: "t6",
    name: "Rose Garland",
    price: 350,
    originalPrice: 450,
    image: roseGarlandImg,
    rating: 4.9,
    reviews: 32,
    badge: "Premium",
  },
];

const badgeColors: Record<string, string> = {
  Bestseller: "bg-emerald-500",
  Popular: "bg-blue-500",
  Festival: "bg-purple-500",
  Premium: "bg-amber-500",
};

const TrendingSection: React.FC = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -260 : 260;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section id="trending-products" className="py-5 sm:py-8 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="container px-4 mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-4 sm:mb-6"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold text-foreground">
                Trending Products
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Popular in your area
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Scroll trending left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Scroll trending right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs hidden sm:flex"
                onClick={() => navigate("/products")}
              >
                View All
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Horizontal Scroll Cards */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {trendingProducts.map((product, idx) => {
            const discount = product.originalPrice
              ? Math.round(
                  ((product.originalPrice - product.price) / product.originalPrice) * 100
                )
              : 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.07, duration: 0.35 }}
                whileHover={{ scale: 1.04, y: -5 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0 w-[170px] sm:w-[210px] bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-gray-100 dark:border-gray-800 transition-all duration-300 cursor-pointer group"
                onClick={() => navigate("/products")}
              >
                {/* Image */}
                <div className="relative overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-32 sm:h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Discount Badge */}
                  {discount > 0 && (
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1.5 py-0 rounded-md shadow-md">
                      {discount}% OFF
                    </Badge>
                  )}

                  {/* Type Badge */}
                  {product.badge && (
                    <Badge
                      className={`absolute top-2 right-2 ${
                        badgeColors[product.badge] || "bg-gray-500"
                      } text-white text-[10px] px-1.5 py-0 rounded-md shadow-md`}
                    >
                      {product.badge}
                    </Badge>
                  )}

                  {/* Hover Add Button */}
                  <motion.div
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100"
                    initial={{ scale: 0.8 }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button className="w-8 h-8 bg-primary text-white rounded-full shadow-lg flex items-center justify-center ripple-container">
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                </div>

                {/* Content */}
                <div className="p-3 space-y-1.5">
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                    {product.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {product.rating} ({product.reviews})
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm sm:text-base font-bold text-primary">
                      ₹{product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                        ₹{product.originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile View All */}
        <div className="sm:hidden mt-4 text-center">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              className="w-full rounded-xl text-sm"
              onClick={() => navigate("/products")}
            >
              View All Products
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;
