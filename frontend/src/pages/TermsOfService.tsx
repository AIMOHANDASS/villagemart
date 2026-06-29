import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-emerald-600 px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="absolute top-6 left-6 text-white/80 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium bg-black/10 px-3 py-1.5 rounded-full"
          >
            ← Back
          </button>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold mt-8 mb-2"
          >
            Terms of Service
          </motion.h1>
          <p className="text-emerald-50">Last updated: June 2026</p>
        </div>

        {/* Content */}
        <div className="p-8 prose prose-emerald dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
          <p className="lead text-lg font-medium text-gray-800 dark:text-gray-200">
            Welcome to VillageMart. By using our application, you agree to be bound by the following terms and conditions.
          </p>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">1.</span> Acceptance of Terms
          </h2>
          <p>
            By accessing or using the VillageMart application and related services (including consumer, transport, and delivery modules), you agree to comply with these terms. If you do not agree to these terms, please do not use the application.
          </p>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">2.</span> User Accounts
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">3.</span> Acceptable Use
          </h2>
          <p>
            You agree to use our application for lawful purposes only and in a manner consistent with any applicable laws and regulations. You must not attempt to breach security or disrupt the integrity of the application.
          </p>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">4.</span> Limitations of Liability
          </h2>
          <p>
            VillageMart will not be liable for any indirect, incidental, or consequential damages arising from the use of our services, except as provided by law. Our liability is limited to the fullest extent permitted by applicable law.
          </p>

          <div className="mt-12 p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-400 mb-2">Contact Us</h3>
            <p className="text-sm">
              If you have any questions or concerns about these Terms of Service, please contact us at: <br/>
              <strong>villagemartservices@gmail.com</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
