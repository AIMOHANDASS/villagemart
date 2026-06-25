import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, CreditCard, Banknote, ShieldCheck } from "lucide-react";
import { API_BASE_URL, apiClient } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { parseCustomQuantityInput } from "../utils/quantityParser";

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

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [activeAddress, setActiveAddress] = useState<any>(null);
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [isChangingAddress, setIsChangingAddress] = useState(false);

  useEffect(() => {
    const routeState = (location.state as any) || {};
    const checkoutMode = routeState.checkoutMode as CheckoutMode | undefined;
    const routeDraft = routeState.bookingDraft as BookingDraft | undefined;

    const rawCart = localStorage.getItem("cart");
    const parsedCart = rawCart ? (JSON.parse(rawCart) as CartItem[]) : [];
    setCartItems(parsedCart);

    const savedDraftRaw = localStorage.getItem(DRAFT_KEY);
    const savedDraft = savedDraftRaw ? (JSON.parse(savedDraftRaw) as BookingDraft) : null;

    const hasProductItems = parsedCart.length > 0;

    const fetchActiveAddress = async () => {
      try {
        const res = await apiClient.get("/addresses/list");
        const data = (res as any).data || res;
        if (data.success && data.addresses?.length > 0) {
          setAllAddresses(data.addresses);
          const selected = data.addresses.find((a: any) => a.is_selected === 1);
          setActiveAddress(selected || data.addresses[0]);
        }
      } catch (err) {
        console.error("Failed to load address for checkout", err);
      }
    };
    
    fetchActiveAddress();

    if (checkoutMode === "products" || (!checkoutMode && hasProductItems)) {
      setDraft(null);
      setLoading(false);
      return;
    }

    if (checkoutMode === "transport" || checkoutMode === "partyHall") {
      const preferredDraft = routeDraft || savedDraft;
      if (preferredDraft?.type === checkoutMode) {
        setDraft(preferredDraft);
      } else {
        setDraft(null);
      }
      setLoading(false);
      return;
    }

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
    () => cartItems.reduce((sum, item: any) => sum + (item.calculatedUnitPrice || item.price) * item.quantity, 0),
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
      toast.error("Payment gateway failed to load");
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_S5dc6OUqbnjbGQ",
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

    const formattedItems = cartItems.map((i: any) => {
      const parsed = parseCustomQuantityInput(i.selectedSize || i.unit || "1 qty", i.product_type);
      return {
        product_id: i.id,
        product_name: i.name || i.E_name,
        unit_price: i.calculatedUnitPrice || i.price,
        weight: parsed.rawWeight,
        total_price: (i.calculatedUnitPrice || i.price) * i.quantity,
        image: i.image,
        category: i.category,
        deliveryDate: i.deliveryDate,
        quantity: i.quantity,
      };
    });

    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id,
        items: formattedItems,
        subtotal: productSubtotal,
        deliveryFee: productDeliveryFee,
        total: productTotal,
        address: activeAddress ? `[${activeAddress.address_label}] ${activeAddress.full_address}` : (user?.address || ""),
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

    const p = draft.payload;

    // Build a sanitized payload — ensure every key the backend expects is present
    // and explicitly typed. Fallback userId from the live user prop in case the
    // draft was created with an undefined user.id.
    const payload = {
      userId: p.userId || user?.id || user?.user_id,
      customerName: p.customerName || user?.username || user?.name || "Guest",
      customerPhone: p.customerPhone || user?.phone || "",
      fromAddress: p.fromAddress || "",
      fromLat: Number(p.fromLat),
      fromLng: Number(p.fromLng),
      toAddress: p.toAddress || "",
      toLat: Number(p.toLat),
      toLng: Number(p.toLng),
      vehicleType: p.vehicleType || "auto",
      notes: p.notes || "",
    };

    if (!payload.userId || isNaN(payload.fromLat) || isNaN(payload.toLat)) {
      throw new Error("Invalid booking data — missing location or user ID");
    }

    const res = await fetch(`${API_BASE_URL}/transport/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      toast.success("Order placed successfully! 🎉");
      setTimeout(() => navigate("/"), 2200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      toast.error(message);
      setPlacing(false);
    }
  };

  const renderSummary = () => {
    if (mode === "transport") {
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            🚚 Transport Payment Summary
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
            <p className="flex justify-between"><span className="text-muted-foreground">From</span><span className="font-medium text-right max-w-[60%] truncate">{draft?.payload?.fromAddress}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-medium text-right max-w-[60%] truncate">{draft?.payload?.toAddress}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="font-medium">{Number(draft?.payload?.distanceKm || 0).toFixed(2)} km</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Vehicle Type</span><span className="font-medium capitalize">{draft?.payload?.vehicleType || "Auto"}</span></p>
            <div className="border-t pt-2 mt-2">
              <p className="flex justify-between text-base font-bold"><span>Charge</span><span className="text-primary">₹{Number(draft?.payload?.chargeAmount || 0).toFixed(2)}</span></p>
            </div>
          </div>
        </div>
      );
    }

    if (mode === "partyHall") {
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            🎉 Party Hall Payment Summary
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
            <p className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{draft?.payload?.eventDate}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Start</span><span className="font-medium">{draft?.payload?.startTime}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Persons</span><span className="font-medium">{draft?.payload?.personCount}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Base</span><span className="font-medium">₹{Number(draft?.payload?.baseCharge || 0).toFixed(2)}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Add-ons</span><span className="font-medium">₹{Number(draft?.payload?.addOnCharge || 0).toFixed(2)}</span></p>
            <div className="border-t pt-2 mt-2">
              <p className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">₹{Number(draft?.payload?.totalCharge || 0).toFixed(2)}</span></p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          🛒 Product Payment Summary
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">₹{productSubtotal.toFixed(2)}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span className="font-medium">₹{productDeliveryFee.toFixed(2)}</span></p>
          <div className="border-t pt-2 mt-2">
            <p className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">₹{productTotal.toFixed(2)}</span></p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.4 }}
    >
      <Header user={user} />

      {/* Success Modal */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className="p-10 text-center rounded-3xl shadow-2xl border-0">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <CheckCircle className="h-20 w-20 text-emerald-500 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold">Payment Successful 🎉</h2>
                <p className="text-muted-foreground mt-2">Redirecting you home...</p>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-8 space-y-6 rounded-2xl shadow-xl border-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Secure Checkout</h2>
            </div>

            {/* Delivery Address Block */}
            {mode === "products" && (
              <div className="space-y-3 pt-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  📍 Delivery Address
                </h3>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4">
                  {isChangingAddress ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-stone-500 uppercase">Select Delivery Location</span>
                        <button onClick={() => setIsChangingAddress(false)} className="text-xs text-rose-500 font-bold">Cancel</button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {allAddresses.map((addr) => (
                          <div 
                            key={addr.id}
                            onClick={async () => {
                              try {
                                await apiClient.post("/addresses/select-active", { addressId: addr.id });
                                setActiveAddress(addr);
                                setIsChangingAddress(false);
                                window.dispatchEvent(new Event('addressUpdated')); // Sync top ribbon
                              } catch(e) { toast.error("Failed to switch address"); }
                            }}
                            className="p-3 bg-white border rounded-xl cursor-pointer hover:border-emerald-500 hover:shadow-sm transition-all"
                          >
                            <p className="font-black text-[10px] uppercase text-emerald-600 mb-1">{addr.address_label}</p>
                            <p className="text-xs font-medium text-stone-700">{addr.full_address}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeAddress ? (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-black text-xs uppercase text-emerald-600 tracking-wider mb-1">{activeAddress.address_label}</p>
                        <button onClick={() => setIsChangingAddress(true)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Change</button>
                      </div>
                      <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{activeAddress.full_address}</p>
                      {activeAddress.landmark && <p className="text-xs text-stone-500 mt-1">Landmark: {activeAddress.landmark}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-rose-500 font-bold">No delivery address selected. Please add one using the top navbar.</p>
                  )}
                </div>
              </div>
            )}

            {renderSummary()}

            {/* Modern Payment Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Payment Method</h3>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="cod" className="sr-only" />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      paymentMethod === "cod" ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Cash on Delivery</p>
                      <p className="text-xs text-muted-foreground">Pay when you receive</p>
                    </div>
                    {paymentMethod === "cod" && (
                      <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </motion.label>

                  <motion.label
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                      paymentMethod === "online"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value="online" className="sr-only" />
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      paymentMethod === "online" ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Online Payment</p>
                      <p className="text-xs text-muted-foreground">Razorpay (UPI, Cards)</p>
                    </div>
                    {paymentMethod === "online" && (
                      <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </motion.label>
                </div>
              </RadioGroup>
            </div>

            {/* Animated Total */}
            <motion.div
              key={payableAmount}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-2xl p-5 text-center"
            >
              <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
              <p className="text-3xl font-extrabold text-primary">
                ₹{payableAmount.toFixed(2)}
              </p>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                disabled={placing}
                onClick={placeOrder}
                className="w-full h-14 text-lg bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-500 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all duration-300 ripple-container"
              >
                {placing ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Loader2 className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Confirm Payment & Place Booking
                  </>
                )}
              </Button>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Checkout;
