import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Plus,
  Trash2,
  Leaf,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAllProducts, createProduct, updateProduct, deleteProduct } from "../api";
import { API_BASE_URL } from "../../../api/apiClient";
import type { Product } from "../types";
import AddProductModal from "../components/AddProductModal";

/* ══════════════════════════════════════════════════════
   📋 CONSTANTS
   Preserving all categories, units, and list configuration
   to prevent any disruption to inventory stock lists.
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

/* ── Image Helper for Static Upload Route ── */
const getProductImageSrc = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanUrl = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${cleanUrl}`;
};

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
   Refactored to support 6-slot upload/paste image matrix via
   AddProductModal and left join retrieval schema integrations.
══════════════════════════════════════════════════════ */

export default function Products() {
  /* ── State ── */
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
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

  /* ── Save Product (Add or Edit) ── */
  const handleSaveProduct = async (payloadFormData: FormData) => {
    try {
      if (editTarget) {
        await updateProduct(editTarget.id, payloadFormData);
      } else {
        await createProduct(payloadFormData);
      }
      await fetchProducts();
    } catch (err) {
      console.error(err);
      throw err; // throw back to let the modal handle loading states
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

  /* ── Get category emoji ── */
  const getCategoryBadge = (cat: string) => {
    const found = CATEGORY_OPTIONS.find(
      (c) => c.value.toLowerCase() === cat?.toLowerCase()
    );
    return found?.label || cat;
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-stone-300 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl hover:bg-gray-50 dark:hover:bg-stone-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditTarget(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* ── SEARCH + CATEGORY FILTER ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl px-3 py-2 flex-1 max-w-md shadow-sm focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100 transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="bg-transparent text-sm outline-none flex-1 text-gray-700 dark:text-stone-200 placeholder-gray-400"
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
                  : "bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 hover:bg-gray-200 dark:hover:bg-stone-700"
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
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-stone-800 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wider border-b border-gray-100 dark:border-stone-800 bg-gray-50/80 dark:bg-stone-800/40">
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
            <tbody className="divide-y divide-gray-50 dark:divide-stone-800">
              {filtered.map((product, idx) => {
                const primaryImage = product.images?.[0] || product.imageurl;

                return (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.015 }}
                    className="hover:bg-green-50/30 dark:hover:bg-stone-800/20 transition-colors group"
                  >
                    {/* ID */}
                    <td className="px-4 py-3 text-xs font-bold text-gray-400">
                      #{product.id}
                    </td>

                    {/* English Name + Primary Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {primaryImage ? (
                          <img
                            src={getProductImageSrc(primaryImage)}
                            alt={product.E_name}
                            className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-stone-800 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.png";
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-stone-800 flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <span className="text-sm font-semibold text-gray-800 dark:text-stone-200 truncate max-w-[160px]">
                          {product.E_name}
                        </span>
                      </div>
                    </td>

                    {/* Tamil Name */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-stone-400 truncate max-w-[120px]">
                      {product.T_name || "—"}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400">
                        {getCategoryBadge(product.category)}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          product.product_type === "liquid"
                            ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                            : product.product_type === "solid"
                            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
                            : "bg-gray-150 dark:bg-stone-800 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {product.product_type}
                      </span>
                    </td>

                    {/* MRP */}
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-stone-400">
                      ₹{Number(product.MRP).toFixed(2)}
                    </td>

                    {/* Sale Price */}
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
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-stone-400">
                      {Number(product.GST)}%
                    </td>

                    {/* Inline Editable Stock Level */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={product.inStock}
                          onChange={(e) => handleInlineStockUpdate(product.id, parseInt(e.target.value) || 0)}
                          className="w-16 border dark:border-stone-700 rounded px-1.5 py-0.5 font-bold text-gray-900 dark:text-white dark:bg-stone-850 text-center bg-transparent outline-none focus:ring-1 focus:ring-emerald-500"
                          min="0"
                          step="1"
                        />
                        <span className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-wide">
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
                            ? "bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 ring-1 ring-green-300 dark:ring-green-900/30 hover:bg-green-200"
                            : "bg-gray-100 dark:bg-stone-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-stone-750"
                        }`}
                        title="Click to toggle"
                      >
                        <Leaf className="w-3 h-3" />
                        {product.isOrganic ? "Yes" : "No"}
                      </button>
                    </td>

                    {/* Actions (Edit and Delete) */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditTarget(product);
                            setShowAddModal(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                          title="Edit product"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                          title="Delete product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
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

      {/* 🆕 Beautiful 6-Slot Add/Edit Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditTarget(null);
        }}
        onSave={handleSaveProduct}
        editProduct={editTarget}
      />

      {/* 🗑️ DELETE CONFIRMATION DIALOG */}
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
