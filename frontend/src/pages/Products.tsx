// src/pages/Products.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X, ShoppingCart, CheckCircle, Info } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isOrganic: boolean;
};

type Props = {
  user: any;
};

// State type for the notification pop-up
type Notification = {
  visible: boolean;
  productName: string;
  // Updated actions: 'added' (new item) or 'exists' (already in cart, quantity unchanged)
  action: 'added' | 'exists'; 
};

const API_BASE = "http://localhost:5000/api"; 

const Products: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [notification, setNotification] = useState<Notification>({
    visible: false,
    productName: '',
    action: 'added',
  });

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "Vegetables", label: "Vegetables" },
    { value: "Fruits", label: "Fruits" },
    { value: "Garlands", label: "Garlands" },
    { value: "Dairy", label: "Dairy" },
    { value: "Spices", label: "Spices" },
  ];

  const fetchProducts = async () => {
    try {
      const res = await axios.get<Product[]>(`${API_BASE}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showNotification = (productName: string, action: 'added' | 'exists') => {
    setNotification({ visible: true, productName, action });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 2500); 
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- UPDATED addToCart LOGIC: DO NOT INCREASE QUANTITY ---
  const addToCart = (product: Product) => {
    const rawCart = localStorage.getItem("cart");
    let cart: any[] = rawCart ? JSON.parse(rawCart) : []; 

    const existing = cart.find((item: any) => item.id === product.id);
    
    const initialUnit = product.category === 'Dairy' ? 'ltr' : 'kg';
    const initialQuantity = initialUnit === 'kg' || initialUnit === 'ltr' ? 0.5 : 1;
    
    let action: 'added' | 'exists';

    if (existing) {
      // DO NOT MODIFY QUANTITY HERE: Just set the action to 'exists'
      action = 'exists'; 
    } else {
      cart.push({ 
        ...product, 
        quantity: initialQuantity, 
        unit: initialUnit 
      });
      action = 'added'; // New item added to cart
    }
    
    // Only update localStorage if a new item was actually added
    if (action === 'added') {
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("storage")); 
    }

    // Show the pop-up notification
    showNotification(product.name, action);
  };
  // --------------------------------------------------------


  // --- UPDATED: Notification Pop-up Component ---
  const NotificationPopup = () => {
    if (!notification.visible) return null;

    const isExists = notification.action === 'exists';
    
    return (
        <>
            <style>
                {`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translate(-50%, -40%); }
                        to { opacity: 1; transform: translate(-50%, -50%); }
                    }
                `}
            </style>
            
            <div 
                className="
                    fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                    bg-white p-6 rounded-xl shadow-2xl border-2 z-50 
                    max-w-xs w-full text-center 
                    transition-opacity duration-300
                "
                style={{ 
                    // Use a warning/info color for 'already exists'
                    borderColor: isExists ? '#f59e0b' : '#10b981', 
                    animation: 'fadeInUp 0.3s ease-out'
                }}
            >
                
                {isExists ? (
                    // Use Info or a different icon for notification/warning
                    <Info className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                ) : (
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                )}

                <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {isExists ? 'Item Already in Cart!' : 'Added to Cart!'}
                </h3>
                <p className="text-sm text-gray-600">
                    <span className="font-semibold">{notification.productName}</span> 
                    {isExists ? ' is already in your cart.' : ' is ready for checkout.'}
                </p>

                <Button 
                    size="sm"
                    className="mt-4 bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/cart")}
                >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Cart
                </Button>
            </div>
        </>
    );
  };
  // ------------------------------------


  return (
    <div className="min-h-screen bg-gray-50"> 
      <Header user={user} />
      
      {/* Render the corrected Notification Pop-up */}
      <NotificationPopup />

      {/* Filters + Search Section */}
      <section className="py-8 bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="container px-4">
          
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <h1 className="text-3xl font-extrabold text-gray-800 hidden lg:block">Our Products</h1>
            
            <div className="relative flex-1 w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 py-6 h-12 rounded-xl border-gray-300 focus:border-blue-500 transition duration-200 shadow-sm" 
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-gray-800"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-60 h-12 rounded-xl text-md font-medium shadow-sm border-gray-300 transition duration-200 hover:border-blue-500">
                <Filter className="h-5 w-5 mr-2 text-blue-600" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-2">
            {(selectedCategory !== "all" || searchQuery) && (
              <span className="text-sm font-semibold text-gray-600 mr-2">
                Active Filters:
              </span>
            )}
            
            {selectedCategory !== "all" && (
              <Badge 
                className="
                  bg-blue-500 text-white 
                  hover:bg-blue-600 
                  py-1.5 px-3 text-sm 
                  rounded-full gap-1 
                  shadow-md
                "
              >
                {categories.find((c) => c.value === selectedCategory)?.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 text-white hover:bg-transparent hover:text-gray-100"
                  onClick={() => setSelectedCategory("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {searchQuery && (
              <Badge variant="secondary" className="py-1.5 px-3 text-sm rounded-full gap-1">
                Search: "{searchQuery}"
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container px-4">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  onAddToCart={() => addToCart(product)}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-xl text-gray-600 py-16">
              <Search className="h-6 w-6 inline-block mr-2 text-gray-400" />
              Sorry, no products match your search or filter criteria.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Products;