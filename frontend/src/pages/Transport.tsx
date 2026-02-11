import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bike, Clock3, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type TransportProps = {
  user?: any;
};

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

const TRANSPORT_RATE_PER_KM = 15;
const DRAFT_KEY = "vm_pending_booking";

const toNum = (v: string) => Number(v);
const isFiniteNum = (v: string) => Number.isFinite(toNum(v));

const haversineKm = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => {
  const r = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return r * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const Transport: React.FC<TransportProps> = ({ user }) => {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");

  const [fromAddress, setFromAddress] = useState("");
  const [fromLat, setFromLat] = useState("");
  const [fromLng, setFromLng] = useState("");

  const [toAddress, setToAddress] = useState("");
  const [toLat, setToLat] = useState("");
  const [toLng, setToLng] = useState("");

  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [fromSuggestions, setFromSuggestions] = useState<Suggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<Suggestion[]>([]);
  const [notes, setNotes] = useState("");
  const [locating, setLocating] = useState(false);

  const fromOk = isFiniteNum(fromLat) && isFiniteNum(fromLng);
  const toOk = isFiniteNum(toLat) && isFiniteNum(toLng);

  const distanceKm = useMemo(() => {
    if (!fromOk || !toOk) return 0;
    return Number(
      haversineKm(
        { lat: toNum(fromLat), lng: toNum(fromLng) },
        { lat: toNum(toLat), lng: toNum(toLng) }
      ).toFixed(2)
    );
  }, [fromLat, fromLng, fromOk, toLat, toLng, toOk]);

  const chargeAmount = Number((distanceKm * TRANSPORT_RATE_PER_KM).toFixed(2));

  const fetchSuggestions = async (
    keyword: string,
    setter: (rows: Suggestion[]) => void
  ) => {
    const q = keyword.trim();
    if (q.length < 2) {
      setter([]);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setter(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Suggestion fetch failed:", err);
      setter([]);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchSuggestions(fromSearch, setFromSuggestions);
    }, 300);
    return () => clearTimeout(t);
  }, [fromSearch]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchSuggestions(toSearch, setToSuggestions);
    }, 300);
    return () => clearTimeout(t);
  }, [toSearch]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data?.display_name || `${latitude}, ${longitude}`;
          setFromAddress(addr);
          setFromSearch(addr);
          setFromLat(String(latitude));
          setFromLng(String(longitude));
          setFromSuggestions([]);
        } catch (err) {
          console.error(err);
          alert("Unable to resolve current location");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        alert("Location permission denied");
      }
    );
  };

  const proceedToCheckout = () => {
    if (
      !user?.id ||
      !customerName ||
      !customerPhone ||
      !fromAddress ||
      !toAddress ||
      !fromOk ||
      !toOk
    ) {
      alert("Please fill all required transport details");
      return;
    }

    const draft = {
      type: "transport",
      payload: {
        userId: user.id,
        customerName,
        customerPhone,
        fromAddress,
        fromLat: toNum(fromLat),
        fromLng: toNum(fromLng),
        toAddress,
        toLat: toNum(toLat),
        toLng: toNum(toLng),
        notes,
        distanceKm,
        chargeAmount,
      },
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    navigate("/checkout", { state: { bookingDraft: draft } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container px-4 py-8 space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 text-white p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Village Transport</h1>
          <p className="mt-2 text-sm md:text-base text-green-50">
            Fill from/to details here and continue to checkout only for payment.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Bike className="h-6 w-6 text-green-700" />
              <div>
                <p className="font-semibold">Quick Bike Rides</p>
                <p className="text-sm text-muted-foreground">Fast local routes.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Clock3 className="h-6 w-6 text-green-700" />
              <div>
                <p className="font-semibold">24x7 Availability</p>
                <p className="text-sm text-muted-foreground">Early and late rides.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-green-700" />
              <div>
                <p className="font-semibold">Verified Drivers</p>
                <p className="text-sm text-muted-foreground">Trusted local riders.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Book Transport (₹{TRANSPORT_RATE_PER_KM}/km)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={locating}>
              <Navigation className="h-4 w-4 mr-2" />
              {locating ? "Detecting..." : "Use Current Location For From"}
            </Button>

            <div className="space-y-2">
              <Label>From (type to get suggestions)</Label>
              <Input
                placeholder="Type from location (e.g. ku)"
                value={fromSearch}
                onChange={(e) => {
                  setFromSearch(e.target.value);
                  setFromAddress(e.target.value);
                }}
              />
              {fromSuggestions.length > 0 && (
                <div className="border rounded max-h-40 overflow-y-auto">
                  {fromSuggestions.map((s, idx) => (
                    <button
                      key={`${s.lat}-${s.lon}-${idx}`}
                      type="button"
                      className="w-full p-2 text-left text-sm border-b hover:bg-gray-50"
                      onClick={() => {
                        setFromAddress(s.display_name);
                        setFromSearch(s.display_name);
                        setFromLat(s.lat);
                        setFromLng(s.lon);
                        setFromSuggestions([]);
                      }}
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>To (type to get suggestions)</Label>
              <Input
                placeholder="Type to location (e.g. ku)"
                value={toSearch}
                onChange={(e) => {
                  setToSearch(e.target.value);
                  setToAddress(e.target.value);
                }}
              />
              {toSuggestions.length > 0 && (
                <div className="border rounded max-h-40 overflow-y-auto">
                  {toSuggestions.map((s, idx) => (
                    <button
                      key={`${s.lat}-${s.lon}-${idx}`}
                      type="button"
                      className="w-full p-2 text-left text-sm border-b hover:bg-gray-50"
                      onClick={() => {
                        setToAddress(s.display_name);
                        setToSearch(s.display_name);
                        setToLat(s.lat);
                        setToLng(s.lon);
                        setToSuggestions([]);
                      }}
                    >
                      {s.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-2">
              <Input placeholder="From lat" value={fromLat} onChange={(e) => setFromLat(e.target.value)} />
              <Input placeholder="From lng" value={fromLng} onChange={(e) => setFromLng(e.target.value)} />
              <Input placeholder="To lat" value={toLat} onChange={(e) => setToLat(e.target.value)} />
              <Input placeholder="To lng" value={toLng} onChange={(e) => setToLng(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {fromOk && toOk && (
              <>
                <div className="text-sm grid md:grid-cols-2 gap-2">
                  <p>Distance: <strong>{distanceKm.toFixed(2)} km</strong></p>
                  <p>Estimated charge: <strong>₹{chargeAmount.toFixed(2)}</strong></p>
                </div>

                <div className="h-64 rounded border overflow-hidden">
                  <MapContainer
                    center={[toNum(fromLat), toNum(fromLng)]}
                    zoom={12}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[toNum(fromLat), toNum(fromLng)]} />
                    <Marker position={[toNum(toLat), toNum(toLng)]} />
                    <Polyline positions={[[toNum(fromLat), toNum(fromLng)], [toNum(toLat), toNum(toLng)]]} />
                  </MapContainer>
                </div>
              </>
            )}

            <Button className="w-full" onClick={proceedToCheckout}>
              <MapPin className="h-4 w-4 mr-2" /> Continue to Checkout for Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transport;
