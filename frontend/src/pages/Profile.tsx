import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import FreeLocationPicker from "../components/FreeLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Pencil, Save, X, Lock, ChevronDown, ChevronUp, Camera as CameraIcon, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase'; 

export const validateProfileStatus = (user: any): boolean => {
  if (!user) return false;
  const { name, phone, address, latitude, longitude } = user;
  
  const nameValid = typeof name === 'string' && name.trim().length > 2;
  const cleanPhone = String(user.phone || '').replace(/^\+91|^91|\s+/g, '');
  const phoneRegex = /^[6-9]\d{9}$/;
  const isRepeating = /^(.)\1{9}$/.test(cleanPhone);
  const isSequential = cleanPhone === "1234567890" || cleanPhone === "0123456789" || cleanPhone === "0987654321" || cleanPhone === "9876543210";
  const phoneValid = phoneRegex.test(cleanPhone) && !isRepeating && !isSequential;
  
  const addressValid = typeof address === 'string' && address.trim().length > 10;
  
  // Checking coordinates - just making sure they are valid numbers if they exist,
  // but if location is strict we can check !== 0
  const latValid = latitude !== undefined && latitude !== null && !isNaN(Number(latitude)) && Number(latitude) !== 0;
  const lngValid = longitude !== undefined && longitude !== null && !isNaN(Number(longitude)) && Number(longitude) !== 0;

  return !!(nameValid && phoneValid && addressValid && latValid && lngValid);
};

/* ================= PASSWORD ================= */
const isStrongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

/* ================= PROFILE COMPLETION ================= */
const calcCompletion = (u: any) => {
  const hasName = !!u.name?.trim();
  const hasUsername = !!u.username?.trim();
  const hasEmail = !!u.email?.trim();
  const hasPhone = !!u.phone?.trim();
  const hasAddress = !!u.address?.trim();

  if (hasName && hasUsername && hasEmail && hasPhone && hasAddress) {
    return 100;
  }

  let s = 0;
  if (u.profile_image) s += 10;
  if (hasName) s += 20;
  if (hasUsername) s += 10;
  if (hasEmail) s += 20;
  if (hasPhone) s += 20;
  if (hasAddress) s += 20;
  return Math.min(100, s);
};

