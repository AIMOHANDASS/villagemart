import React from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Delivery location bar — shows a compact location indicator below the header.
 * UI-only component; does not modify any backend or API.
 */
const DeliveryLocationBar: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-gradient-to-r from-primary/5 via-emerald-50 to-primary/5 dark:from-primary/10 dark:via-emerald-950/20 dark:to-primary/10 border-b border-primary/10"
    >
      <div className="container mx-auto px-4 py-1.5 sm:py-2 flex items-center justify-between">
        {/* Location */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </motion.div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Deliver to
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-foreground">
              Karur, Tamil Nadu
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Delivery time indicator */}
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Delivering Now
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default DeliveryLocationBar;
