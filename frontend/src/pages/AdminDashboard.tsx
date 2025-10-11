// src/pages/AdminDashboard.tsx

import { useState } from "react";
import { Product } from "@/types/product";

export default function AdminDashboard() {
  const [purchases, setPurchases] = useState<Product[]>([]);

  // Dummy data - replace with fetch logic
  const exampleProduct: Product = {
    id: "1",
    name: "Organic Rice",
    price: 200,
    image: "https://via.placeholder.com/100",
    category: "Grocery",
    rating: 4.5,
    reviews: 120,
    inStock: true,
    isOrganic: true,
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Admin Dashboard</h1>
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-lg mb-2">User Purchase List</h2>
        <ul>
          <li className="border-b p-2">User 1: {exampleProduct.name} - Not Delivered</li>
        </ul>
      </div>

      <a
        href="/admin/add-product"
        className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded"
      >
        ➕ Add New Product
      </a>
    </div>
  );
}
