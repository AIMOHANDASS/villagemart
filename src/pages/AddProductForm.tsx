// src/pages/AddProductForm.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onAdd: (product: Product) => void;
};

const categories = [
  { value: "Vegetables", label: "Vegetables" },
  { value: "Fruits", label: "Fruits" },
  { value: "Garlands", label: "Garlands" },
  { value: "Dairy", label: "Dairy" },
  { value: "Spices", label: "Spices" },
];

const AddProductForm: React.FC<Props> = ({ onAdd }) => {
  const [product, setProduct] = useState<Product>({
    id: "",
    name: "",
    price: 0,
    image: "",
    category: categories[0].value,
    rating: 5,
    reviews: 0,
    inStock: true,
    isOrganic: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    setProduct((prev) => ({ ...prev, category: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.id || !product.name || !product.price || !product.category) {
      alert("Please fill all required fields!");
      return;
    }
    onAdd(product);
    // Reset form
    setProduct({
      id: "",
      name: "",
      price: 0,
      image: "",
      category: categories[0].value,
      rating: 5,
      reviews: 0,
      inStock: true,
      isOrganic: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-md mx-auto bg-white rounded shadow">
      <div>
        <Label>ID</Label>
        <Input name="id" value={product.id} onChange={handleChange} placeholder="Product ID" />
      </div>

      <div>
        <Label>Name</Label>
        <Input name="name" value={product.name} onChange={handleChange} placeholder="Product Name" />
      </div>

      <div>
        <Label>Price</Label>
        <Input
          name="price"
          type="number"
          value={product.price}
          onChange={handleChange}
          placeholder="Price"
        />
      </div>

      <div>
        <Label>Image URL</Label>
        <Input name="image" value={product.image} onChange={handleChange} placeholder="Image URL" />
      </div>

      <div>
        <Label>Category</Label>
        <Select value={product.category} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Rating</Label>
        <Input
          name="rating"
          type="number"
          value={product.rating}
          onChange={handleChange}
          placeholder="Rating"
          min={0}
          max={5}
        />
      </div>

      <div>
        <Label>Reviews</Label>
        <Input
          name="reviews"
          type="number"
          value={product.reviews}
          onChange={handleChange}
          placeholder="Number of Reviews"
          min={0}
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            name="inStock"
            type="checkbox"
            checked={product.inStock}
            onChange={handleChange}
          />
          <span>In Stock</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            name="isOrganic"
            type="checkbox"
            checked={product.isOrganic}
            onChange={handleChange}
          />
          <span>Organic</span>
        </label>
      </div>

      <Button type="submit" className="w-full">
        Add Product
      </Button>
    </form>
  );
};

export default AddProductForm;
