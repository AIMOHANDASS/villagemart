import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import FreeLocationPicker from "../components/FreeLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { Pencil, Save, X, Lock, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

/* ================= AVATAR CONFIG ================= */
const AVATAR_CATEGORIES: Record<string, string[]> = {
  Male: ["adventurer", "personas", "micah"],
  Female: ["avataaars", "lorelei", "big-smile"],
  Cute: ["fun-emoji", "thumbs", "pixel-art"],
  Robot: ["bottts", "croodles", "croodles-neutral"],
};

const generateAvatar = (style: string, seed: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

/* ================= PASSWORD ================= */
const isStrongPassword = (p: string) =>
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[a-z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

/* ================= PROFILE COMPLETION ================= */
const calcCompletion = (u: any) => {
  let s = 0;
  if (u.profile_image) s += 20;
  if (u.name) s += 20;
  if (u.username) s += 20;
  if (u.phone) s += 20;
  if (u.address) s += 20;
  return s;
};

/* ================= PROGRESS RING (ANIMATED) ================= */
const ProgressRing = ({ percentage, image }: any) => {
  const size = 140;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    // animate fill on load
    const t = setTimeout(() => {
      setOffset(circumference - (percentage / 100) * circumference);
    }, 300);
    return () => clearTimeout(t);
  }, [percentage]);

  return (
    <motion.div
      className="relative w-[140px] h-[140px]"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      <img
        src={
          image ||
          "https://api.dicebear.com/7.x/personas/svg?seed=user"
        }
        className="
          absolute inset-3
          rounded-full
          object-cover
          bg-white dark:bg-gray-800
          border-2 border-white/50
          shadow-xl
        "
      />
    </motion.div>
  );
};

