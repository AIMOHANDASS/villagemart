// src/pages/Checkout.tsx

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Loader2, Edit, Check, CheckCircle, Smartphone, DollarSign, Wallet } from "lucide-react";

const API_BASE = "http://localhost:5000/api";

// --- UPDATED: Admin UPI IDs based on user input ---
const ADMIN_UPI_DETAILS: { [key: string]: { id: string; name: string } } = {
  gpay: { id: "mohan113moha@okhdfcbank", name: "Mohan GPay" },
  phonepe: { id: "8903003808@ybl", name: "VillageMart PhonePe" },
  paytm: { id: "8903003808@pthdfc", name: "VillageMart Paytm" },
  cod: { id: "", name: "Cash on Delivery" }, // COD doesn't need an ID
};
const ADMIN_UPI_NAME = "VillageMart Admin";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  unit: string;
}

type CheckoutProps = {
  user: any;
};

// Map payment methods to icons
const paymentIcons: { [key: string]: React.ReactNode } = {
    gpay: <Smartphone className="mr-2 h-5 w-5" />,
    phonepe: <Smartphone className="mr-2 h-5 w-5" />,
    paytm: <Smartphone className="mr-2 h-5 w-5" />,
    cod: <DollarSign className="mr-2 h-5 w-5" />,
};

