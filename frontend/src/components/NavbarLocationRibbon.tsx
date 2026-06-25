import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, ChevronDown, Edit3, PlusCircle, Check, Navigation, Map } from "lucide-react";
import { apiClient } from "../api/apiClient";
import toast from "react-hot-toast";
import FreeLocationPicker from "./FreeLocationPicker";

export default function NavbarLocationRibbon() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [activeAddress, setActiveAddress] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState<any>({ address_label: "", full_address: "", latitude: null, longitude: null });
  const [showMap, setShowMap] = useState(false);

  const loadAddressBook = async () => {
    try {
      const res = await apiClient.get("/addresses/list");
      if ((res as any).data?.success || (res as any).success || (res as any).addresses) {
        const payload = (res as any).data || res;
        setAddresses(payload.addresses);
        const selected = payload.addresses.find((a: any) => a.is_selected === 1);
        setActiveAddress(selected || payload.addresses[0] || null);
      }
    } catch (err) { console.error("Failed to load delivery addresses", err); }
  };

  useEffect(() => {
    loadAddressBook();

    // Listen for cross-component address switches (like from the Checkout page)
    const handleAddressSync = () => loadAddressBook();
    window.addEventListener('addressUpdated', handleAddressSync);
    return () => window.removeEventListener('addressUpdated', handleAddressSync);
  }, []);

  const handleUseCurrentLocation = (isEdit: boolean) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    toast.loading("Detecting your location...", { id: "geo-toast" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await res.json();
          if (data && data.display_name) {
            toast.success("Location found!", { id: "geo-toast" });
            if (isEdit) {
              setEditingAddress({
                ...editingAddress,
                full_address: data.display_name,
                latitude,
                longitude
              });
            } else {
              setNewAddress({
                ...newAddress,
                full_address: data.display_name,
                latitude,
                longitude
              });
            }
          } else {
            toast.error("Could not fetch address details", { id: "geo-toast" });
          }
        } catch (err) {
          toast.error("Error fetching address details", { id: "geo-toast" });
        }
      },
      (error) => {
        toast.error("Unable to retrieve your location", { id: "geo-toast" });
      }
    );
  };

  const handleSwitchLocation = async (id: number) => {
    try {
      await apiClient.post("/addresses/select-active", { addressId: id });
      toast.success("Location updated!");
      setIsOpen(false);
      loadAddressBook();
      window.location.reload(); // Reload loops to feed newly selected geofences into shopping catalogs
    } catch (err) { toast.error("Selection update failed"); }
  };

  return (
    <div className="w-full bg-stone-900 text-stone-100 text-xs py-2 px-4 flex items-center justify-between border-t border-stone-800 shadow-sm relative z-[100]">
      {/* 🎯 CLICKABLE LOCATION MARKER TRIGGER BAR ELEMENT */}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-400 transition-colors max-w-xs sm:max-w-md"
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
        <span className="font-black uppercase tracking-tight text-[10px] text-stone-400">Deliver to:</span>
        <span className="font-bold truncate">
          {activeAddress ? `[${activeAddress.address_label}] ${activeAddress.full_address}` : "Select a delivery location address..."}
        </span>
        <ChevronDown className="w-3 h-3 text-stone-400" />
      </div>

      {/* Modern Quick-Switch Dropdown Card UI Overlay */}
      {isOpen && (
        <div className="absolute top-full left-4 bg-white text-stone-800 rounded-2xl border border-stone-200 p-4 mt-1 shadow-2xl w-72 z-50 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h4 className="font-black text-[11px] uppercase text-stone-500 tracking-wider">Your Saved Delivery Addresses</h4>
            <div className="flex items-center gap-2">
              <button onClick={() => { setIsAdding(true); setIsOpen(false); }} className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add</span>
              </button>
              <button onClick={() => setIsOpen(false)} className="text-xs font-bold text-stone-400 hover:text-stone-600">Close</button>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {addresses.map((addr) => (
              <div 
                key={addr.id} 
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer group transition-all ${
                  activeAddress?.id === addr.id ? "border-emerald-500 bg-emerald-50/50" : "border-stone-100 bg-stone-50 hover:border-stone-300"
                }`}
              >
                <div onClick={() => handleSwitchLocation(addr.id)} className="flex-1 pr-2">
                  <p className="text-[11px] font-black text-stone-800 uppercase tracking-tight">{addr.address_label}</p>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">{addr.full_address}</p>
                </div>
                
                {/* 🎯 EDIT BUTTON TRICGERS INSTANT ENTRY OVERWRITE SHEET */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingAddress(addr); }}
                  className="p-1.5 hover:bg-white border border-transparent hover:border-stone-200 rounded-lg text-stone-400 hover:text-stone-700 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editing Modal Popup Form Component Layer (Portaled so it doesn't get cut off by header z-index/overflow) */}
      {editingAddress && createPortal(
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm text-stone-800 shadow-2xl border border-stone-100 relative">
            <h3 className="text-sm font-black text-stone-900 uppercase mb-3">✏️ Edit Address Details</h3>
            <div className="space-y-3 text-left">
              <input 
                type="text" 
                value={editingAddress.address_label} 
                onChange={e => setEditingAddress({...editingAddress, address_label: e.target.value})}
                className="w-full border p-2.5 rounded-xl text-xs" placeholder="Label (e.g. Home, Office)"
              />
              <div className="relative">
                <textarea 
                  value={editingAddress.full_address} 
                  onChange={e => setEditingAddress({...editingAddress, full_address: e.target.value})}
                  className="w-full border p-2.5 rounded-xl text-xs h-24 resize-none pr-2" placeholder="Full Street Address"
                />
              </div>
              
              {!showMap ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUseCurrentLocation(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Auto-Detect
                  </button>
                  <button 
                    onClick={() => setShowMap(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" /> Pick on Map
                  </button>
                </div>
              ) : (
                <div className="mt-2 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">Interactive Map</span>
                    <button onClick={() => setShowMap(false)} className="text-[10px] text-rose-500 font-bold">Close Map</button>
                  </div>
                  <FreeLocationPicker 
                    onSelect={(data) => {
                      setEditingAddress({
                        ...editingAddress,
                        full_address: data.address,
                        latitude: data.lat,
                        longitude: data.lng
                      });
                      setShowMap(false);
                    }} 
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setEditingAddress(null); setShowMap(false); }} className="w-1/2 py-2.5 bg-stone-100 font-bold rounded-xl text-xs">Cancel</button>
                <button 
                  onClick={async () => {
                    await apiClient.put(`/addresses/edit/${editingAddress.id}`, editingAddress);
                    toast.success("Address changed!");
                    setEditingAddress(null);
                    loadAddressBook();
                  }}
                  className="w-1/2 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add New Address Modal Popup Component Layer (Portaled) */}
      {isAdding && createPortal(
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm text-stone-800 shadow-2xl border border-stone-100 relative">
            <h3 className="text-sm font-black text-stone-900 uppercase mb-3">📍 Add New Address</h3>
            <div className="space-y-3 text-left">
              <input 
                type="text" 
                value={newAddress.address_label} 
                onChange={e => setNewAddress({...newAddress, address_label: e.target.value})}
                className="w-full border p-2.5 rounded-xl text-xs" placeholder="Label (e.g. Home, Office, Farm)"
              />
              <textarea 
                value={newAddress.full_address} 
                onChange={e => setNewAddress({...newAddress, full_address: e.target.value})}
                className="w-full border p-2.5 rounded-xl text-xs h-24 resize-none" placeholder="Full Street Address & Landmark"
              />

              {!showMap ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUseCurrentLocation(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Auto-Detect
                  </button>
                  <button 
                    onClick={() => setShowMap(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" /> Pick on Map
                  </button>
                </div>
              ) : (
                <div className="mt-2 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase">Interactive Map</span>
                    <button onClick={() => setShowMap(false)} className="text-[10px] text-rose-500 font-bold">Close Map</button>
                  </div>
                  <FreeLocationPicker 
                    onSelect={(data) => {
                      setNewAddress({
                        ...newAddress,
                        full_address: data.address,
                        latitude: data.lat,
                        longitude: data.lng
                      });
                      setShowMap(false);
                    }} 
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setIsAdding(false); setShowMap(false); setNewAddress({ address_label: "", full_address: "", latitude: null, longitude: null }); }} className="w-1/2 py-2.5 bg-stone-100 font-bold rounded-xl text-xs">Cancel</button>
                <button 
                  onClick={async () => {
                    if (!newAddress.address_label || !newAddress.full_address) {
                      toast.error("Please fill in both fields");
                      return;
                    }
                    await apiClient.post(`/addresses/add`, newAddress);
                    toast.success("New address added!");
                    setIsAdding(false);
                    setNewAddress({ address_label: "", full_address: "", latitude: null, longitude: null });
                    loadAddressBook();
                  }}
                  className="w-1/2 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
