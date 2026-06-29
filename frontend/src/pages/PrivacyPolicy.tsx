import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy: React.FC = () => {
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
            Privacy Policy
          </motion.h1>
          <p className="text-emerald-50">Last updated: June 2026</p>
        </div>

        {/* Content */}
        <div className="p-8 prose prose-emerald dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
          <p className="lead text-lg font-medium text-gray-800 dark:text-gray-200">
            At VillageMart, your privacy is our priority. This Privacy Policy explains how we collect, use, and protect your personal information when you use our mobile application and website.
          </p>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">1.</span> Data Collection & Usage
          </h2>
          <p>
            We collect the information you provide directly to us when creating an account, placing an order, or contacting support. This includes:
          </p>
          <ul className="list-disc pl-5 mb-6 space-y-2">
            <li><strong>Identity Data:</strong> Name, phone number, and email address (for order confirmation and Google Authentication).</li>
            <li><strong>Location Data:</strong> Delivery addresses and GPS location (used strictly to route your deliveries efficiently to local villages).</li>
            <li><strong>Transaction Data:</strong> Order history and cart interactions. <em>Note: Payment processing is securely handled by Razorpay; we do not store your UPI or bank details.</em></li>
          </ul>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">2.</span> Google Auth Protocol
          </h2>
          <p>
            Our application utilizes Google Identity Services to provide a seamless login experience. By selecting "Sign in with Google", you authorize VillageMart to access your standard Google profile data (Name and Email). 
          </p>
          <p>
            We strictly use this data to provision your account and map your order history. We <strong>never</strong> access your Google Contacts, Drive, or any other restricted scopes.
          </p>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">3.</span> Device Permissions
          </h2>
          <p>
            For the Android App to function optimally, we request the following native permissions:
          </p>
          <ul className="list-disc pl-5 mb-6 space-y-2">
            <li><strong>Location (Fine/Coarse):</strong> Required exclusively during the checkout or transport tracking phases.</li>
            <li><strong>Notifications:</strong> Used to alert you of incoming deliveries, order status changes, or secure OTP codes.</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-4 flex items-center gap-2">
            <span className="text-primary text-2xl">4.</span> Data Security & Retention
          </h2>
          <p>
            Your data is encrypted using industry-standard TLS protocols during transit to our cloud infrastructure. We retain your account data for as long as your account is active. You may request complete deletion of your account and associated data at any time by contacting our support team.
          </p>

          <div className="mt-12 p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-400 mb-2">Contact Us</h3>
            <p className="text-sm">
              If you have any questions or concerns about this Privacy Policy or our data handling practices, please contact us at: <br/>
              <strong>villagemartservices@gmail.com</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
