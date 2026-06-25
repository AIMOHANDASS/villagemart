import { motion } from "framer-motion";
import HeroBanner from "./HeroBanner";

const HeroSection = () => {
  return (
    <>
      {/* ================= HERO BANNER CAROUSEL ================= */}
      <HeroBanner />

      {/* ================= SEO TEXT SECTION ================= */}
      <motion.section
        className="max-w-5xl mx-auto px-4 py-10 text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold mb-4">
          VillageMart – Online Grocery Store for Fresh Vegetables, Fruits & Groceries
        </h2>

        <p className="text-gray-600 dark:text-gray-400 leading-7">
          VillageMart is a trusted online grocery delivery platform serving villages and rural communities.
          Order fresh vegetables, seasonal fruits, daily groceries, flowers and garlands directly from local farmers and vendors.
          We provide fast doorstep delivery with secure UPI payment options like GPay, PhonePe and Paytm.
        </p>

        <p className="mt-4 text-gray-600 dark:text-gray-400 leading-7">
          Looking for fresh vegetables near you? Buy groceries online at affordable prices with guaranteed quality.
          VillageMart connects villages digitally for easy shopping and better livelihoods.
        </p>
      </motion.section>
    </>
  );
};

export default HeroSection;
