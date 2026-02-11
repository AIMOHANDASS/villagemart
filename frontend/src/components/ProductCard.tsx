// src/components/ProductCard.tsx

import { ShoppingCart, Star, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isOrganic?: boolean;
  onAddToCart?: (deliveryDate?: string) => void; // 👈 accept delivery date
}

const ProductCard: React.FC<ProductCardProps> = ({
  name,
  price,
  originalPrice,
  image,
  category,
  rating,
  reviews,
  inStock,
  isOrganic,
  onAddToCart,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");

  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleAdd = () => {
    if (category === "Garlands") {
      if (!deliveryDate) {
        alert("❌ Please select delivery date & time for Garlands");
        return;
      }

      const selected = new Date(deliveryDate);
      const now = new Date();
      const diffHours =
        (selected.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24) {
        alert("❌ Garland orders must be placed at least 24 hours in advance.");
        return;
      }

      onAddToCart?.(deliveryDate);
      setShowPicker(false);
    } else {
      onAddToCart?.();
    }
  };

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={image}
            alt={name}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-destructive">
              {discount}% OFF
            </Badge>
          )}

          {isOrganic && (
            <Badge className="absolute top-2 right-2 bg-village-green">
              Organic
            </Badge>
          )}

          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {category}
            </p>
            <h3 className="font-semibold text-sm line-clamp-2">{name}</h3>

            {category === "Garlands" && (
              <p className="text-xs text-orange-600 mt-1">
                ⏳ Pre-order only (24 hrs advance)
              </p>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Star className="h-3 w-3 fill-village-gold text-village-gold" />
            <span className="text-xs text-muted-foreground ml-1">
              {rating} ({reviews})
            </span>
          </div>

          {category === "Garlands" && showPicker && (
            <div className="space-y-2">
              <label className="text-xs font-medium flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Delivery Date & Time
              </label>
              <input
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-bold text-lg text-primary">₹{price}</span>

            <Button
              size="sm"
              disabled={!inStock}
              onClick={() =>
                category === "Garlands" ? setShowPicker(true) : handleAdd()
              }
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              {category === "Garlands" ? "Select Date" : "Add"}
            </Button>
          </div>

          {category === "Garlands" && showPicker && (
            <Button size="sm" className="w-full" onClick={handleAdd}>
              Confirm Pre-Order
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
