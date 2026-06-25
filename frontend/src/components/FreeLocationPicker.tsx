import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useState } from "react";

type Props = {
  onSelect: (data: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
};

const KARUR_CENTER = { lat: 10.9601, lng: 78.0766 };
const GOOGLE_MAPS_LIBRARIES: any = ["places", "marker"];

export default function FreeLocationPicker({ onSelect }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "User-Agent": "VillageMart/1.0" } }
      );
      const data = await res.json();
      onSelect({
        lat,
        lng,
        address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    } catch (e) {
      onSelect({
        lat,
        lng,
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      });
    }
  };

  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        fetchAddress(lat, lng);
      },
      () => alert("Location permission denied"),
      { enableHighAccuracy: true }
    );
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setPosition({ lat, lng });
      fetchAddress(lat, lng);
    }
  };

  if (!isLoaded) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading Maps Configuration...</div>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={detectLocation}
        className="mb-3 px-3 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
      >
        📍 Use Current Location
      </button>

      <div className="rounded-xl overflow-hidden border border-gray-200">
        <GoogleMap
          mapContainerStyle={{ height: "260px", width: "100%" }}
          center={position || KARUR_CENTER}
          zoom={position ? 16 : 12}
          onClick={handleMapClick}
          options={{
            mapTypeControl: false,
            streetViewControl: false,
          }}
        >
          {position && (
            <Marker
              position={position}
              icon={window.google ? {
                url: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                scaledSize: new window.google.maps.Size(25, 41),
                anchor: new window.google.maps.Point(12, 41)
              } : undefined}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

