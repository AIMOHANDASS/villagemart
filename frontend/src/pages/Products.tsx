// src/pages/Products.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CheckCircle, Info } from "lucide-react";

/* ================= TYPES ================= */

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  category: "Fruits" | "Vegetables" | "Groceries" | "Garlands" | "Dairy" | "Grains";
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
  action: "added" | "exists";
};

/* ================= COMPONENT ================= */

const Products: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlCategory = searchParams.get("category");
  const urlSearch = (searchParams.get("search") || "").toLowerCase();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [notification, setNotification] = useState<Notification>({
    visible: false,
    productName: "",
    action: "added",
  });

  /* ================= CATEGORIES ================= */

  const categories: { value: Product["category"] | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Groceries", label: "🛒 Groceries" },
    { value: "Dairy", label: "🥛 Dairy" },
    { value: "Vegetables", label: "🥕 Vegetables" },
    { value: "Fruits", label: "🍎 Fruits" },
    { value: "Grains", label: "🌾 Grains" },
    { value: "Garlands", label: "🌸 Garlands" },
  ];

  /* ================= HANDLE URL PARAMS ================= */

  useEffect(() => {
    if (urlCategory) setSelectedCategory(urlCategory);
    else setSelectedCategory("all");
  }, [urlCategory]);

  /* ================= FETCH PRODUCTS ================= */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/datadetails1.csv");
        if (!res.ok) throw new Error("Failed to load products file.");

        const csvText = await res.text();
        const rows = csvText.split("\n").slice(1);

        const parsedProducts: Product[] = rows
          .map((row) => {
            const cols = row.split(",");
            if (cols.length < 9) return null;

            return {
              id: cols[0]?.replace(/"/g, ""),
              name: cols[1]?.replace(/"/g, ""),
              price: parseFloat(cols[2]),
              image: cols[3]?.replace(/"/g, ""),
              category: cols[4] as Product["category"],
              rating: parseFloat(cols[5]),
              reviews: parseInt(cols[6]),
              inStock: cols[7]?.toLowerCase() === "true",
              isOrganic: cols[8]?.toLowerCase() === "true",
            };
          })
          .filter((item): item is Product => item !== null);

        setProducts(parsedProducts);
      } catch (err) {
        console.error("Error fetching products:", err);
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

  const showNotification = (productName: string, action: "added" | "exists") => {
    setNotification({ visible: true, productName, action });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, visible: false }));
    }, 2500);
  };

  const addToCart = (product: Product, deliveryDate?: string) => {
    const rawCart = localStorage.getItem("cart");
    let cart: any[] = rawCart ? JSON.parse(rawCart) : [];

    const existing = cart.find((item: any) => item.id === product.id);

    let initialUnit = "unit";
    if (product.category === "Groceries") initialUnit = "kg";
    else if (product.category === "Fruits" || product.category === "Vegetables")
      initialUnit = "kg";
    else if (product.category === "Garlands") initialUnit = "unit";

    const initialQuantity = initialUnit === "kg" ? 0.5 : 1;

    let action: "added" | "exists";

    if (existing) {
      action = "exists";
    } else {
      cart.push({
        ...product,
        quantity: initialQuantity,
        unit: initialUnit,
        deliveryDate:
          product.category === "Garlands" ? deliveryDate || null : null,
      });

      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("storage"));
      action = "added";
    }

    showNotification(product.name, action);
  };

  /* ================= POPUP ================= */

  const NotificationPopup = () => {
    if (!notification.visible) return null;

    const isExists = notification.action === "exists";

    return (
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
        bg-white p-6 rounded-xl shadow-2xl border-2 z-50 max-w-xs w-full text-center animate-in fade-in zoom-in"
        style={{ borderColor: isExists ? "#f59e0b" : "#10b981" }}
      >
        {isExists ? (
          <Info className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
        ) : (
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
        )}

        <h3 className="text-lg font-bold mb-1">
          {isExists ? "Item Already in Cart!" : "Added to Cart!"}
        </h3>

        <p className="text-sm text-gray-600">
          <span className="font-semibold">{notification.productName}</span>{" "}
          {isExists ? " is already in your cart." : " is ready for checkout."}
        </p>

        <Button size="sm" className="mt-4" onClick={() => navigate("/cart")}>
          <ShoppingCart className="h-4 w-4 mr-2" />
          View Cart
        </Button>
      </div>
    );
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <NotificationPopup />

      {/* CATEGORY BUTTONS */}
      <section className="bg-white border-b py-4 sticky top-0 z-20">
        <div className="container px-4 flex flex-wrap gap-3 justify-center">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              onClick={() => navigate(`/products?category=${cat.value}`)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </section>

      {/* PRODUCTS GRID */}
      <section className="py-12">
        <div className="container px-4">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  onAddToCart={(deliveryDate) =>
                    addToCart(product, deliveryDate)
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-xl text-gray-600 py-16">
              No products found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Products;
