// src/pages/TestMap.tsx
import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES: any = ["places", "marker"];

const TestMap: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setLocation({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  const center = location || { lat: 20.5937, lng: 78.9629 };

  if (!isLoaded) {
    return <div className="p-8 text-center text-sm text-gray-500">Loading Maps Configuration...</div>;
  }

  return (
    <div className="h-screen w-screen">
      <GoogleMap
        mapContainerStyle={{ height: "100%", width: "100%" }}
        center={center}
        zoom={15}
        onClick={handleMapClick}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
        }}
      >
        {location && <Marker position={location} />}
      </GoogleMap>
    </div>
  );
};

export default TestMap;

