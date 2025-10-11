// src/components/ProductCard.tsx
import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  onAddToCart?: () => void; // Optional prop to handle add to cart
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
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardContent className="p-0">
        {/* Product Image */}
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={image}
            alt={name}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {discount > 0 && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
              {discount}% OFF
            </Badge>
          )}
          {isOrganic && (
            <Badge className="absolute top-2 right-2 bg-village-green text-primary-foreground">
              Organic
            </Badge>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {category}
            </p>
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {name}
            </h3>
          </div>

          {/* Rating */}
          <div className="flex items-center space-x-1">
            <div className="flex items-center">
              <Star className="h-3 w-3 fill-village-gold text-village-gold" />
              <span className="text-xs text-muted-foreground ml-1">
                {rating} ({reviews})
              </span>
            </div>
          </div>

          {/* Price & Add Button */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-primary">₹{price}</span>
                {originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{originalPrice}
                  </span>
                )}
              </div>
            </div>

            <Button
              size="sm"
              disabled={!inStock}
              className="bg-village-green hover:bg-village-green-light flex items-center"
              onClick={onAddToCart} // ✅ Attach the prop here
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
