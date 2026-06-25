import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import bannerVegetables from "@/assets/banner-vegetables.png";
import bannerFruits from "@/assets/banner-fruits.png";
import bannerGarlands from "@/assets/banner-garlands.png";
import bannerEssentials from "@/assets/banner-essentials.png";

interface BannerSlide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  gradient: string;
}

const slides: BannerSlide[] = [
  {
    id: 1,
    image: bannerVegetables,
    title: "Fresh Vegetables",
    subtitle: "Starting from ₹10 • Farm to doorstep",
    cta: "Shop Now",
    link: "/products?category=Vegetables",
    gradient: "from-emerald-900/80 via-emerald-800/50 to-transparent",
  },
  {
    id: 2,
    image: bannerFruits,
    title: "Seasonal Fruits",
    subtitle: "Up to 30% OFF • Freshly picked",
    cta: "Explore Fruits",
    link: "/products?category=Fruits",
    gradient: "from-amber-900/80 via-amber-800/50 to-transparent",
  },
  {
    id: 3,
    image: bannerGarlands,
    title: "Village Special Garlands",
    subtitle: "Festival Ready • Handmade with love",
    cta: "Order Now",
    link: "/products?category=Garlands",
    gradient: "from-purple-900/80 via-purple-800/50 to-transparent",
  },
  {
    id: 4,
    image: bannerEssentials,
    title: "Festival Combo Packs",
    subtitle: "Save Big on Daily Essentials",
    cta: "View Offers",
    link: "/products?category=Groceries",
    gradient: "from-red-900/80 via-red-800/50 to-transparent",
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

const HeroBanner: React.FC = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentSlide ? 1 : -1);
      setCurrentSlide(index);
    },
    [currentSlide]
  );

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  // Auto-advance every 3.5 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 3500);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) nextSlide();
    else if (diff < -threshold) prevSlide();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const slide = slides[currentSlide];

  return (
    <section
      id="hero-banner"
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Container */}
      <div className="relative w-full h-[220px] sm:h-[300px] md:h-[380px] lg:h-[420px] mx-auto px-2 sm:px-4 pt-2 sm:pt-3">
        <div className="relative w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={slide.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.3 },
              }}
              className="absolute inset-0"
            >
              {/* Background Image */}
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Gradient Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`}
              />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-16">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-white text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight drop-shadow-lg"
                >
                  {slide.title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="text-white/90 text-sm sm:text-base md:text-lg mt-2 max-w-md drop-shadow-md"
                >
                  {slide.subtitle}
                </motion.p>
                <motion.button
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(slide.link)}
                  className="mt-4 sm:mt-5 w-fit px-6 py-2.5 sm:px-8 sm:py-3 bg-white text-gray-900 font-semibold rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base ripple-container"
                >
                  {slide.cta} →
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Left / Right Arrows (desktop) */}
          <button
            onClick={prevSlide}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all shadow-lg"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={nextSlide}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all shadow-lg"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className="relative"
                aria-label={`Go to slide ${idx + 1}`}
              >
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    idx === currentSlide
                      ? "w-7 bg-white shadow-md"
                      : "w-2 bg-white/50 hover:bg-white/70"
                  }`}
                />
                {/* Progress bar inside active dot */}
                {idx === currentSlide && !isPaused && (
                  <motion.div
                    className="absolute inset-0 h-2 rounded-full bg-white/60"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3.5, ease: "linear" }}
                    key={`progress-${currentSlide}`}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
