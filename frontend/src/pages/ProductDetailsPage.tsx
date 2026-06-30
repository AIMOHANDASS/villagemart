import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ShoppingCart,
  Star,
  CalendarClock,
  Leaf,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { apiClient, API_BASE_URL } from "@/api/apiClient";
import toast from "react-hot-toast";

interface Product {
  id: number;
  E_name: string;
  T_name?: string;
  MRP: number;
  s_price: number;
  GST: number;
  imageurl: string;
  images: string[];
  category: string;
  product_type: "solid" | "liquid" | "other";
  inStock: number;
  outStock: number;
  isOrganic: boolean | number;
}

const getPriceMultiplier = (unitString: string): number => {
  switch (unitString) {
    case "1 kg":
    case "1 ltr":
    case "1 qty":
      return 1.0;
    case "500g":
    case "500ml":
      return 0.5;
    case "250g":
    case "250ml":
      return 0.25;
    case "100g":
    case "100ml":
      return 0.1;
    case "50g":
      return 0.05;
    default:
      return 1.0;
  }
};

const getProductImageSrc = (url?: string) => {
  if (!url) return "/placeholder.png";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${cleanUrl}`;
};

export default function ProductDetailsPage({ user }: { user: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cartQuantity, setCartQuantity] = useState(0);

  const dynamicSizes = product?.product_type === "solid"
    ? ["50g", "100g", "250g", "500g", "1 kg"]
    : product?.product_type === "liquid"
    ? ["50ml", "100ml", "250ml", "500ml", "1 ltr"]
    : ["1 qty"];

  const [selectedSize, setSelectedSize] = useState("1 kg");

  useEffect(() => {
    if (product) {
      if (product.product_type === "solid") setSelectedSize("1 kg");
      else if (product.product_type === "liquid") setSelectedSize("1 ltr");
      else setSelectedSize("1 qty");
    }
  }, [product]);

  // Load product details
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response: any = await apiClient.get(`/products/${id}`);
        if (response.success && response.data) {
          setProduct(response.data);
        } else {
          toast.error("Product not found");
        }
      } catch (err) {
        console.error("Error loading product details:", err);
        toast.error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Load existing cart quantity
  useEffect(() => {
    if (product) {
      try {
        const cart = JSON.parse(localStorage.getItem("cart") || "[]");
        const existing = cart.find((item: any) => String(item.id) === String(product.id));
        if (existing) {
          setCartQuantity(existing.quantity);
          if (existing.selectedSize) setSelectedSize(existing.selectedSize);
        }
      } catch (e) {
        console.error("Cart retrieval error:", e);
      }
    }
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <Header user={user} />
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <Header user={user} />
        <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
          <Info className="w-12 h-12 text-stone-300 mb-4" />
          <h1 className="text-2xl font-black text-stone-850">Product Not Found</h1>
          <p className="text-sm text-stone-500 mt-1 max-w-xs">
            The item you are searching for is unavailable or has been removed.
          </p>
          <Button onClick={() => navigate("/")} className="mt-6 rounded-2xl">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const finalImages = product.images.length > 0 ? product.images : [product.imageurl || "/placeholder.png"];
  const sizeMultiplier = getPriceMultiplier(selectedSize);
  const adjustedPrice = product.s_price * sizeMultiplier;
  const adjustedMRP = product.MRP * sizeMultiplier;
  const discount = product.MRP ? Math.round(((product.MRP - product.s_price) / product.MRP) * 100) : 0;

  const handleAddToCart = () => {
    if (product.category === "Garlands" && !deliveryDate) {
      setShowDatePicker(true);
      toast.error("Please pick a delivery schedule for Garland pre-orders.");
      return;
    }

    if (product.category === "Garlands") {
      const selected = new Date(deliveryDate);
      const now = new Date();
      const diffHours = (selected.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24) {
        toast.error("Garland pre-orders must be scheduled at least 24 hours in advance.");
        return;
      }
    }

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingIndex = cart.findIndex((item: any) => String(item.id) === String(product.id));

    const newQty = cartQuantity + 1;

    if (existingIndex >= 0) {
      cart[existingIndex].quantity = newQty;
      cart[existingIndex].selectedSize = selectedSize;
      cart[existingIndex].calculatedUnitPrice = adjustedPrice;
    } else {
      cart.push({
        id: String(product.id),
        name: product.E_name,
        E_name: product.E_name,
        T_name: product.T_name,
        price: product.s_price,
        originalPrice: product.MRP || undefined,
        image: product.imageurl,
        images: product.images,
        category: product.category,
        product_type: product.product_type,
        quantity: newQty,
        selectedSize: selectedSize,
        calculatedUnitPrice: adjustedPrice,
        deliveryDate: product.category === "Garlands" ? deliveryDate : null,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    setCartQuantity(newQty);
    toast.success("Added to cart! 🛒");
  };

  const handleStepChange = (delta: number) => {
    const newQty = Math.max(0, cartQuantity + delta);
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingIndex = cart.findIndex((item: any) => String(item.id) === String(product.id));

    if (newQty === 0) {
      if (existingIndex >= 0) cart.splice(existingIndex, 1);
    } else {
      if (existingIndex >= 0) {
        cart[existingIndex].quantity = newQty;
      }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    setCartQuantity(newQty);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 pb-20">
      <Header user={user} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation / Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors mb-6 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Showcase Display Column */}
          <div className="space-y-4">
            
            {/* Central Main Preview Image */}
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-white dark:bg-stone-900 border border-stone-250/20 shadow-md">
              <img
                src={getProductImageSrc(finalImages[activeImageIdx])}
                alt={product.E_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.png";
                }}
              />

              {/* Navigation Indicators */}
              {finalImages.length > 1 && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                  <button
                    onClick={() => setActiveImageIdx((p) => (p === 0 ? finalImages.length - 1 : p - 1))}
                    className="w-10 h-10 rounded-full bg-white/90 dark:bg-stone-900/90 shadow-md flex items-center justify-center pointer-events-auto hover:bg-white dark:hover:bg-stone-900 hover:scale-105 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-800 dark:text-white" />
                  </button>
                  <button
                    onClick={() => setActiveImageIdx((p) => (p === finalImages.length - 1 ? 0 : p + 1))}
                    className="w-10 h-10 rounded-full bg-white/90 dark:bg-stone-900/90 shadow-md flex items-center justify-center pointer-events-auto hover:bg-white dark:hover:bg-stone-900 hover:scale-105 active:scale-95 transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-800 dark:text-white" />
                  </button>
                </div>
              )}

              {/* Discount/Organic Overlay Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                {discount > 0 && <Badge className="bg-red-500 text-white rounded-full">Sale</Badge>}
                {product.isOrganic && <Badge className="bg-emerald-500 text-white rounded-full flex items-center gap-1"><Leaf className="w-3 h-3" />Organic</Badge>}
              </div>
            </div>

            {/* Selection Thumbnail Gallery */}
            {finalImages.length > 1 && (
              <div className="grid grid-cols-6 gap-3">
                {finalImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIdx === idx
                        ? "border-emerald-500 scale-105 shadow-md shadow-emerald-500/25"
                        : "border-stone-200 dark:border-stone-850 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={getProductImageSrc(img)}
                      alt={`${product.E_name} preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.png";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Actions Column */}
          <div className="flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Product Metadata */}
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{product.category}</span>
                <h1 className="text-3xl font-extrabold text-stone-900 dark:text-white mt-1 capitalize leading-tight">
                  {product.E_name}
                </h1>
                {product.T_name && (
                  <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {product.T_name}
                  </h2>
                )}
                <div className="flex items-center gap-1.5 mt-3">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-stone-500">4.5 (24 reviews)</span>
                </div>
              </div>

              {/* Price Details Card */}
              <Card className="border-stone-200/50 dark:border-stone-850 bg-white/60 dark:bg-stone-900/40 backdrop-blur-sm rounded-2xl shadow-sm">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-stone-400">Total Price</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                        ₹{(adjustedPrice * (cartQuantity || 1)).toFixed(2)}
                      </span>
                      {product.MRP && (
                        <span className="text-sm text-stone-400 line-through">
                          ₹{(adjustedMRP * (cartQuantity || 1)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {discount > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-xl border border-red-150/10 text-xs font-extrabold uppercase tracking-wide">
                      Save {discount}%
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Packing Unit Selection */}
              {product.category !== "Garlands" && dynamicSizes.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-800 dark:text-stone-200">Select Packaging Option</label>
                  <div className="flex flex-wrap gap-2">
                    {dynamicSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all ${
                          selectedSize === size
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "border-stone-200 bg-white text-stone-600 dark:border-stone-850 dark:bg-stone-900 hover:border-emerald-200"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Garlands Pre-order Date Options */}
              {product.category === "Garlands" && (
                <div className="space-y-3 bg-orange-50/40 dark:bg-orange-950/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                  <label className="text-sm font-bold text-stone-850 dark:text-stone-200 flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-orange-500" />
                    Preferred Delivery Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full border border-stone-250 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                  />
                  <p className="text-[11px] text-orange-700 font-medium">
                    ⚠️ Garland orders require a 24-hour advance preparation window.
                  </p>
                </div>
              )}
            </div>

            {/* Call To Action Buttons */}
            <div className="pt-8">
              {cartQuantity === 0 ? (
                <Button
                  onClick={handleAddToCart}
                  disabled={product.inStock === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14 text-base font-bold shadow-xl shadow-emerald-500/25 transition-all"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {product.inStock === 0 ? "Out of Stock" : `Add to Cart (₹${adjustedPrice.toFixed(2)})`}
                </Button>
              ) : (
                <div className="flex items-center justify-between border-2 border-emerald-500 bg-emerald-50/50 rounded-2xl p-2 h-14 w-full">
                  <button
                    onClick={() => handleStepChange(-1)}
                    className="w-10 h-10 rounded-xl bg-white hover:bg-stone-50 border border-emerald-200 flex items-center justify-center font-extrabold text-emerald-700 text-lg shadow-sm"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wider">In Cart</span>
                    <span className="text-sm font-black text-emerald-800">{cartQuantity} packs ({selectedSize})</span>
                  </div>
                  <button
                    onClick={() => handleStepChange(1)}
                    className="w-10 h-10 rounded-xl bg-white hover:bg-stone-50 border border-emerald-200 flex items-center justify-center font-extrabold text-emerald-700 text-lg shadow-sm"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