/* ================= AVATAR PICKER ================= */
const AvatarPicker = ({ seed, onSelect, onRemove, onClose }: any) => {
  const [category, setCategory] = useState("Male");
  const seeds = ["1", "2", "3", "4", "5", "6"];

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-h-[85vh] bg-background p-6 rounded-t-3xl overflow-y-auto shadow-2xl"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />
        <h3 className="text-center font-bold text-lg mb-4">
          Choose Profile Photo
        </h3>

        <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
          {Object.keys(AVATAR_CATEGORIES).map((c) => (
            <motion.button
              key={c}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-300 ${
                category === c
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "bg-transparent hover:bg-muted"
              }`}
            >
              {c}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
          {AVATAR_CATEGORIES[category].flatMap((style) =>
            seeds.map((s) => {
              const url = generateAvatar(style, seed + s);
              return (
                <motion.img
                  key={style + s}
                  src={url}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    onSelect(url);
                    onClose();
                  }}
                  className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-primary hover:shadow-lg transition-all duration-300"
                />
              );
            })
          )}
        </div>

        <Button variant="outline" className="w-full mt-5 rounded-xl" onClick={() => {
          onRemove();
          onClose();
        }}>
          Remove Avatar
        </Button>

        <Button className="w-full mt-3 rounded-xl" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </motion.div>
    </motion.div>
  );
};

/* ================= SETTINGS ROW ================= */
const SettingRow = ({ label, icon, checked, onChange }: { label: string; icon: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <motion.div
    className="flex items-center justify-between py-3 px-1"
    whileHover={{ x: 2 }}
  >
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </motion.div>
);

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
  const { dark, toggleDark } = useTheme();

  const [form, setForm] = useState<any>({});
  const [editing, setEditing] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [showPicker, setShowPicker] = useState(false);

  const [privacy, setPrivacy] = useState({
    is_private: false,
    hide_phone: false,
    hide_address: false,
  });

  const [showPwd, setShowPwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  /* FETCH PROFILE */
  useEffect(() => {
    fetch(`${API_BASE_URL}/profile/${stored.id}`)
      .then((r) => r.json())
      .then((d) => {
        setForm(d);
        setPrivacy({
          is_private: !!d.is_private,
          hide_phone: !!d.hide_phone,
          hide_address: !!d.hide_address,
        });
        setCompletion(calcCompletion(d));
      });
  }, []);

  const saveProfile = async () => {
    await fetch(`${API_BASE_URL}/profile/${stored.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditing(false);
    setCompletion(calcCompletion(form));
    toast.success("Profile updated successfully!");
  };

  const saveSettings = async () => {
    await fetch(`${API_BASE_URL}/profile/settings/${stored.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...privacy, dark_mode: dark ? 1 : 0 }),
    });
    toast.success("Settings saved!");
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

  return (
    <motion.div
      className="max-w-3xl mx-auto p-6 space-y-6 pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >

      {/* ================= BANNER HEADER ================= */}
      <motion.div
        className="
          relative
          rounded-3xl
          overflow-hidden
          bg-gradient-to-br
          from-primary
          via-emerald-600
          to-teal-700
          p-8
          text-center
          text-white
          shadow-2xl shadow-primary/20
        "
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="flex flex-col items-center gap-4 relative z-10">
          <ProgressRing percentage={completion} image={form.profile_image} />

          <h2 className="text-2xl font-bold">
            {form.name || "Your Name"}
          </h2>

          <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <p className="text-sm font-medium">
              Profile completion • {completion}%
            </p>
          </div>

          {editing && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowPicker(true)}
              className="text-sm underline underline-offset-4 opacity-80 hover:opacity-100 transition-opacity"
            >
              Change profile photo
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ================= PROFILE FORM ================= */}
      <motion.div
        className="bg-card border rounded-2xl p-6 space-y-4 shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">Personal Info</h3>
          {!editing && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-2"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </motion.div>
          )}
        </div>

        {["name", "username", "email", "phone"].map((f, index) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
          >
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              {f}
            </label>
            <Input
              disabled={!editing || f === "email"}
              value={form[f] || ""}
              placeholder={f}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              className="rounded-xl"
            />
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
            Address
          </label>
          <Input
            disabled={!editing}
            value={form.address || ""}
            placeholder="Address"
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded-xl"
          />
        </motion.div>

        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
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
            className="flex gap-3 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
              <Button onClick={saveProfile} className="w-full rounded-xl gap-2 bg-gradient-to-r from-primary to-emerald-600 shadow-lg shadow-primary/20">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button variant="outline" onClick={() => setEditing(false)} className="rounded-xl gap-2">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* ================= SETTINGS ================= */}
      <motion.div
        className="bg-card border rounded-2xl p-6 space-y-1 shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="font-bold text-lg mb-3">⚙️ Settings</h3>

        <SettingRow label="Dark Mode" icon="🌙" checked={dark} onChange={toggleDark} />
        <div className="border-t border-gray-100 dark:border-gray-800" />
        <SettingRow label="Private Profile" icon="🔒" checked={privacy.is_private} onChange={(v) => setPrivacy({ ...privacy, is_private: v })} />
        <div className="border-t border-gray-100 dark:border-gray-800" />
        <SettingRow label="Hide Phone" icon="📱" checked={privacy.hide_phone} onChange={(v) => setPrivacy({ ...privacy, hide_phone: v })} />
        <div className="border-t border-gray-100 dark:border-gray-800" />
        <SettingRow label="Hide Address" icon="📍" checked={privacy.hide_address} onChange={(v) => setPrivacy({ ...privacy, hide_address: v })} />

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="pt-4">
          <Button onClick={saveSettings} className="rounded-xl w-full">Save Settings</Button>
        </motion.div>
      </motion.div>

      {/* ================= PASSWORD ================= */}
      <motion.div
        className="bg-card border rounded-2xl p-6 space-y-3 shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            onClick={() => setShowPwd(!showPwd)}
            className="w-full rounded-xl gap-2 justify-between"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Change Password
            </div>
            {showPwd ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </motion.div>

        {showPwd && (
          <motion.div
            className="space-y-3 pt-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl"
            />
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={changePassword} className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-600">
                Update Password
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {showPicker && (
        <AvatarPicker
          seed={form.username || form.email || "user"}
          onSelect={(url: string) =>
            setForm({ ...form, profile_image: url })
          }
          onRemove={() =>
            setForm({ ...form, profile_image: "" })
          }
          onClose={() => setShowPicker(false)}
        />
      )}
    </motion.div>
  );
}
