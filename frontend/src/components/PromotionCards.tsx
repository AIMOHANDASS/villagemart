import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import promoVegetables from "@/assets/promo-vegetables.png";
import promoVillage from "@/assets/promo-village.png";
import promoFestival from "@/assets/promo-festival.png";

interface PromoCard {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  image: string;
  gradient: string;
  textColor: string;
}

const promos: PromoCard[] = [
  {
    id: 1,
    title: "Fresh Vegetables",
    subtitle: "Starting from ₹10",
    cta: "Shop Now",
    link: "/products?category=Vegetables",
    image: promoVegetables,
    gradient: "from-emerald-500 to-teal-600",
    textColor: "text-white",
  },
  {
    id: 2,
    title: "Village Special",
    subtitle: "Authentic local products",
    cta: "Explore",
    link: "/products?category=Groceries",
    image: promoVillage,
    gradient: "from-amber-500 to-orange-600",
    textColor: "text-white",
  },
  {
    id: 3,
    title: "Festival Combo",
    subtitle: "Garlands & Flowers",
    cta: "Order Now",
    link: "/products?category=Garlands",
    image: promoFestival,
    gradient: "from-purple-500 to-pink-600",
    textColor: "text-white",
  },
];

const PromotionCards: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="promotion-cards" className="py-5 sm:py-8">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {promos.map((promo, idx) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.45 }}
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(promo.link)}
              className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${promo.gradient} cursor-pointer group shadow-lg hover:shadow-2xl transition-shadow duration-300`}
            >
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute bottom-0 -left-6 w-20 h-20 rounded-full bg-white/10" />

              <div className="relative flex items-center p-4 sm:p-5 min-h-[130px] sm:min-h-[160px]">
                {/* Text Content */}
                <div className="flex-1 z-10">
                  <h3
                    className={`text-base sm:text-lg font-bold ${promo.textColor} leading-snug`}
                  >
                    {promo.title}
                  </h3>
                  <p className={`text-xs sm:text-sm ${promo.textColor}/80 mt-1`}>
                    {promo.subtitle}
                  </p>
                  <motion.button
                    whileHover={{ x: 3 }}
                    className={`mt-3 text-xs sm:text-sm font-semibold ${promo.textColor} flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl hover:bg-white/30 transition-colors ripple-container`}
                  >
                    {promo.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </motion.button>
                </div>

                {/* Image */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 ml-2">
                  <img
                    src={promo.image}
                    alt={promo.title}
                    className="w-full h-full object-cover rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromotionCards;
