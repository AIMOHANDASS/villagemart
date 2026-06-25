import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { API_BASE_URL } from "../api";

// URL for socket (remove /api from BASE_URL)
const SOCKET_URL = API_BASE_URL.replace("/api", "");

const OtpPopup: React.FC<{ userId?: number }> = ({ userId }) => {
  const [activeOtp, setActiveOtp] = useState<{ otp: string; bookingId: number; message: string } | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("📡 Socket connected for OTP monitoring");
      socket.emit("join", userId);
    });

    socket.on("new_otp", (data) => {
      console.log("🔐 New OTP Received via Socket:", data);
      setActiveOtp(data);
      
      // Optional: Play a subtle notification sound
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play();
      } catch (e) {
        console.warn("Audio playback failed", e);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  if (!activeOtp) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-24 left-4 right-4 z-[9999]"
      >
        <div className="bg-white dark:bg-card border-2 border-amber-500 rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 rounded-full opacity-50" />
          
          <button 
            onClick={() => setActiveOtp(null)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-amber-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Ride OTP</h3>
              <p className="text-xs text-gray-500 mt-1">Share this with the driver upon arrival</p>
            </div>

            <div className="flex gap-2 justify-center">
              {activeOtp.otp.split("").map((digit, i) => (
                <div 
                  key={i} 
                  className="w-10 h-12 bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl flex items-center justify-center text-2xl font-black text-amber-600"
                >
                  {digit}
                </div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveOtp(null)}
              className="w-full py-3 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-100"
            >
              Okay, Got it!
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OtpPopup;
