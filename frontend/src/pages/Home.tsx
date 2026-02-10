import React from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import tomatoesImg from "@/assets/tomatoes.jpg";
import jasmineGarlandImg from "@/assets/jasmine-garland.jpg";
import bananasImg from "@/assets/bananas.jpg";
import marigoldGarlandImg from "@/assets/marigold-garland.jpg";
import Products from "./Products";

interface HomeProps {
  user?: { username?: string };
}

const Home: React.FC<HomeProps> = ({ user }) => {
  const navigate = useNavigate();
  const username = user?.username ?? "Guest";

  const featuredProducts = [
    {
      id: "1",
      name: "Fresh Tomatoes",
      price: 45,
      originalPrice: 60,
      image: tomatoesImg,
      category: "Vegetables",
      rating: 4.5,
      reviews: 124,
      inStock: true,
      isOrganic: true,
    },
    {
      id: "2",
      name: "Wedding Garland - Jasmine",
      price: 250,
      originalPrice: 300,
      image: jasmineGarlandImg,
      category: "Garlands",
      rating: 4.8,
      reviews: 89,
      inStock: true,
    },
    {
      id: "3",
      name: "Fresh Bananas",
      price: 35,
      image: bananasImg,
      category: "Fruits",
      rating: 4.3,
      reviews: 67,
      inStock: true,
      isOrganic: true,
    },
    {
      id: "4",
      name: "Marigold Garland",
      price: 120,
      originalPrice: 150,
      image: marigoldGarlandImg,
      category: "Garlands",
      rating: 4.6,
      reviews: 45,
      inStock: true,
    },
  ];

  const categories = [
    { name: "Groceries", icon: "🛒", count: "150+ items" },
    { name: "Vegetables", icon: "🥕", count: "120+ items" },
    { name: "Fruits", icon: "🍎", count: "85+ items" },
    { name: "Dairy", icon: "🥛", count: "35+ items" },
    { name: "Garlands", icon: "🌸", count: "50+ items" },
    { name: "Grains", icon: "🌾", count: "25+ items" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <HeroSection />

      {/* Welcome message */}
      <div className="container px-4 py-8">
        <h1 className="text-xl md:text-2xl font-semibold">
          Welcome, {username}!
        </h1>
      </div>

      {/* Categories Section */}
      <section className="py-16 bg-village-earth/20">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Shop by Category</h2>
            <p className="text-muted-foreground">
              Find everything you need for your home and celebrations
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 border hover:border-primary/20"
                onClick={() => navigate(`/products?category=${category.name}`)}
              >
                <div className="text-3xl mb-3">{category.icon}</div>
                <h3 className="font-semibold mb-1">{category.name}</h3>
                <p className="text-xs text-muted-foreground">{category.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16">
        <div className="container px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center space-x-2 text-village-gold-dark mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wide">
                  Trending Now
                </span>
              </div>
              <h2 className="text-3xl font-bold">Featured Products</h2>
              <p className="text-muted-foreground mt-2">
                Popular items in your area
              </p>
            </div>
            <Button
              variant="outline"
              className="hidden sm:flex"
              onClick={() => navigate("/products")}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>

          <div className="text-center mt-8 sm:hidden">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/products")}
            >
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>


      {/* Trust Section */}
      <section className="py-16 bg-gradient-to-r from-village-green/5 to-village-gold/5">
        <div className="container px-4 text-center">
          <h2 className="text-2xl font-bold mb-8">Why Choose VillageMart?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto">
                <span className="text-primary-foreground text-xl">🚚</span>
              </div>
              <h3 className="font-semibold">Fast Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Same day delivery in most areas
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-village-gold rounded-full flex items-center justify-center mx-auto">
                <span className="text-white text-xl">🌱</span>
              </div>
              <h3 className="font-semibold">Fresh Quality</h3>
              <p className="text-sm text-muted-foreground">
                Direct from farms and local vendors
              </p>
            </div>
            <div className="space-y-3">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto">
                <span className="text-secondary-foreground text-xl">💳</span>
              </div>
              <h3 className="font-semibold">Easy Payments</h3>
              <p className="text-sm text-muted-foreground">
                Multiple UPI options available
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
