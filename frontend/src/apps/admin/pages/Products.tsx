import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Plus,
  Trash2,
  X,
  ChevronDown,
  Minus,
  Leaf,
  AlertTriangle,
  RefreshCw,
  Check,
  Edit3,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAllProducts, createProduct, updateProduct, deleteProduct } from "../api";
import type { Product } from "../types";

/* ══════════════════════════════════════════════════════
   📋 CONSTANTS
══════════════════════════════════════════════════════ */

const CATEGORY_OPTIONS = [
  { value: "Groceries", label: "🛒 Groceries" },
  { value: "Dairy", label: "🥛 Dairy" },
  { value: "Vegetables", label: "🥕 Vegetables" },
  { value: "Fruits", label: "🍎 Fruits" },
  { value: "Grains", label: "🌾 Grains" },
  { value: "Garlands", label: "🌸 Garlands" },
  { value: "Village Specials", label: "🌴 Village Specials" },
];

const SOLID_UNITS = ["50g", "100g", "250g", "500g", "1 kg"];
const LIQUID_UNITS = ["100ml", "250ml", "500ml", "1 ltr"];

const EMPTY_FORM = {
  E_name: "",
  T_name: "",
  MRP: "",
  s_price: "",
  GST: "",
  imageurl: "",
  category: "",
  product_type: "solid" as "solid" | "liquid" | "other",
  inStock: 1,
  isOrganic: false,
};

/* ══════════════════════════════════════════════════════
   🧩 SUBCOMPONENTS
══════════════════════════════════════════════════════ */

