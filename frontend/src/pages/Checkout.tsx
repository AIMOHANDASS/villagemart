// src/pages/Checkout.tsx

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, MapPin } from "lucide-react";
import { API_BASE_URL } from "../api";

// ---------------- RAZORPAY LOADER ----------------
declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};
// ------------------------------------------------

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
  deliveryDate?: string; // ✅ ADDED
}

type PaymentMethod = "cod" | "online";

type CheckoutProps = {
  user: any;
};

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cod");

  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCartItems(JSON.parse(raw));
    setLoading(false);
  }, []);

  // ---------------- CALCULATIONS ----------------
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const deliveryFee = subtotal >= 500 ? 0 : 5;
  const grandTotal = subtotal + deliveryFee;
  // ------------------------------------------------

  // ---------------- USE CURRENT LOCATION ----------------
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setLocLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          if (data?.display_name) {
            setAddress(data.display_name);
          } else {
            alert("Could not fetch address");
          }
        } catch (err) {
          console.error(err);
          alert("Failed to get address");
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        alert("Location permission denied");
        setLocLoading(false);
      }
    );
  };
  // ------------------------------------------------

  // ---------------- RAZORPAY PAYMENT ----------------
  const startRazorpayPayment = async () => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("❌ Razorpay SDK failed");
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const options = {
        key: "rzp_live_S5dc6OUqbnjbGQ", // 🔴 replace later
        amount: grandTotal * 100,
        currency: "INR",
        name: "VillageMart",
        description: "Order Payment",
        handler: function () {
          resolve(true);
        },
        prefill: {
          name,
          contact: phone,
        },
        theme: { color: "#16a34a" },
        modal: {
          ondismiss: () => resolve(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };
  // -------------------------------------------------

  const placeOrder = async () => {
    if (!name || !phone || !address) {
      alert("❌ Fill all details");
      return;
    }

    // ✅ GARLAND 24-HOUR VALIDATION
    const hasInvalidGarland = cartItems.some((item: any) => {
      if (item.category !== "Garlands" || !item.deliveryDate) return false;

      const deliveryAt = new Date(item.deliveryDate);
      const diffHours =
        (deliveryAt.getTime() - new Date().getTime()) / (1000 * 60 * 60);

      return diffHours < 24;
    });

    if (hasInvalidGarland) {
      alert("❌ Garland orders must be placed 24 hours in advance.");
      return;
    }

    setPlacing(true);

    try {
      if (paymentMethod === "online") {
        const paid = await startRazorpayPayment();
        if (!paid) throw new Error("Payment cancelled");
      }

      const formattedItems = cartItems.map((i) => {
        const unitPrice = i.price;
        const weight = i.quantity;
        const totalPrice = unitPrice * weight;

        return {
          product_id: i.id,
          product_name: i.name,
          unit_price: unitPrice,
          weight,
          total_price: totalPrice,
          image: i.image,
          category: i.category,
          deliveryDate: i.deliveryDate, // ✅ SEND TO BACKEND
        };
      });

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          items: formattedItems,
          subtotal,
          deliveryFee,
          total: grandTotal,
          address,
          phone,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Order failed");
      }

      localStorage.removeItem("cart");
      setSuccess(true);

      setTimeout(() => navigate("/"), 2500);
    } catch (err) {
      console.error("Order error:", err);
      alert("❌ Order failed. Check backend logs.");
      setPlacing(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      {success && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="p-8 text-center animate-scale-in">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold">
              Order Confirmed 🎉
            </h2>
          </Card>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-6 space-y-4 animate-fade-in">
        <Card className="p-6 space-y-4 transition-all duration-500 hover:shadow-lg">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="flex gap-2">
            <Input
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={useCurrentLocation}
              disabled={locLoading}
              className="flex gap-2 items-center transition-all duration-300 hover:scale-105"
            >
              {locLoading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Use Location
            </Button>
          </div>

          <RadioGroup
            value={paymentMethod}
            onValueChange={(value) =>
              setPaymentMethod(value as PaymentMethod)
            }
          >
            <div className="flex gap-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="cod" /> COD
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="online" /> Online (Razorpay)
              </Label>
            </div>
          </RadioGroup>

          <Separator />

          <div className="space-y-1 text-sm">
            <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
            <p>Delivery Fee: ₹{deliveryFee.toFixed(2)}</p>
            <p className="font-bold text-lg">
              Grand Total: ₹{grandTotal.toFixed(2)}
            </p>
          </div>

          <Button
            disabled={placing}
            onClick={placeOrder}
            className="w-full transition-all duration-300 hover:scale-[1.02]"
          >
            {placing ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Place Order"
            )}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;