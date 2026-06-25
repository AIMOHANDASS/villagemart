// src/pages/Products.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { API_BASE_URL } from "@/api/apiClient";

/* ================= TYPES ================= */

type Product = {
  id: string;
  name: string;
  T_name?: string;
  price: number;
  image: string;
  category: "Fruits" | "Vegetables" | "Groceries" | "Garlands" | "Dairy" | "Grains" | "Village Specials";
  product_type: "solid" | "liquid";
  rating: number;
  reviews: number;
  inStock: boolean;
  stock: number;
  isOrganic: boolean;
};

type Props = {
  user: any;
};

/* ================= SKELETON LOADER ================= */

const ProductSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-card shadow-md border-0">
    <div className="w-full h-48 skeleton animate-shimmer" />
    <div className="p-4 space-y-3">
      <div className="skeleton-text w-16 h-3" />
      <div className="skeleton-text w-full h-4" />
      <div className="skeleton-text w-24 h-3" />
      <div className="flex justify-between items-center mt-3">
        <div className="skeleton-text w-16 h-6" />
        <div className="skeleton w-20 h-8" />
      </div>
    </div>
  </div>
);

const SkeletonGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
    {Array.from({ length: 10 }).map((_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);

/* ================= PAGE ANIMATION ================= */

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariant = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/* ================= COMPONENT ================= */

const Products: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlCategory = searchParams.get("category");
  const urlSearch = (searchParams.get("search") || "").toLowerCase();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  /* ================= CATEGORIES ================= */

  const categories: { value: Product["category"] | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Groceries", label: "🛒 Groceries" },
    { value: "Dairy", label: "🥛 Dairy" },
    { value: "Vegetables", label: "🥕 Vegetables" },
    { value: "Fruits", label: "🍎 Fruits" },
    { value: "Grains", label: "🌾 Grains" },
    { value: "Garlands", label: "🌸 Garlands" },
    { value: "Village Specials", label: "🌴 Village Specials" },
  ];

  /* ================= HANDLE URL PARAMS ================= */

  useEffect(() => {
    if (urlCategory) setSelectedCategory(urlCategory);
    else setSelectedCategory("all");
  }, [urlCategory]);

  /* ================= FETCH PRODUCTS ================= */

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // 🎯 Enforce zero CSV file fallback. Direct MySQL API streaming only.
        const res = await fetch(`${API_BASE_URL}/products`);
        if (!res.ok) throw new Error("Failed to load products from database.");

        const json = await res.json();
        const rows = json.data || json || [];

        const parsedProducts: Product[] = rows.map((row: any) => ({
          id: String(row.id),
          name: row.E_name || "",
          T_name: row.T_name || "",
          price: Number(row.s_price) || 0,
          image: row.imageurl || "",
          category: row.category as Product["category"],
          product_type: row.product_type || "solid",
          rating: 4.5,
          reviews: 0,
          inStock: Number(row.inStock) > 0,
          stock: Number(row.inStock) || 0,
          isOrganic: !!row.isOrganic,
        }));

        setProducts(parsedProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  /* ================= FILTER + SORT ================= */

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (urlSearch) {
      const exact = list.filter((p) => p.name.toLowerCase() === urlSearch);

      const relatedName = list.filter(
        (p) =>
          p.name.toLowerCase().includes(urlSearch) &&
          p.name.toLowerCase() !== urlSearch
      );

      const relatedCategory = exact.length
        ? list.filter(
            (p) =>
              p.category === exact[0].category &&
              !p.name.toLowerCase().includes(urlSearch)
          )
        : [];

      const mixed = [...relatedName, ...relatedCategory].sort(
        () => 0.5 - Math.random()
      );

      return [...exact, ...mixed];
    }

    if (selectedCategory !== "all") {
      list = list.filter(
        (p) => p.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    return list;
  }, [products, selectedCategory, urlSearch]);

  /* ================= CART LOGIC (GARLAND DELIVERY DATE) ================= */

  const addToCart = (product: Product, deliveryDate?: string, size?: string, quantity?: number, unitPrice?: number) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existingIndex = cart.findIndex((item: any) => item.id === product.id);

    const newQty = quantity ?? 1;
    const newUnit = size || "1 qty";

    if (newQty === 0) {
      if (existingIndex >= 0) {
        cart.splice(existingIndex, 1);
        toast.success(`${product.name} removed from cart`);
      }
    } else {
      if (existingIndex >= 0) {
        cart[existingIndex].quantity = newQty;
        cart[existingIndex].selectedSize = newUnit;
        if (unitPrice !== undefined) cart[existingIndex].calculatedUnitPrice = unitPrice;
      } else {
        cart.push({
          ...product,
          quantity: newQty,
          selectedSize: newUnit,
          calculatedUnitPrice: unitPrice !== undefined ? unitPrice : product.price,
          deliveryDate: product.category === "Garlands" ? deliveryDate || null : null,
        });
      }
      toast.success(`${product.name} added to cart!`);
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
  };

  /* ================= UI ================= */

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-background"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
    >
      <Header user={user} />

      {/* CATEGORY BUTTONS */}
      <section className="bg-white/80 dark:bg-card/80 backdrop-blur-md border-b py-4 sticky top-[64px] z-20">
        <div className="container px-4 flex flex-wrap gap-3 justify-center">
          {categories.map((cat) => (
            <motion.div
              key={cat.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={selectedCategory === cat.value ? "default" : "outline"}
                className={`rounded-full px-5 shadow-sm transition-all duration-300 ${
                  selectedCategory === cat.value
                    ? "shadow-md shadow-primary/30"
                    : "hover:shadow-md"
                }`}
                onClick={() => navigate(`/products?category=${cat.value}`)}
              >
                {cat.label}
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRODUCTS GRID */}
      <section className="py-12">
        <div className="container px-4">
          {isLoading ? (
            <SkeletonGrid />
          ) : filteredProducts.length > 0 ? (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  variants={cardVariant}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <ProductCard
                    {...product}
                    onAddToCart={(deliveryDate, size, quantity, unitPrice) =>
                      addToCart(product, deliveryDate, size, quantity, unitPrice)
                    }
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-600 dark:text-gray-400 font-medium">
                No products found.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try a different category or search term.
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </motion.div>
  );
};

export default Products;
