// src/pages/Products.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Note: Changed from 'axios' to standard 'fetch' for static file reading simulation
// import axios from "axios"; 

import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, Search, X, ShoppingCart, CheckCircle, Info } from "lucide-react";

// --- UPDATED TYPE DEFINITION (Fixed: ID is now string to match ProductCardProps expectation) ---
type Product = {
  id: string; // FIX 2: Changed from number to string to resolve ProductCardProps incompatibility (code 2322)
  name: string;
  price: number;
  image: string;
  category: "Fruits" | "Vegetables" | "Groceries" | "Garlands"; 
  rating: number; 
  reviews: number; 
  inStock: boolean; 
  isOrganic: boolean; 
};

type Props = {
  user: any;
};

type Notification = {
  visible: boolean;
  productName: string;
  action: 'added' | 'exists'; 
};

// API_BASE is only used for cart logic, not product fetching in this update
const API_BASE = "http://localhost:5000/api"; 

const Products: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Groceries"); 
  const [searchQuery, setSearchQuery] = useState("");
  
  const [notification, setNotification] = useState<Notification>({
    visible: false,
    productName: '',
    action: 'added',
  });

  // --- CATEGORIES FOR FILTERING ---
  const categories: { value: Product['category'] | "all"; label: string }[] = [
    { value: "all", label: "All Categories" },
    { value: "Groceries", label: "Groceries" },
    { value: "Fruits", label: "Fruits" },
    { value: "Vegetables", label: "Vegetables" },
    { value: "Garlands", label: "Garlands" },
  ];

  // --- Fetching data from local path ---
  const fetchProducts = async () => {
    try {
      const res = await fetch("/datadetails1.csv"); 
      
      if (!res.ok) {
        throw new Error("Failed to load products file.");
      }
      
      const csvText = await res.text();
      const rows = csvText.split('\n').slice(1); 
      
      const parsedProducts: Product[] = rows.map((row, index) => {
        const cols = row.split(',');
        if (cols.length < 9) return null; 
        
        return {
          // FIX 2: Convert ID to string here
          id: cols[0].replace(/"/g, ''), 
          name: cols[1].replace(/"/g, ''),
          price: parseFloat(cols[2]),
          image: cols[3].replace(/"/g, ''), 
          category: cols[4] as Product['category'],
          rating: parseFloat(cols[5]),
          reviews: parseInt(cols[6]),
          inStock: cols[7].toLowerCase() === 'true',
          isOrganic: cols[8].toLowerCase() === 'true',
        };
      }).filter((item): item is Product => item !== null);

      setProducts(parsedProducts);

    } catch (err) {
      console.error("Error fetching or parsing products:", err);
      // Fallback or display error message
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

  // --- FILTERING LOGIC ---
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  

  const addToCart = (product: Product) => {
    const rawCart = localStorage.getItem("cart");
    let cart: any[] = rawCart ? JSON.parse(rawCart) : []; 

    const existing = cart.find((item: any) => item.id === product.id);
    
    // FIX 1: Initial quantity logic updated to remove 'Dairy' check, 
    // resolving the "types have no overlap" error (code 2367).
    // Uses a sensible default of 'kg' or 'unit' based on product category type.
    let initialUnit = 'unit'; // Default for non-weight items
    if (product.category === 'Groceries') {
      initialUnit = 'kg';
    } else if (product.category === 'Fruits' || product.category === 'Vegetables') {
        initialUnit = 'kg';
    } else if (product.category === 'Garlands') {
        initialUnit = 'unit';
    }
    
    // Set a default quantity based on the unit
    const initialQuantity = initialUnit === 'kg' ? 0.5 : 1; 
    
    let action: 'added' | 'exists';

    if (existing) {
      // DO NOT MODIFY QUANTITY: Show exists notification
      action = 'exists'; 
    } else {
      cart.push({ 
        ...product, 
        quantity: initialQuantity, 
        unit: initialUnit 
      });
      action = 'added'; // New item added to cart
    }
    
    if (action === 'added') {
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("storage")); 
    }

    showNotification(product.name, action);
  };

  // NotificationPopup component (Unchanged)
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
                    borderColor: isExists ? '#f59e0b' : '#10b981', 
                    animation: 'fadeInUp 0.3s ease-out'
                }}
            >
                
                {isExists ? (
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


  return (
    <div className="min-h-screen bg-gray-50"> 
      <Header user={user} />
      
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