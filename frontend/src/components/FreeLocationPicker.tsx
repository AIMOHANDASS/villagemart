import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import L from "leaflet";

type Props = {
  onSelect: (data: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function FreeLocationPicker({ onSelect }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  const fetchAddress = async (lat: number, lng: number) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    onSelect({
      lat,
      lng,
      address: data.display_name || "",
    });
  };

  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        fetchAddress(lat, lng);
      },
      () => alert("Location permission denied"),
      { enableHighAccuracy: true }
    );
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        fetchAddress(lat, lng);
      },
    });

    return position ? <Marker position={position} icon={markerIcon} /> : null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={detectLocation}
        className="mb-3 px-3 py-2 bg-gray-200 rounded-lg"
      >
        📍 Use Current Location
      </button>

      {position && (
        <MapContainer
          center={position}
          zoom={16}
          style={{ height: "260px", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationMarker />
        </MapContainer>
      )}
    </div>
  );
}
