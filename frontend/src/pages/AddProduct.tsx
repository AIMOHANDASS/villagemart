import { useState } from 'react';
import { Product } from '../types/product';

interface Props {
  onAdd: (product: Product) => void;
}

export default function AddProductForm({ onAdd }: Props) {
  const [form, setForm] = useState<Product>({
    id: '',
    name: '',
    price: 0,
    image: '',
    category: '',
    rating: 0,
    reviews: 0,
    inStock: true,
    isOrganic: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(form);
      }}
      className="bg-white shadow-md rounded px-8 py-6 mt-4"
    >
      <h2 className="text-lg font-bold mb-4">Add New Product</h2>
      <input name="id" placeholder="ID" onChange={handleChange} className="w-full p-2 border mb-2" required />
      <input name="name" placeholder="Name" onChange={handleChange} className="w-full p-2 border mb-2" required />
      <input name="price" type="number" placeholder="Price" onChange={handleChange} className="w-full p-2 border mb-2" required />
      <input name="image" placeholder="Image URL" onChange={handleChange} className="w-full p-2 border mb-2" required />
      <input name="category" placeholder="Category" onChange={handleChange} className="w-full p-2 border mb-2" />
      <input name="rating" type="number" placeholder="Rating" onChange={handleChange} className="w-full p-2 border mb-2" />
      <input name="reviews" type="number" placeholder="Reviews" onChange={handleChange} className="w-full p-2 border mb-2" />
      <label className="block mb-2">
        <input type="checkbox" name="inStock" checked={form.inStock} onChange={handleChange} /> In Stock
      </label>
      <label className="block mb-2">
        <input type="checkbox" name="isOrganic" checked={form.isOrganic} onChange={handleChange} /> Organic
      </label>
      <button type="submit" className="bg-green-500 text-white p-2 w-full mt-4">Add Product</button>
    </form>
  );
}
