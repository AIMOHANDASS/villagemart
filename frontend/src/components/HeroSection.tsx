import { ArrowRight, Leaf, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* ================= HERO UI ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background to-village-earth/30">
        <div className="container px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                  Fresh from
                  <span className="text-primary block">Village to You</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-md">
                  Get fresh groceries and beautiful garlands delivered to your doorstep. 
                  Quality products from local vendors, trusted by villages.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-village-green-light text-primary-foreground"
                  onClick={() => navigate("/products")}
                >
                  Shop Groceries
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="border-village-gold text-village-gold hover:bg-village-gold hover:text-white"
                  onClick={() => navigate("/products")}
                >
                  Browse Garlands
                  <Gift className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="text-center sm:text-left">
                  <div className="text-2xl font-bold text-primary">500+</div>
                  <div className="text-sm text-muted-foreground">
                    Fresh Products
                  </div>
                </div>

                <div className="text-center sm:text-left">
                  <div className="text-2xl font-bold text-primary">24hr</div>
                  <div className="text-sm text-muted-foreground">
                    Delivery
                  </div>
                </div>
              </div>
            </div>

            {/* ================= RIGHT CARDS ================= */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-card rounded-xl p-6 shadow-soft border">
                    <Leaf className="h-8 w-8 text-village-green mb-3" />
                    <h3 className="font-semibold mb-2">
                      Fresh Groceries
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Farm-fresh vegetables, fruits, and daily essentials
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-village-gold/10 to-village-gold/20 rounded-xl p-6 border border-village-gold/20">
                    <Gift className="h-8 w-8 text-village-gold-dark mb-3" />
                    <h3 className="font-semibold mb-2">
                      Beautiful Garlands
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Handmade garlands for weddings and special occasions
                    </p>
                  </div>
                </div>

                <div className="pt-8">
                  <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-3">
                      <span className="text-primary-foreground font-bold">
                        ₹
                      </span>
                    </div>
                    <h3 className="font-semibold mb-2">
                      UPI Payments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Pay with GPay, PhonePe, Paytm or Net Banking
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SEO TEXT SECTION ================= */}
      <section className="max-w-5xl mx-auto px-4 py-10 text-center">
        <h2 className="text-3xl font-bold mb-4">
          VillageMart – Online Grocery Store for Fresh Vegetables, Fruits & Groceries
        </h2>

        <p className="text-gray-600 leading-7">
          VillageMart is a trusted online grocery delivery platform serving villages and rural communities.
          Order fresh vegetables, seasonal fruits, daily groceries, flowers and garlands directly from local farmers and vendors.
          We provide fast doorstep delivery with secure UPI payment options like GPay, PhonePe and Paytm.
        </p>

        <p className="mt-4 text-gray-600 leading-7">
          Looking for fresh vegetables near you? Buy groceries online at affordable prices with guaranteed quality.
          VillageMart connects villages digitally for easy shopping and better livelihoods.
        </p>
      </section>
    </>
  );
};

export default HeroSection;
