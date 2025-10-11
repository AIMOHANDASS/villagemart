// src/pages/AdminPanel.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Purchase {
  _id: string;
  user: string;
  items: string[];
  status: string;
}

interface Product {
  _id?: string; // MongoDB _id
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isOrganic: boolean;
}

const AdminPanel: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    price: "",
    image: "",
    category: "",
    rating: "",
    reviews: "",
    inStock: true,
    isOrganic: false,
  });

  // Fetch purchases
  const fetchPurchases = async () => {
    try {
      const res = await axios.get<Purchase[]>("http://localhost:5000/api/orders");
      setPurchases(res.data);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const res = await axios.get<Product[]>("http://localhost:5000/api/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
  }, []);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Add new product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/api/products", {
        ...formData,
        price: Number(formData.price),
        rating: Number(formData.rating) || 0,
        reviews: Number(formData.reviews) || 0,
      });
      alert("✅ Product added successfully!");
      setFormData({
        id: "",
        name: "",
        price: "",
        image: "",
        category: "",
        rating: "",
        reviews: "",
        inStock: true,
        isOrganic: false,
      });
      fetchProducts();
    } catch (err) {
      console.error("Error adding product:", err);
      alert("❌ Failed to add product");
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/products/${id}`);
      alert("🗑️ Product deleted!");
      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Admin Panel</h1>

      {/* Purchases Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">User Purchases</h2>
        <ul className="bg-white shadow rounded p-4 space-y-2">
          {purchases.map((p) => (
            <li key={p._id} className="border-b py-2">
              <span className="font-medium">User:</span> {p.user} |{" "}
              <span className="font-medium">Items:</span> {p.items.join(", ")} |{" "}
              <span className="font-medium">Status:</span> {p.status}
            </li>
          ))}
        </ul>
      </section>

      {/* Add Product Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Add New Product</h2>
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 shadow rounded grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Input name="id" placeholder="ID" value={formData.id} onChange={handleChange} required />
          <Input name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
          <Input name="price" type="number" placeholder="Price" value={formData.price} onChange={handleChange} required />
          <Input name="image" placeholder="Image URL" value={formData.image} onChange={handleChange} />
          <Input name="category" placeholder="Category" value={formData.category} onChange={handleChange} />
          <Input name="rating" type="number" placeholder="Rating" value={formData.rating} onChange={handleChange} />
          <Input name="reviews" type="number" placeholder="Reviews" value={formData.reviews} onChange={handleChange} />

          <label className="flex items-center gap-2">
            <input type="checkbox" name="inStock" checked={formData.inStock} onChange={handleChange} />
            In Stock
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isOrganic" checked={formData.isOrganic} onChange={handleChange} />
            Organic
          </label>

          <Button type="submit" className="col-span-full">
            ➕ Add Product
          </Button>
        </form>
      </section>

      {/* Product List Section */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Product List</h2>
        <ul className="bg-white shadow rounded p-4 space-y-2">
          {products.map((product) => (
            <li key={product._id} className="flex justify-between items-center border-b py-2">
              <span>
                {product.name} — ₹{product.price} ({product.category})
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteProduct(product._id!)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminPanel;