const Checkout: React.FC<CheckoutProps> = ({ user }) => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false); 
  const [orderPlaced, setOrderPlaced] = useState(false); 
  
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState(user?.address || "");
  const [paymentMethod, setPaymentMethod] = useState("gpay");

  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCartItems(JSON.parse(raw));
    setLoading(false);
  }, [user]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = subtotal > 500 ? 0 : 30;
  const total = subtotal + deliveryFee;

  // --- UPDATED: Payment Simulation Function with dynamic UPI ID ---
  const simulatePayment = (totalAmount: number, method: string) => {
    const paymentDetail = ADMIN_UPI_DETAILS[method];

    if (!paymentDetail || !paymentDetail.id) {
        console.error(`Invalid payment method or UPI ID for: ${method}`);
        return Promise.resolve(false);
    }
    
    // 1. Construct a UPI deep link using the selected method's specific UPI ID
    const encodedAmount = totalAmount.toFixed(2);
    const encodedNarration = encodeURIComponent("VillageMart Order Payment");
    const upiLink = `upi://pay?pa=${paymentDetail.id}&pn=${encodeURIComponent(paymentDetail.name)}&am=${encodedAmount}&cu=INR&tn=${encodedNarration}`;
    
    console.log(`Simulating Payment via ${method}. UPI Link:`, upiLink);
    
    // 2. Simulate success after a delay (this represents the user completing the payment)
    return new Promise<boolean>(resolve => {
        // You would typically open the link here: window.open(upiLink, '_blank');
        setTimeout(() => {
            console.log("Payment simulation successful.");
            resolve(true); 
        }, 3000); // 3-second simulation time
    });
  };
  // ------------------------------------------------------------------


  // --- handlePlaceOrder with Payment Flow ---
  const handlePlaceOrder = async () => {
    if (!name || !phone || !address) {
      alert("❌ Please fill out all required fields: Name, Phone, and Delivery Address.");
      return;
    }
    
    setIsPlacingOrder(true);

    try {
        // Step A: Handle Payment (Skip for COD)
        if (paymentMethod !== 'cod') {
            const paymentSuccess = await simulatePayment(total, paymentMethod);
            if (!paymentSuccess) {
                throw new Error("Payment failed or was canceled by user.");
            }
        }
        
        // Step B: Proceed to Order Creation
        console.log("Order creation initiated on backend...");

        const order = {
            userId: user?._id || "guest",
            items: cartItems.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price })),
            total,
            address,
            paymentMethod,
            phone,
            paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Confirmed',
        };

        const res = await fetch(`${API_BASE}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order),
        });

        if (!res.ok) {
            throw new Error("Order creation failed on server.");
        }

        // Step C: Final Confirmation
        localStorage.removeItem("cart");
        window.dispatchEvent(new Event("storage"));

        setOrderPlaced(true); 

        setTimeout(() => {
            navigate("/", { state: { orderConfirmed: true } });
        }, 2500); 

    } catch (err: any) {
        console.error(err);
        alert(`❌ Order failed: ${err.message || "Please check your network."}`);
        setIsPlacingOrder(false);
    } 
  };
  // ------------------------------------------------------------------

  if (cartItems.length === 0 && !loading && !orderPlaced) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header user={user} />
            <div className="container px-4 py-32 text-center">
                <div className="text-6xl mb-6">🛒</div>
                <h1 className="text-3xl font-extrabold text-gray-800 mb-4">Your cart is empty!</h1>
                <Button onClick={() => navigate("/products")}>
                    Go to Products
                </Button>
            </div>
        </div>
    );
  }

  const getPayButtonText = () => {
    if (isPlacingOrder && !orderPlaced) {
        return paymentMethod === 'cod' ? "Confirming COD..." : "Processing Payment...";
    }
    if (paymentMethod === 'cod') {
        return `Confirm COD Order (₹${total.toFixed(2)})`;
    }
    
    const methodText = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
    return `Pay via ${methodText} (₹${total.toFixed(2)})`;
  }
  
  const currentUpiIdDisplay = ADMIN_UPI_DETAILS[paymentMethod]?.id || '';

  return (
    <div className="min-h-screen bg-gray-50 relative"> 
      <Header user={user} />
      
      {/* -------------------------------------------------------- */}
      {/* ORDER SUCCESS POP-UP */}
      {/* -------------------------------------------------------- */}
      {orderPlaced && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-opacity duration-300">
            <Card className="p-8 w-full max-w-sm text-center shadow-2xl animate-fade-in-up">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h2>
                <p className="text-gray-600 mb-6">
                    Thank you! Your payment was successful and your order is confirmed. Redirecting shortly...
                </p>
                <Loader2 className="h-6 w-6 animate-spin text-green-600 mx-auto" />
            </Card>
        </div>
      )}
      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>

      {/* Main Content (Blurred/Disabled when order is placed) */}
      <div className={`container px-4 py-10 ${orderPlaced ? 'filter blur-sm pointer-events-none' : ''}`}>
        <h1 className="text-3xl font-extrabold text-gray-800 mb-8 border-b pb-2">
          Final Review & Payment
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section: Details & Payment */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card className="shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">1. Contact & Delivery Info</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(!editing)}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    {editing ? <Check className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                    {editing ? "Save" : "Edit"}
                  </Button>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Your Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!editing}
                      className={editing ? "border-blue-500 shadow-sm" : "bg-gray-100 text-gray-700"}
                    />
                    <Input
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!editing}
                      className={editing ? "border-blue-500 shadow-sm" : "bg-gray-100 text-gray-700"}
                    />
                </div>

                <h3 className="text-lg font-semibold pt-4">Delivery Address</h3>
                <Input
                  placeholder="Enter full delivery address (House No, Street, Landmark)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-12 border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500"
                />

              </CardContent>
            </Card>
            
            <Card className="shadow-lg">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-gray-800">2. Payment Method</h2>
                <Separator />
                <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={setPaymentMethod} 
                    className="grid grid-cols-2 gap-4"
                >
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer ${paymentMethod === 'gpay' ? 'border-primary ring-2 ring-primary/50' : ''}`} onClick={() => setPaymentMethod('gpay')}>
                    <RadioGroupItem value="gpay" id="gpay" className="text-primary" />
                    <Label htmlFor="gpay" className="font-medium">Google Pay</Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer ${paymentMethod === 'phonepe' ? 'border-primary ring-2 ring-primary/50' : ''}`} onClick={() => setPaymentMethod('phonepe')}>
                    <RadioGroupItem value="phonepe" id="phonepe" className="text-primary" />
                    <Label htmlFor="phonepe" className="font-medium">PhonePe</Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer ${paymentMethod === 'paytm' ? 'border-primary ring-2 ring-primary/50' : ''}`} onClick={() => setPaymentMethod('paytm')}>
                    <RadioGroupItem value="paytm" id="paytm" className="text-primary" />
                    <Label htmlFor="paytm" className="font-medium">Paytm</Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer ${paymentMethod === 'cod' ? 'border-primary ring-2 ring-primary/50' : ''}`} onClick={() => setPaymentMethod('cod')}>
                    <RadioGroupItem value="cod" id="cod" className="text-primary" />
                    <Label htmlFor="cod" className="font-medium">Cash on Delivery (COD)</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardContent className="p-6 space-y-3">
                    <h2 className="text-xl font-bold text-gray-800">3. Items Review</h2>
                    <Separator />
                    {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-3">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-10 h-10 rounded-full object-cover shadow-sm"
                                />
                                <div>
                                    <h3 className="font-medium text-gray-700">{item.name}</h3>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 font-semibold">
                                {item.quantity} {item.unit} x ₹{item.price.toFixed(2)}
                            </p>
                        </div>
                    ))}
                    <div className="pt-2 text-right">
                        <Button variant="link" onClick={() => navigate("/cart")} className="p-0 text-sm">
                            Edit Cart
                        </Button>
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Right Section: Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-2xl border-primary/50 border-2">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-2xl font-extrabold text-gray-900">Order Total</h2>
                <div className="space-y-3 text-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal ({cartItems.length} items)</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    {deliveryFee === 0 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      <span className="font-medium">₹{deliveryFee}</span>
                    )}
                  </div>
                  <Separator className="bg-gray-300" />
                  <div className="flex justify-between text-2xl font-extrabold text-green-700">
                    <span>Total Payable</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
                
                <Button
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder || orderPlaced}
                  className="
                    w-full text-xl h-14 
                    bg-green-600 hover:bg-green-700 
                    shadow-lg shadow-green-600/40 
                    transition duration-300
                    mt-6
                  "
                >
                  {isPlacingOrder && !orderPlaced ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {getPayButtonText()}
                    </>
                  ) : (
                    <>
                        {paymentIcons[paymentMethod] || <Wallet className="mr-2 h-5 w-5" />} {getPayButtonText()}
                    </>
                  )}
                </Button>
                
                <p className="text-center text-xs text-gray-500 pt-2">
                    {paymentMethod !== 'cod' && (
                        <span>
                            Simulated Admin UPI: **{currentUpiIdDisplay}**
                        </span>
                    )}
                </p>
                <p className="text-center text-xs text-gray-500">
                  By placing your order, you agree to the terms and conditions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;