import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  quantity: number;
  unit: string; // "kg", "g", "ltr", "ml"
  isOrganic?: boolean;
}

type CartProps = {
  user: any;
};

const Cart: React.FC<CartProps> = ({ user }) => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const raw = localStorage.getItem("cart");
    // This logic ensures the cart persists across logins on the same browser,
    // and starts empty for a new user/browser (as requested).
    return raw ? JSON.parse(raw) : []; 
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
    // Trigger storage event to update the cart count in the Header
    window.dispatchEvent(new Event("storage")); 
  }, [cartItems]);

  // Determine increment step based on unit
  const getStep = (unit: string) => {
    switch (unit) {
      case "g":
        return 50; // grams
      case "kg":
        return 0.5; // kg
      case "ml":
        return 100; // ml
      case "ltr":
        return 0.5; // liters
      default:
        return 1;
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          let step = getStep(item.unit);
          let newQty = item.quantity + delta * step;
          // Minimum quantities: 50g / 0.5kg / 100ml / 0.5ltr / 1
          const minQty = step;
          newQty = Math.max(newQty, minQty);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const savings = cartItems.reduce((sum, item) => {
    const saved = item.originalPrice
      ? (item.originalPrice - item.price) * item.quantity
      : 0;
    return sum + saved;
  }, 0);

  // Delivery fee logic
  const FREE_DELIVERY_THRESHOLD = 500;
  const deliveryFee = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : 30;
  const total = subtotal + deliveryFee;

  const proceedToCheckout = () => {
    navigate("/checkout");
  };

  // -------------------------------------------------------------------
  // EMPTY CART VIEW (Enhanced Styling)
  // -------------------------------------------------------------------
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <div className="container px-4 py-32 text-center">
          <div className="text-8xl mb-6 text-gray-400">🛍️</div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-4">Your Shopping Cart is Empty!</h1>
          <p className="text-gray-600 mb-8">
            Time to fill it up with some farm-fresh goodness.
          </p>
          <Button
            size="lg"
            // Professional primary button styling
            className="
              bg-primary text-white 
              shadow-lg shadow-primary/50 
              hover:bg-primary/90 
              transition duration-200
            " 
            onClick={() => navigate("/products")}
          >
            <ShoppingBag className="mr-2 h-5 w-5" />
            Start Shopping Now
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // FULL CART VIEW (Enhanced Styling)
  // -------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-3xl font-extrabold text-gray-800 border-b pb-4 mb-2">
              Your Items ({cartItems.length})
            </h1>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <Card 
                  key={item.id}
                  // Item card styling with subtle interaction
                  className="
                    shadow-md hover:shadow-lg transition duration-300 
                    border-l-4 border-primary/50 
                    hover:border-primary
                  "
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4 items-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-xl shadow-inner border border-gray-100" 
                      />
                      <div className="flex-1">
                        
                        <div className="flex items-start justify-between">
                          {/* Item Name and Badges */}
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                            <div className="flex space-x-2 mt-1">
                                {item.isOrganic && (
                                    <Badge 
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        Organic
                                    </Badge>
                                )}
                                {item.originalPrice && (
                                    <Badge variant="destructive">Sale</Badge>
                                )}
                            </div>
                          </div>

                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition duration-150"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3">
                            {/* Price Display */}
                            <div className="flex flex-col">
                                <span className="font-extrabold text-xl text-primary">
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                </span>
                                {item.originalPrice && (
                                    <span className="text-sm text-gray-400 line-through">
                                        ₹{(item.originalPrice * item.quantity).toFixed(2)}
                                    </span>
                                )}
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-2 border border-gray-300 rounded-full p-0.5">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="h-8 w-8 rounded-full border-none hover:bg-gray-100 transition"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-10 text-center font-medium">
                                {item.quantity}{item.unit}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="h-8 w-8 rounded-full border-none hover:bg-gray-100 transition"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            {/* Summary card styling for emphasis */}
            <Card className="sticky top-8 shadow-2xl border-primary/30 border-2"> 
              <CardContent className="p-6 space-y-4">
                <h2 className="text-2xl font-extrabold text-gray-800">Order Summary</h2>
                <div className="space-y-3 text-lg">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>Instant Savings</span>
                      <span>-₹{savings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Fee</span>
                    {deliveryFee === 0 ? (
                      <span className="text-green-600 font-medium">FREE</span>
                    ) : (
                      <span className="font-medium">₹{deliveryFee}</span>
                    )}
                  </div>
                  <Separator className="my-4 bg-gray-300" />
                  <div className="flex justify-between text-2xl font-extrabold text-gray-900">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
                {/* Checkout Button */}
                <Button
                  size="lg"
                  // Prominent checkout button with distinct hover
                  className="
                    w-full text-lg 
                    bg-primary 
                    hover:bg-primary/90 
                    transition duration-300 
                    shadow-lg shadow-primary/40
                    mt-6
                  "
                  onClick={proceedToCheckout}
                >
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                {/* Savings/Free Delivery message */}
                {deliveryFee !== 0 && (
                  <p className="text-center text-sm text-gray-500 pt-2">
                    Add **₹{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)}** more for **FREE** delivery!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;