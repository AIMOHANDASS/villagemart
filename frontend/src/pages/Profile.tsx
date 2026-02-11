import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../api";
import FreeLocationPicker from "../components/FreeLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "../context/ThemeContext";

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
  const size = 132;
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
    <div className="relative w-[132px] h-[132px]">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--accent))"
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
          bg-background
          border
          shadow-md
        "
      />
    </div>
  );
};

/* ================= AVATAR PICKER ================= */
const AvatarPicker = ({ seed, onSelect, onRemove, onClose }: any) => {
  const [category, setCategory] = useState("Male");
  const seeds = ["1", "2", "3", "4", "5", "6"];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full max-h-[85vh] bg-background p-6 rounded-t-3xl overflow-y-auto">
        <h3 className="text-center font-semibold mb-4">
          Choose Profile Photo
        </h3>

        <div className="flex gap-2 overflow-x-auto mb-4">
          {Object.keys(AVATAR_CATEGORIES).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1 rounded-full border ${
                category === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
          {AVATAR_CATEGORIES[category].flatMap((style) =>
            seeds.map((s) => {
              const url = generateAvatar(style, seed + s);
              return (
                <img
                  key={style + s}
                  src={url}
                  onClick={() => {
                    onSelect(url);
                    onClose();
                  }}
                  className="w-20 h-20 rounded-full border cursor-pointer hover:ring-2 hover:ring-primary"
                />
              );
            })
          )}
        </div>

        <Button variant="outline" className="w-full mt-5" onClick={() => {
          onRemove();
          onClose();
        }}>
          Remove Avatar
        </Button>

        <Button className="w-full mt-3" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

/* ================= MAIN PROFILE ================= */
export default function Profile() {
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
  };

  const saveSettings = async () => {
    await fetch(`${API_BASE_URL}/profile/settings/${stored.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...privacy, dark_mode: dark ? 1 : 0 }),
    });
    alert("Settings updated");
  };

  const changePassword = async () => {
    if (!isStrongPassword(newPassword)) {
      alert("Weak password");
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
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* ================= BANNER HEADER ================= */}
      <div className="
        relative
        rounded-3xl
        overflow-hidden
        bg-gradient-to-br
        from-primary
        to-primary/80
        p-8
        text-center
        text-primary-foreground
      ">
        <div className="flex flex-col items-center gap-4">
          <ProgressRing percentage={completion} image={form.profile_image} />

          <h2 className="text-xl font-semibold">
            {form.name || "Your Name"}
          </h2>

          <p className="text-sm opacity-90">
            Profile completion • {completion}%
          </p>

          {editing && (
            <button
              onClick={() => setShowPicker(true)}
              className="text-sm underline"
            >
              Change profile photo
            </button>
          )}
        </div>
      </div>

      {/* ================= PROFILE FORM ================= */}
      <div className="bg-card border rounded-xl p-6 space-y-3">
        {["name", "username", "email", "phone"].map((f) => (
          <Input
            key={f}
            disabled={!editing || f === "email"}
            value={form[f] || ""}
            placeholder={f}
            onChange={(e) => setForm({ ...form, [f]: e.target.value })}
          />
        ))}

        <Input
          disabled={!editing}
          value={form.address || ""}
          placeholder="Address"
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        {editing && (
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
        )}

        {!editing ? (
          <Button onClick={() => setEditing(true)}>Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={saveProfile}>Save</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ================= SETTINGS ================= */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold">Settings</h3>

        <div className="flex justify-between">
          <span>Dark Mode</span>
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </div>

        <div className="flex justify-between">
          <span>Private Profile</span>
          <Switch
            checked={privacy.is_private}
            onCheckedChange={(v) =>
              setPrivacy({ ...privacy, is_private: v })
            }
          />
        </div>

        <div className="flex justify-between">
          <span>Hide Phone</span>
          <Switch
            checked={privacy.hide_phone}
            onCheckedChange={(v) =>
              setPrivacy({ ...privacy, hide_phone: v })
            }
          />
        </div>

        <div className="flex justify-between">
          <span>Hide Address</span>
          <Switch
            checked={privacy.hide_address}
            onCheckedChange={(v) =>
              setPrivacy({ ...privacy, hide_address: v })
            }
          />
        </div>

        <Button onClick={saveSettings}>Save Settings</Button>
      </div>

      {/* ================= PASSWORD ================= */}
      <div className="bg-card border rounded-xl p-6 space-y-2">
        <Button variant="outline" onClick={() => setShowPwd(!showPwd)}>
          Change Password
        </Button>

        {showPwd && (
          <>
            <Input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button onClick={changePassword}>Update Password</Button>
          </>
        )}
      </div>

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
    </div>
  );
}
