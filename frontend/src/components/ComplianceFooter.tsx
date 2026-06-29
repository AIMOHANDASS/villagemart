import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const ComplianceFooter: React.FC = () => {
  return (
    <motion.div
      className="text-center mt-5 text-xs text-gray-500 dark:text-gray-400"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.62 }}
    >
      By continuing, you agree to our Terms of Service and acknowledge our{" "}
      <Link to="/privacy" className="text-primary hover:underline font-medium">
        Privacy Policy
      </Link>.
    </motion.div>
  );
};

export default ComplianceFooter;