/* ── Quantity Picker Counter ── */
function QuantityPicker({
  value,
  onChange,
  min = 0,
  max = 9999,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        className="w-16 h-10 text-center text-sm font-semibold text-gray-800 border-x border-gray-200 outline-none focus:bg-green-50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Inline Editable Cell ── */
function InlineEditCell({
  value,
  productId,
  field,
  type = "number",
  onSave,
}: {
  value: string | number;
  productId: number;
  field: string;
  type?: "number" | "text";
  onSave: (id: number, field: string, val: any) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = async () => {
    const parsedVal = type === "number" ? Number(editValue) : editValue;
    if (parsedVal === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(productId, field, parsedVal);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    } catch {
      setEditValue(String(value));
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setEditValue(String(value));
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className="w-20 px-2 py-1 text-sm border-2 border-green-400 rounded-lg outline-none bg-green-50 font-semibold text-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={`cursor-pointer px-2 py-1 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-amber-50 hover:ring-1 hover:ring-amber-200 select-none ${
        flash ? "bg-green-100 ring-2 ring-green-400 animate-pulse" : ""
      }`}
      title="Double-click to edit"
    >
      {type === "number" ? `₹${Number(value).toFixed(2)}` : value}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   🏗️ MAIN COMPONENT
══════════════════════════════════════════════════════ */

export default function Products() {
  /* ── State ── */
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch Products ── */
  const fetchProducts = useCallback(async () => {
    try {
      const res: any = await getAllProducts();
      setProducts(res.data || res || []);
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ── Filtered Data ── */
  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.E_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.T_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).includes(search);
    const matchCategory =
      categoryFilter === "All" ||
      p.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchSearch && matchCategory;
  });

  /* ── Inline Save Handler ── */
  const handleInlineSave = async (id: number, field: string, val: any) => {
    try {
      await updateProduct(id, { [field]: val });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
      );
      toast.success(`Updated ${field} for product #${id}`, {
        duration: 2000,
        icon: "✏️",
      });
    } catch (err) {
      toast.error(`Failed to update ${field}`);
      throw err;
    }
  };

  /* ── Inline Stock Update Wrapper ── */
  const handleInlineStockUpdate = async (id: number, val: number) => {
    try {
      await updateProduct(id, { inStock: val });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, inStock: val } : p))
      );
    } catch (err) {
      toast.error(`Failed to update stock`);
    }
  };

  /* ── Toggle isOrganic ── */
  const handleToggleOrganic = async (product: Product) => {
    const newVal = product.isOrganic ? 0 : 1;
    try {
      await updateProduct(product.id, { isOrganic: newVal });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isOrganic: newVal } : p))
      );
      toast.success(
        newVal ? "Marked as Organic 🌿" : "Removed Organic label",
        { duration: 2000 }
      );
    } catch {
      toast.error("Failed to update organic status");
    }
  };

  /* ── Create Product ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.E_name.trim()) {
      toast.error("Product English name is required");
      return;
    }
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        MRP: Number(formData.MRP) || 0,
        s_price: Number(formData.s_price) || 0,
        GST: Number(formData.GST) || 0,
        inStock: Number(formData.inStock) || 0,
        isOrganic: formData.isOrganic ? 1 : 0,
      };

      await createProduct(payload);
      toast.success("Product added successfully! 🎉");
      setShowAddModal(false);
      setFormData({ ...EMPTY_FORM });
      await fetchProducts();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete Product ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(`Product #${deleteTarget.id} deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Reset product type ── */
  const handleProductTypeChange = (type: "solid" | "liquid") => {
    setFormData((prev) => ({
      ...prev,
      product_type: type,
    }));
  };

  /* ── Get category emoji ── */
  const getCategoryBadge = (cat: string) => {
    const found = CATEGORY_OPTIONS.find(
      (c) => c.value.toLowerCase() === cat?.toLowerCase()
    );
    return found?.label || cat;
  };

  /* ══════════════════════════════════════════════════
     🎨 RENDER
  ══════════════════════════════════════════════════ */

  /* Loading State */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">
            Loading inventory...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-green-600" />
            Inventory Manager
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} products in catalog · {filtered.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* ── SEARCH + CATEGORY FILTER ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-md shadow-sm focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100 transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder-gray-400"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          {["All", ...CATEGORY_OPTIONS.map((c) => c.value)].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                categoryFilter === cat
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── DATA TABLE ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/80">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Product Name (EN)</th>
                <th className="px-4 py-3">Tamil Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">MRP</th>
                <th className="px-4 py-3">
                  Sale Price{" "}
                  <Edit3 className="w-3 h-3 inline text-amber-500 ml-0.5" />
                </th>
                <th className="px-4 py-3">GST %</th>
                <th className="px-4 py-3">
                  In Stock{" "}
                  <Edit3 className="w-3 h-3 inline text-amber-500 ml-0.5" />
                </th>
                <th className="px-4 py-3">Out</th>
                <th className="px-4 py-3">
                  Organic{" "}
                  <Edit3 className="w-3 h-3 inline text-amber-500 ml-0.5" />
                </th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((product, idx) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.015 }}
                  className="hover:bg-green-50/30 transition-colors group"
                >
                  {/* ID */}
                  <td className="px-4 py-3 text-xs font-bold text-gray-400">
                    #{product.id}
                  </td>

                  {/* English Name + Image */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {product.imageurl ? (
                        <img
                          src={product.imageurl}
                          alt={product.E_name}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-200 shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">
                        {product.E_name}
                      </span>
                    </div>
                  </td>

                  {/* Tamil Name */}
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[120px]">
                    {product.T_name || "—"}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {getCategoryBadge(product.category)}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        product.product_type === "liquid"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {product.product_type}
                    </span>
                  </td>

                  {/* MRP */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    ₹{Number(product.MRP).toFixed(2)}
                  </td>

                  {/* Sale Price (EDITABLE) */}
                  <td className="px-4 py-3">
                    <InlineEditCell
                      value={product.s_price}
                      productId={product.id}
                      field="s_price"
                      type="number"
                      onSave={handleInlineSave}
                    />
                  </td>

                  {/* GST */}
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {Number(product.GST)}%
                  </td>

                  {/* Fully Inline Editable Stock Level Input Box 🎯 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        value={product.inStock} 
                        onChange={(e) => handleInlineStockUpdate(product.id, parseInt(e.target.value) || 0)}
                        className="w-16 border rounded px-1.5 py-0.5 font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 text-center"
                        min="0"
                        step="1"
                      />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {product.product_type === "solid" ? "kg" : product.product_type === "liquid" ? "ltr" : "qty"}
                      </span>
                    </div>
                  </td>

                  {/* Out of Stock */}
                  <td className="px-4 py-3 text-sm text-gray-400">
                    <div className="flex items-center gap-1.5">
                      {product.outStock || 0} 
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {product.product_type === "solid" ? "kg" : product.product_type === "liquid" ? "ltr" : "qty"}
                      </span>
                    </div>
                  </td>

                  {/* Organic (TOGGLE) */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleOrganic(product)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                        product.isOrganic
                          ? "bg-green-100 text-green-700 ring-1 ring-green-300 hover:bg-green-200"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                      title="Click to toggle"
                    >
                      <Leaf className="w-3 h-3" />
                      {product.isOrganic ? "Yes" : "No"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteTarget(product)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={13}
                    className="text-center py-16 text-gray-400 text-sm"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <Package className="w-7 h-7 text-gray-300" />
                      </div>
                      <p className="font-medium">No products found</p>
                      <p className="text-xs text-gray-400">
                        {search || categoryFilter !== "All"
                          ? "Try adjusting your filters"
                          : "Click 'Add Product' to get started"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════
          🆕 ADD PRODUCT MODAL
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowAddModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm rounded-t-3xl z-10">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      Add New Product
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Fill in the product details below
                    </p>
                  </div>
                  <button
                    onClick={() => !submitting && setShowAddModal(false)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreate} className="px-6 py-5 space-y-5">
                  {/* Row 1: Names */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        English Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.E_name}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, E_name: e.target.value }))
                        }
                        placeholder="e.g. Basmati Rice"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Tamil Name
                      </label>
                      <input
                        type="text"
                        value={formData.T_name}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, T_name: e.target.value }))
                        }
                        placeholder="e.g. பாஸ்மதி அரிசி"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                      />
                    </div>
                  </div>

                  {/* Row 2: Pricing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        MRP (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.MRP}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, MRP: e.target.value }))
                        }
                        placeholder="0.00"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Sale Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.s_price}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, s_price: e.target.value }))
                        }
                        placeholder="0.00"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        GST %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.GST}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, GST: e.target.value }))
                        }
                        placeholder="0"
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Image URL */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.imageurl}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, imageurl: e.target.value }))
                      }
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                    />
                  </div>

                  {/* Row 4: Category Dropdown */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            category: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all appearance-none bg-white cursor-pointer"
                        required
                      >
                        <option value="">Select Category...</option>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Row 5: Product Type Radio */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Product Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      {(["solid", "liquid", "other"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, product_type: type }))}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                            formData.product_type === type
                              ? type === "solid"
                                ? "border-amber-400 bg-amber-50 text-amber-700 shadow-md"
                                : type === "liquid"
                                ? "border-blue-400 bg-blue-50 text-blue-700 shadow-md"
                                : "border-gray-400 bg-gray-50 text-gray-700 shadow-md"
                              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-lg">
                            {type === "solid" ? "📦" : type === "liquid" ? "💧" : "🔢"}
                          </span>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                          {formData.product_type === type && (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 6: Stock + Organic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Initial Stock Quantity
                      </label>
                      <QuantityPicker
                        value={formData.inStock}
                        onChange={(v) =>
                          setFormData((p) => ({ ...p, inStock: v }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Organic Product?
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            isOrganic: !p.isOrganic,
                          }))
                        }
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                          formData.isOrganic
                            ? "border-green-400 bg-green-50 text-green-700"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <Leaf className="w-4 h-4" />
                        {formData.isOrganic ? "Yes, Organic 🌿" : "Not Organic"}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => !submitting && setShowAddModal(false)}
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Add Product
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════
          🗑️ DELETE CONFIRMATION DIALOG
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeleteTarget(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Delete Product
                    </h3>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-5">
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete{" "}
                    <strong>{deleteTarget.E_name}</strong> (#{deleteTarget.id})?
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !deleting && setDeleteTarget(null)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
