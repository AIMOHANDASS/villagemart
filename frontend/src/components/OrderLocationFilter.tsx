import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  TAMILNADU_COMPLETE_GEO,
  SORTED_DISTRICT_KEYS,
  getHaversineDistanceKM,
  TalukCoordinates,
} from "../data/tamilNaduGeoData";

// ============================================================================
// ORDER LOCATION FILTER COMPONENT
// Uses useMemo-insulated Haversine filtering — zero render loop risk
// Supports both callback mode (onFilterComplete) and direct filtered array mode
// ============================================================================

interface OrderLocationFilterProps {
  unfilteredOrders: any[];
  onFilterComplete: (filtered: any[]) => void;
}

export const OrderLocationFilter: React.FC<OrderLocationFilterProps> = ({
  unfilteredOrders,
  onFilterComplete,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedTaluk, setSelectedTaluk] = useState<TalukCoordinates | null>(null);

  // 🚀 TWO-STAGE useMemo-insulated filter pipeline — shields from render loops
  const filteredResults = useMemo(() => {
    let filteredList = unfilteredOrders || [];

    // STAGE 1: Smart District-level text filter 🎯
    // Matches district name OR any of its official taluk names in address strings
    if (selectedDistrict) {
      const districtUpper = selectedDistrict.toUpperCase();
      const associatedTaluks = TAMILNADU_COMPLETE_GEO[selectedDistrict] || [];

      filteredList = filteredList.filter((order) => {
        const addressString = String(
          order.pickup_location ||
            order.from_address ||
            order.customer_address ||
            order.address ||
            ""
        ).toUpperCase();

        // Check 1: Does the address text explicitly mention the district name?
        const matchesDistrictText = addressString.includes(districtUpper);

        // Check 2: Does the address text mention any taluk name belonging to this district?
        const matchesTalukText = associatedTaluks.some((taluk) =>
          addressString.includes(taluk.name.toUpperCase())
        );

        // Keep the order if it matches either criteria 🚀
        return matchesDistrictText || matchesTalukText;
      });
    }

    // STAGE 2: Taluk-level 20 KM Haversine coordinate radius fence with Robust Text Fallback 🚀
    // If a specific taluk node is targeted, apply strict geometric distance filter
    if (selectedTaluk) {
      filteredList = filteredList.filter((order) => {
        const addressString = String(
          order.pickup_location ||
            order.from_address ||
            order.customer_address ||
            order.address ||
            ""
        ).toUpperCase();
        const talukNameUpper = selectedTaluk.name.toUpperCase();

        // 1. Primary Fallback: If the text address explicitly contains the Taluk name, keep it instantly! 🎯
        if (addressString.includes(talukNameUpper)) {
          return true;
        }

        // Special contextual fallback rule for regional hubs like Ayyarmalai mapping to Kulithalai
        if (talukNameUpper === "KULITHALAI" && (addressString.includes("AYYARMALAI") || addressString.includes("ANAIKKAUNDANOOR"))) {
          return true;
        }

        // 2. Secondary Coordinate fallback validation
        const orderLat = parseFloat(
          order.from_latitude ||
            order.pickup_lat ||
            order.latitude ||
            order.customer_lat ||
            order.lat ||
            (order.from_address && order.from_address.lat)
        );
        const orderLng = parseFloat(
          order.from_longitude ||
            order.pickup_lng ||
            order.longitude ||
            order.customer_lng ||
            order.lng ||
            (order.from_address && order.from_address.lng)
        );

        if (!orderLat || !orderLng || isNaN(orderLat) || isNaN(orderLng)) return false;

        const aggregateDistance = getHaversineDistanceKM(
          selectedTaluk.lat,
          selectedTaluk.lng,
          orderLat,
          orderLng
        );
        return aggregateDistance <= 20; // 🎯 Strict 20 KM operational constraint boundary
      });
    }

    return filteredList;
  }, [selectedDistrict, selectedTaluk, unfilteredOrders]);

  // Propagate filtered results without triggering render loop (useCallback stabilized)
  const stableOnFilterComplete = useCallback(onFilterComplete, []);

  // Propagate filtered results safely using useEffect
  useEffect(() => {
    stableOnFilterComplete(filteredResults);
  }, [filteredResults, stableOnFilterComplete]);

  return (
    <div className="flex flex-col gap-6 p-4 bg-white rounded-xl border border-stone-200 mb-6 shadow-sm">
      
      {/* Refactored drop-down selector menus use modern card structures for quick tapping */}
      <div className="flex flex-col space-y-2 w-full">
        <label className="text-xs font-black text-stone-500 uppercase tracking-wider">
          Select District
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200 custom-scrollbar">
          <div
            onClick={() => {
              setSelectedDistrict("");
              setSelectedTaluk(null);
            }}
            className={`p-3 rounded-lg border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
              selectedDistrict === ""
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-white bg-white hover:border-stone-300 text-stone-700"
            }`}
          >
            <span>All Districts</span>
            {selectedDistrict === "" && <span className="text-emerald-600 text-xs">✓</span>}
          </div>
          
          {SORTED_DISTRICT_KEYS.map((dist) => (
            <div
              key={dist}
              onClick={() => {
                setSelectedDistrict(dist);
                setSelectedTaluk(null);
              }}
              className={`p-3 rounded-lg border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                selectedDistrict === dist
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-white bg-white hover:border-stone-300 text-stone-700"
              }`}
            >
              <span className="truncate pr-2">{dist}</span>
              {selectedDistrict === dist && <span className="text-emerald-600 text-xs shrink-0">✓</span>}
            </div>
          ))}
        </div>
      </div>

      {selectedDistrict && (
        <div className="flex flex-col space-y-2 w-full">
          <label className="text-xs font-black text-stone-500 uppercase tracking-wider">
            Select Regional Area Hub
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200 custom-scrollbar">
            <div
              onClick={() => setSelectedTaluk(null)}
              className={`p-3 rounded-lg border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                !selectedTaluk
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-white bg-white hover:border-stone-300 text-stone-700"
              }`}
            >
              <span>All Hubs in {selectedDistrict}</span>
              {!selectedTaluk && <span className="text-emerald-600 text-xs shrink-0">✓</span>}
            </div>

            {TAMILNADU_COMPLETE_GEO[selectedDistrict].map((taluk) => (
              <div
                key={taluk.name}
                onClick={() => setSelectedTaluk(taluk)}
                className={`p-3 rounded-lg border-2 text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                  selectedTaluk?.name === taluk.name
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-white bg-white hover:border-stone-300 text-stone-700"
                }`}
              >
                <span className="truncate pr-2">{taluk.name}</span>
                {selectedTaluk?.name === taluk.name && <span className="text-emerald-600 text-xs shrink-0">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
