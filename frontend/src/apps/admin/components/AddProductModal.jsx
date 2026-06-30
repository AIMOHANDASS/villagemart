import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  Check,
  ChevronDown,
  Leaf,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";

const CATEGORY_OPTIONS = [
  { value: "Groceries", label: "🛒 Groceries" },
  { value: "Dairy", label: "🥛 Dairy" },
  { value: "Vegetables", label: "🥕 Vegetables" },
  { value: "Fruits", label: "🍎 Fruits" },
  { value: "Grains", label: "🌾 Grains" },
  { value: "Garlands", label: "🌸 Garlands" },
  { value: "Village Specials", label: "🌴 Village Specials" },
];

const EMPTY_FORM = {
  E_name: "",
  T_name: "",
  MRP: "",
  s_price: "",
  GST: "",
  category: "",
  product_type: "solid",
  inStock: 1,
  isOrganic: false,
};

export default function AddProductModal({ isOpen, onClose, onSave, editProduct = null }) {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState(Array(6).fill(null));
  const fileInputRefs = useRef([]);

  // Initialize form if editing a product
  useEffect(() => {
    if (editProduct) {
      setFormData({
        E_name: editProduct.E_name || "",
        T_name: editProduct.T_name || "",
        MRP: editProduct.MRP || "",
        s_price: editProduct.s_price || "",
        GST: editProduct.GST || "",
        category: editProduct.category || "",
        product_type: editProduct.product_type || "solid",
        inStock: editProduct.inStock || 0,
        isOrganic: !!editProduct.isOrganic,
      });

      // Load existing images into slots
      const initialSlots = Array(6).fill(null);
      const existingImages = editProduct.images || (editProduct.imageurl ? [editProduct.imageurl] : []);
      existingImages.forEach((img, idx) => {
        if (idx < 6) {
          initialSlots[idx] = { type: "url", url: img };
        }
      });
      setSlots(initialSlots);
    } else {
      setFormData({ ...EMPTY_FORM });
      setSlots(Array(6).fill(null));
    }
  }, [editProduct, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  // ── Slot Actions ──
  const handleFileChange = (index, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }

    const preview = URL.createObjectURL(file);
    const updated = [...slots];
    updated[index] = { type: "file", file, preview };
    setSlots(updated);
  };

  const handleUrlSubmit = (index, url) => {
    if (!url.trim()) return;
    const updated = [...slots];
    updated[index] = { type: "url", url: url.trim() };
    setSlots(updated);
  };

  const clearSlot = (index) => {
    const updated = [...slots];
    const current = updated[index];
    if (current && current.type === "file" && current.preview) {
      URL.revokeObjectURL(current.preview);
    }
    updated[index] = null;
    setSlots(updated);
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileChange(index, files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.E_name.trim()) {
      toast.error("English name is required");
      return;
    }
    if (!formData.category) {
      toast.error("Category is required");
      return;
    }

    setSubmitting(true);

    try {
      const dataPayload = new FormData();
      dataPayload.append("E_name", formData.E_name);
      dataPayload.append("T_name", formData.T_name);
      dataPayload.append("MRP", String(formData.MRP || 0));
      dataPayload.append("s_price", String(formData.s_price || 0));
      dataPayload.append("GST", String(formData.GST || 0));
      dataPayload.append("category", formData.category);
      dataPayload.append("product_type", formData.product_type);
      dataPayload.append("inStock", String(formData.inStock || 0));
      dataPayload.append("isOrganic", formData.isOrganic ? "true" : "false");

      // Extract file blobs and text URLs
      const textUrls = [];
      slots.forEach((slot) => {
        if (slot) {
          if (slot.type === "file") {
            dataPayload.append("images", slot.file);
          } else if (slot.type === "url") {
            textUrls.push(slot.url);
          }
        }
      });

      dataPayload.append("imageUrls", JSON.stringify(textUrls));

      await onSave(dataPayload);
      toast.success(editProduct ? "Product updated successfully!" : "Product created successfully! 🎉");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !submitting && onClose()}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-stone-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-stone-800 bg-white dark:bg-stone-900 z-20">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center text-white">
                  {editProduct ? <Plus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                {editProduct ? "Edit Product" : "Add New Product"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Up to 6 optional images, local uploads & text fallback links
              </p>
            </div>
            <button
              onClick={() => !submitting && onClose()}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* 6-Slot Upload Matrix */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Product Images (Up to 6, optional)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="relative aspect-square border-2 border-dashed border-gray-200 dark:border-stone-800 rounded-2xl flex flex-col items-center justify-center p-2 bg-gray-50/50 dark:bg-stone-900/50 hover:bg-gray-50 dark:hover:bg-stone-900 transition-all group overflow-hidden"
                  >
                    {slot ? (
                      // Preview Filled Slot
                      <div className="w-full h-full relative">
                        <img
                          src={slot.type === "file" ? slot.preview : slot.url}
                          alt={`Slot ${index + 1}`}
                          className="w-full h-full object-cover rounded-xl border border-gray-100 dark:border-stone-800"
                        />
                        <button
                          type="button"
                          onClick={() => clearSlot(index)}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md hover:scale-110 active:scale-95 transition-all z-10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-1 left-1 right-1 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[9px] text-white font-mono text-center truncate">
                          {slot.type === "file" ? "File upload" : "Web link"}
                        </div>
                      </div>
                    ) : (
                      // Empty Slot Input Methods
                      <div className="flex flex-col items-center justify-center h-full w-full space-y-1">
                        <ImageIcon className="w-6 h-6 text-gray-400 dark:text-stone-600" />
                        <span className="text-[10px] text-gray-400 dark:text-stone-500 text-center font-medium px-1">
                          Slot {index + 1}
                        </span>

                        <div className="flex gap-1.5 pt-1">
                          {/* File input trigger */}
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[index]?.click()}
                            className="p-1.5 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 hover:border-green-500 dark:hover:border-green-500 hover:text-green-600 dark:hover:text-green-500 rounded-lg text-gray-500 shadow-sm transition-all"
                            title="Upload local file"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>

                          {/* URL input trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              const url = window.prompt(`Paste image URL for Slot ${index + 1}:`);
                              if (url) handleUrlSubmit(index, url);
                            }}
                            className="p-1.5 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 hover:border-green-500 dark:hover:border-green-500 hover:text-green-600 dark:hover:text-green-500 rounded-lg text-gray-500 shadow-sm transition-all"
                            title="Paste image link"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="file"
                          ref={(el) => (fileInputRefs.current[index] = el)}
                          onChange={(e) => handleFileChange(index, e.target.files?.[0])}
                          className="hidden"
                          accept="image/*"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* General Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  English Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.E_name}
                  onChange={(e) => handleInputChange("E_name", e.target.value)}
                  placeholder="e.g. Basmati Rice"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-stone-800 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/20 bg-transparent dark:text-white transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Tamil Name
                </label>
                <input
                  type="text"
                  value={formData.T_name}
                  onChange={(e) => handleInputChange("T_name", e.target.value)}
                  placeholder="e.g. பாஸ்மதி அரிசி"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-stone-800 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/20 bg-transparent dark:text-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Row 3: Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.MRP}
                  onChange={(e) => handleInputChange("MRP", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-stone-800 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/20 bg-transparent dark:text-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Sale Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.s_price}
                  onChange={(e) => handleInputChange("s_price", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-stone-800 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/20 bg-transparent dark:text-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  GST %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.GST}
                  onChange={(e) => handleInputChange("GST", e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-stone-800 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/20 bg-transparent dark:text-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Row 4: Category Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-stone-800 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/20 bg-transparent dark:bg-stone-900 dark:text-white transition-all appearance-none cursor-pointer font-medium"
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

            {/* Row 5: Product Type Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Product Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {["solid", "liquid", "other"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleInputChange("product_type", type)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                      formData.product_type === type
                        ? type === "solid"
                          ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 shadow-md"
                          : type === "liquid"
                          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 shadow-md"
                          : "border-gray-400 bg-gray-50 dark:bg-stone-800 text-gray-700 dark:text-gray-300 shadow-md"
                        : "border-gray-200 dark:border-stone-800 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-stone-800/40"
                    }`}
                  >
                    <span className="text-lg">
                      {type === "solid" ? "📦" : type === "liquid" ? "💧" : "🔢"}
                    </span>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {formData.product_type === type && (
                      <Check className="w-4 h-4 text-current" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 6: Initial Stock & Organic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Initial Stock Quantity
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.inStock}
                    onChange={(e) => handleInputChange("inStock", parseInt(e.target.value, 10) || 0)}
                    min="0"
                    className="w-32 px-3.5 py-2.5 text-sm border border-gray-200 dark:border-stone-800 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 dark:focus:ring-green-950/20 bg-transparent dark:text-white transition-all font-semibold text-center"
                  />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {formData.product_type === "solid" ? "kg" : formData.product_type === "liquid" ? "ltr" : "qty"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Organic Product?
                </label>
                <button
                  type="button"
                  onClick={() => handleInputChange("isOrganic", !formData.isOrganic)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                    formData.isOrganic
                      ? "border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                      : "border-gray-200 dark:border-stone-800 text-gray-500 hover:border-gray-300 dark:hover:border-stone-700"
                  }`}
                >
                  <Leaf className="w-4 h-4 text-current" />
                  {formData.isOrganic ? "Yes, Organic 🌿" : "Not Organic"}
                </button>
              </div>
            </div>

            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 pb-6 px-6 border-t border-gray-100 dark:border-stone-800 bg-white dark:bg-stone-900 z-20">
              <button
                type="button"
                onClick={() => !submitting && onClose()}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-stone-800 rounded-xl hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editProduct ? "Update Product" : "Add Product"}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