/* ================= NEON PROGRESS RING (ANIMATED) ================= */
const NeonProgressRing = ({ percentage, image, onImageClick, editing }: any) => {
  const size = 150;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(circumference - (percentage / 100) * circumference);
    }, 300);
    return () => clearTimeout(t);
  }, [percentage, circumference]);

  return (
    <motion.div
      className="relative w-[150px] h-[150px] mx-auto cursor-pointer group"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      onClick={editing ? onImageClick : undefined}
    >
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={stroke}
          fill="transparent"
        />
        {/* Neon Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#34d399" // Tailwind Emerald-400
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      <div className="absolute inset-2 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-white">
        <img
          src={image || "https://api.dicebear.com/7.x/personas/svg?seed=user"}
          className="w-full h-full object-cover"
          alt="Profile"
        />
        {editing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <CameraIcon className="text-white w-8 h-8" />
          </div>
        )}
      </div>
    </motion.div>
  );
};


const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/* ================= MAIN PROFILE ================= */
interface ProfileProps {
  user?: any;
}

export default function Profile({ user }: ProfileProps) {
  const stored = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({});
  const [editing, setEditing] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [showPwd, setShowPwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  /* FETCH PROFILE */
  useEffect(() => {
    fetch(`${API_BASE_URL}/profile/${stored.id}`)
      .then((r) => r.json())
      .then((d) => {
        setForm(d);
        setCompletion(calcCompletion(d));
      });
  }, [stored.id]);

  /* IMAGE CAPTURE AND UPLOAD */
  const handleImageCapture = async () => {
    if (!editing) return;
    
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos, // User can pick from gallery or take a photo
      });

      if (image.webPath) {
        setIsUploading(true);
        toast.loading("Uploading image...", { id: "img-upload" });

        // Convert webPath to blob
        const response = await fetch(image.webPath);
        const blob = await response.blob();

        // Create Firebase Storage reference
        const storageRef = ref(storage, `profile_pictures/${stored.id}.jpg`);
        
        // Upload to Firebase Storage
        await uploadBytes(storageRef, blob);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update local state immediately
        const newForm = { ...form, profile_image: downloadURL };
        setForm(newForm);
        setCompletion(calcCompletion(newForm));
        
        // Note: The new URL will be saved to MySQL when the user clicks "Save Changes"
        // Or we could auto-save it right here:
        await fetch(`${API_BASE_URL}/profile/${stored.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newForm),
        });

        toast.success("Profile photo updated!", { id: "img-upload" });
      }
    } catch (error) {
      console.error("Image capture/upload error:", error);
      toast.error("Failed to update profile photo", { id: "img-upload" });
    } finally {
      setIsUploading(false);
    }
  };

  const saveProfile = async () => {
    const phoneStr = (form.phone || '').toString().trim();
    const cleanPhone = phoneStr.replace(/^\+91|^91|\s+/g, '');
    const phoneRegex = /^[6-9]\d{9}$/;
    const isRepeating = /^(.)\1{9}$/.test(cleanPhone);
    const isSequential = cleanPhone === "1234567890" || cleanPhone === "0123456789" || cleanPhone === "0987654321" || cleanPhone === "9876543210";
    
    if (!phoneRegex.test(cleanPhone) || isRepeating || isSequential) {
      toast.error("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    await fetch(`${API_BASE_URL}/profile/${stored.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    setCompletion(calcCompletion(form));
    
    // Update local storage user data to keep it in sync
    const updatedUser = { ...stored, ...form };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("cached_user_phone", updatedUser.phone || "");
    
    toast.success("Profile updated successfully!");
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const changePassword = async () => {
    if (!isStrongPassword(newPassword)) {
      toast.error("Password is too weak");
      return;
    }

    await fetch(`${API_BASE_URL}/profile/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: stored.id,
        currentPassword,
        newPassword,
      }),
    });
    setShowPwd(false);
    toast.success("Password changed successfully!");
  };

  const profileIsComplete = validateProfileStatus(form);

  return (
    <motion.div
      className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >
      {/* ================= DYNAMIC SYSTEM NOTIFICATION ================= */}
      {!profileIsComplete && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="text-amber-500 text-xl">⚠️</span>
            <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
              Delivery details incomplete! Please fill out all fields to unlock ordering features.
            </p>
          </div>
        </motion.div>
      )}

      {/* ================= BANNER HEADER ================= */}
      <motion.div
        className="
          relative
          rounded-3xl
          overflow-hidden
          bg-[#064e3b] dark:bg-[#022c22] 
          p-8
          text-center
          text-white
          shadow-xl
        "
        style={{
          backgroundImage: "linear-gradient(to right bottom, rgba(16, 185, 129, 0.9), rgba(6, 78, 59, 0.95))",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        {/* Soft Organic Background Patterns */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-400/20 rounded-full mix-blend-overlay blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-300/20 rounded-full mix-blend-overlay blur-xl pointer-events-none" />

        <div className="flex flex-col items-center gap-4 relative z-10">
          <NeonProgressRing 
            percentage={completion} 
            image={form.profile_image} 
            onImageClick={handleImageCapture}
            editing={editing}
          />

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {form.name || "Your Name"}
            </h2>
            <p className="text-emerald-100/80 text-sm mt-1 font-medium">@{form.username || "username"}</p>
          </div>

          <div className="flex items-center gap-2 bg-black/20 px-5 py-2 rounded-full backdrop-blur-md border border-white/10">
            <div className={`w-2 h-2 rounded-full ${profileIsComplete ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'} animate-pulse`} />
            <p className="text-sm font-semibold tracking-wide text-emerald-50">
              Profile completion • {completion}%
            </p>
          </div>
          
          {editing && (
            <p className="text-xs text-emerald-100/70 mt-2">Tap image to update profile photo</p>
          )}
        </div>
      </motion.div>

      {/* ================= PROFILE FORM ================= */}
      <motion.div
        className="bg-[#fcfdfa] dark:bg-gray-800 border border-emerald-100/50 dark:border-gray-700 rounded-3xl p-6 md:p-8 space-y-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-xl text-emerald-900 dark:text-emerald-50">Personal Info</h3>
          {!editing && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {["name", "username", "email", "phone"].map((f, index) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <label className="text-[11px] font-bold text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-widest mb-1.5 block">
                {f}
              </label>
              <Input
                disabled={!editing || f === "email"}
                value={form[f] || ""}
                placeholder={f}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                className="rounded-xl border-gray-200 bg-white/50 focus:bg-white dark:bg-gray-900/50 dark:border-gray-700 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
              />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="pt-2"
        >
          <label className="text-[11px] font-bold text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-widest mb-1.5 block">
            Address
          </label>
          <Input
            disabled={!editing}
            value={form.address || ""}
            placeholder="Address"
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded-xl border-gray-200 bg-white/50 focus:bg-white dark:bg-gray-900/50 dark:border-gray-700 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </motion.div>

        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden rounded-2xl border border-emerald-100 dark:border-gray-700"
          >
            <FreeLocationPicker
              onSelect={(loc) =>
                setForm({
                  ...form,
                  address: loc.address,
                  latitude: loc.lat,
                  longitude: loc.lng,
                })
              }
            />
          </motion.div>
        )}

        {editing && (
          <motion.div
            className="flex flex-col sm:flex-row gap-3 pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button onClick={saveProfile} className="w-full rounded-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 py-6 text-base font-semibold">
                <Save className="h-5 w-5" />
                Save Changes
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1 sm:flex-none sm:w-1/3">
              <Button variant="outline" onClick={() => setEditing(false)} className="w-full rounded-full gap-2 py-6 text-base font-medium border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>



      {/* ================= PASSWORD ================= */}
      <motion.div
        className="bg-[#fcfdfa] dark:bg-gray-800 border border-emerald-100/50 dark:border-gray-700 rounded-3xl p-6 md:p-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            variant="ghost"
            onClick={() => setShowPwd(!showPwd)}
            className="w-full rounded-2xl gap-2 justify-between py-6 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center gap-3 font-semibold text-base">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
                <Lock className="h-5 w-5" />
              </div>
              Change Password
            </div>
            {showPwd ? <ChevronUp className="h-5 w-5 opacity-50" /> : <ChevronDown className="h-5 w-5 opacity-50" />}
          </Button>
        </motion.div>

        {showPwd && (
          <motion.div
            className="space-y-4 pt-4 px-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm"
            />
            <Input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 shadow-sm"
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-2">
              <Button onClick={changePassword} className="w-full rounded-full py-6 font-semibold bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-700 dark:hover:bg-gray-600">
                Update Security Credentials
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* ================= SIGN OUT ================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full rounded-2xl gap-2 py-6 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-all duration-300"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
