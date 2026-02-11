import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PaymentMethod = "cod" | "online";
type CheckoutMode = "products" | "transport" | "partyHall";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
  deliveryDate?: string;
};

type BookingDraft = {
  type: "transport" | "partyHall";
  payload: any;
};

type CheckoutProps = {
  user: any;
};

const DRAFT_KEY = "vm_pending_booking";

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  useEffect(() => {
    const routeState = (location.state as any) || {};
    const checkoutMode = routeState.checkoutMode as CheckoutMode | undefined;
    const routeDraft = routeState.bookingDraft as BookingDraft | undefined;

    const rawCart = localStorage.getItem("cart");
    if (rawCart) setCartItems(JSON.parse(rawCart));

    if (checkoutMode === "products") {
      setDraft(null);
      setLoading(false);
      return;
    }

    const savedDraftRaw = localStorage.getItem(DRAFT_KEY);
    const savedDraft = savedDraftRaw ? (JSON.parse(savedDraftRaw) as BookingDraft) : null;
    const activeDraft = routeDraft || savedDraft;

    if (activeDraft && ["transport", "partyHall"].includes(activeDraft.type)) {
      setDraft(activeDraft);
    } else {
      setDraft(null);
    }

    setLoading(false);
  }, [location.state]);

  const mode: CheckoutMode = draft?.type || "products";

  const productSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const productDeliveryFee = productSubtotal >= 500 ? 0 : 5;
  const productTotal = productSubtotal + productDeliveryFee;

  const payableAmount = useMemo(() => {
    if (mode === "transport") return Number(draft?.payload?.chargeAmount || 0);
    if (mode === "partyHall") return Number(draft?.payload?.totalCharge || 0);
    return productTotal;
  }, [draft, mode, productTotal]);

  const startRazorpayPayment = async (amount: number) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      alert("❌ Razorpay SDK failed");
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const options = {
        key: "rzp_live_S5dc6OUqbnjbGQ",
        amount: amount * 100,
        currency: "INR",
        name: "VillageMart",
        description: "Checkout Payment",
        handler: () => resolve(true),
        prefill: {
          name: user?.name || "",
          contact: user?.phone || "",
        },
        theme: { color: "#16a34a" },
        modal: { ondismiss: () => resolve(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  const submitProducts = async () => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const formattedItems = cartItems.map((i) => ({
      product_id: i.id,
      product_name: i.name,
      unit_price: i.price,
      weight: i.quantity,
      total_price: i.price * i.quantity,
      image: i.image,
      category: i.category,
      deliveryDate: i.deliveryDate,
    }));

    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id,
        items: formattedItems,
        subtotal: productSubtotal,
        deliveryFee: productDeliveryFee,
        total: productTotal,
        address: user?.address || "",
        phone: user?.phone || "",
        paymentMethod,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Order failed");

    localStorage.removeItem("cart");
  };

  const submitTransport = async () => {
    if (!draft?.payload) throw new Error("No transport details found");

    const res = await fetch(`${API_BASE_URL}/transport/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft.payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Transport booking failed");

    localStorage.removeItem(DRAFT_KEY);
  };

  const submitPartyHall = async () => {
    if (!draft?.payload) throw new Error("No party hall details found");

    const res = await fetch(`${API_BASE_URL}/party-hall/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft.payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Party hall booking failed");

    localStorage.removeItem(DRAFT_KEY);
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      if (payableAmount <= 0) {
        throw new Error("Invalid payable amount");
      }

      if (paymentMethod === "online") {
        const paid = await startRazorpayPayment(payableAmount);
        if (!paid) throw new Error("Payment cancelled");
      }

      if (mode === "transport") {
        await submitTransport();
      } else if (mode === "partyHall") {
        await submitPartyHall();
      } else {
        await submitProducts();
      }

      setSuccess(true);
      setTimeout(() => navigate("/"), 2200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      alert(`❌ ${message}`);
      setPlacing(false);
    }
  };

  const renderSummary = () => {
    if (mode === "transport") {
      return (
        <div className="text-sm space-y-1">
          <p className="font-semibold">Transport Payment Summary</p>
          <p>From: {draft?.payload?.fromAddress}</p>
          <p>To: {draft?.payload?.toAddress}</p>
          <p>Distance: {Number(draft?.payload?.distanceKm || 0).toFixed(2)} km</p>
          <p>Charge: ₹{Number(draft?.payload?.chargeAmount || 0).toFixed(2)}</p>
        </div>
      );
    }

    if (mode === "partyHall") {
      return (
        <div className="text-sm space-y-1">
          <p className="font-semibold">Party Hall Payment Summary</p>
          <p>Date: {draft?.payload?.eventDate}</p>
          <p>Start: {draft?.payload?.startTime}</p>
          <p>Persons: {draft?.payload?.personCount}</p>
          <p>Base: ₹{Number(draft?.payload?.baseCharge || 0).toFixed(2)}</p>
          <p>Add-ons: ₹{Number(draft?.payload?.addOnCharge || 0).toFixed(2)}</p>
          <p>Total: ₹{Number(draft?.payload?.totalCharge || 0).toFixed(2)}</p>
        </div>
      );
    }

    return (
      <div className="text-sm space-y-1">
        <p className="font-semibold">Product Payment Summary</p>
        <p>Subtotal: ₹{productSubtotal.toFixed(2)}</p>
        <p>Delivery Fee: ₹{productDeliveryFee.toFixed(2)}</p>
        <p>Total: ₹{productTotal.toFixed(2)}</p>
      </div>
    );
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      {success && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="p-8 text-center animate-scale-in">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
            <h2 className="text-2xl font-bold">Payment Successful 🎉</h2>
          </Card>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6 space-y-4 animate-fade-in">
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Checkout - Payment Only</h2>
          {renderSummary()}

          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <div className="flex gap-4">
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="cod" /> Cash On Delivery / Pay on Arrival
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="online" /> Online (Razorpay)
              </Label>
            </div>
          </RadioGroup>

          <p className="text-lg font-bold">Payable: ₹{payableAmount.toFixed(2)}</p>

          <Button disabled={placing} onClick={placeOrder} className="w-full">
            {placing ? <Loader2 className="animate-spin" /> : "Confirm Payment & Place Booking"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
