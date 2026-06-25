import { useState } from "react";
import { motion } from "framer-motion";
import { Truck, Eye, EyeOff } from "lucide-react";
import { signupUser } from "../api";
import toast from "react-hot-toast";
import { navigateToQueryPath } from "../../../App";

export default function DeliverySignup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    vehicle_type: "",
    vehicle_number: "",
    license_number: ""
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [dlDocument, setDlDocument] = useState<File | null>(null);
  const [rcDocument, setRcDocument] = useState<File | null>(null);
  const [aadhaarDocument, setAadhaarDocument] = useState<File | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.vehicle_type) { 
      toast.error("Please fill all required fields"); 
      return; 
    }
    
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });
      if (profileImage) payload.append('profile_image', profileImage);
      if (dlDocument) payload.append('dl_document', dlDocument);
      if (rcDocument) payload.append('rc_document', rcDocument);
      if (aadhaarDocument) payload.append('aadhaar_document', aadhaarDocument);

      await signupUser(payload);
      toast.success("Signup successful! Please login.");
      navigateToQueryPath("delivery", "login");
    } catch (err: any) { 
      toast.error(err.message || "Signup failed"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 py-12">
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-green-200">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Partner Signup</h1>
            <p className="text-sm text-gray-500 mt-1">Join the delivery network</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
              <select name="vehicle_type" value={formData.vehicle_type} onChange={handleChange} required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200">
                <option value="">Select vehicle</option>
                <option value="Scooter">Scooter</option>
                <option value="Bike">Bike</option>
                <option value="Auto">Auto</option>
                <option value="Car">Car</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No.</label>
                <input type="text" name="vehicle_number" value={formData.vehicle_number} onChange={handleChange} placeholder="TN01XX1234"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input type="text" name="license_number" value={formData.license_number} onChange={handleChange} placeholder="TN01 1234567"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-green-200" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProfileImage)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Card</label>
                  <input type="file" onChange={(e) => handleFileChange(e, setAadhaarDocument)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driving License (DL)</label>
                  <input type="file" onChange={(e) => handleFileChange(e, setDlDocument)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RC Document</label>
                  <input type="file" onChange={(e) => handleFileChange(e, setRcDocument)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                </div>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-200 disabled:opacity-60 text-base">
              {loading ? "Registering..." : "Create Account 📝"}
            </motion.button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Already have an account? <button type="button" onClick={() => navigateToQueryPath("delivery", "login")} className="text-green-600 font-semibold hover:underline">Log in</button>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
