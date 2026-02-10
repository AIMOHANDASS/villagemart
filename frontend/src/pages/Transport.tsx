import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bike, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../api";

interface TransportProps {
  user?: any;
}

type TransportBooking = {
  id: number;
  from_address: string;
  to_address: string;
  distance_km: number;
  charge_amount: number;
  status: string;
  created_at: string;
};

type LocationSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

const RATE_PER_KM = 15;

const haversineKm = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const Transport: React.FC<TransportProps> = ({ user }) => {
  const [customerName, setCustomerName] = useState(user?.username || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");

  const [fromAddress, setFromAddress] = useState("");
  const [fromLat, setFromLat] = useState<number | null>(null);
  const [fromLng, setFromLng] = useState<number | null>(null);

  const [toSearch, setToSearch] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toLat, setToLat] = useState<number | null>(null);
  const [toLng, setToLng] = useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myBookings, setMyBookings] = useState<TransportBooking[]>([]);



  useEffect(() => {
    if (!user?.id) return;

    fetch(`${API_BASE_URL}/transport/user/${user.id}`)
      .then((res) => res.json())
      .then((data) => setMyBookings(data || []))
      .catch(() => setMyBookings([]));
  }, [user?.id]);

  const distanceKm = useMemo(() => {
    if (
      fromLat === null ||
      fromLng === null ||
      toLat === null ||
      toLng === null
    ) {
      return 0;
    }

    return haversineKm({ lat: fromLat, lng: fromLng }, { lat: toLat, lng: toLng });
  }, [fromLat, fromLng, toLat, toLng]);

  const estimatedCharge = useMemo(
    () => Number((distanceKm * RATE_PER_KM).toFixed(2)),
    [distanceKm]
  );

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFromLat(latitude);
        setFromLng(longitude);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setFromAddress(data?.display_name || `${latitude}, ${longitude}`);
        } catch {
          setFromAddress(`${latitude}, ${longitude}`);
        }
      },
      () => {
        alert("Location permission denied");
      }
    );
  };

  const searchCitySuggestions = async (text: string) => {
    setToSearch(text);

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setLoadingSuggestions(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          text
        )}&countrycodes=in&limit=5`
      );
      const data = await res.json();
      setSuggestions(data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectDestination = (item: LocationSuggestion) => {
    setToAddress(item.display_name);
    setToSearch(item.display_name);
    setToLat(Number(item.lat));
    setToLng(Number(item.lon));
    setSuggestions([]);
  };

  const submitBooking = async () => {
    if (!user?.id) {
      alert("Please login to book transport");
      return;
    }

    if (
      !customerName ||
      !customerPhone ||
      !fromAddress ||
      fromLat === null ||
      fromLng === null ||
      !toAddress ||
      toLat === null ||
      toLng === null
    ) {
      alert("Please fill all transport details");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/transport/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          customerName,
          customerPhone,
          fromAddress,
          fromLat,
          fromLng,
          toAddress,
          toLat,
          toLng,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");

      alert(
        `✅ Transport booked. Distance ${data.distance_km} km, Charge ₹${data.charge_amount}`
      );

      setMyBookings((prev) => [{
        id: data.bookingId,
        from_address: fromAddress,
        to_address: toAddress,
        distance_km: data.distance_km,
        charge_amount: data.charge_amount,
        status: "BOOKED",
        created_at: new Date().toISOString(),
      }, ...prev]);
      setToSearch("");
      setToAddress("");
      setToLat(null);
      setToLng(null);
      setSuggestions([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Booking failed";
      alert(`❌ ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container px-4 py-8 space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 text-white p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Village Transport</h1>
          <p className="mt-2 text-sm md:text-base text-green-50">
            Rapido-style quick rides. ₹15 per KM. From current location to any city.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Bike className="h-6 w-6 text-green-700" />
              <div>
                <p className="font-semibold">Quick Bike Rides</p>
                <p className="text-sm text-muted-foreground">Fast pickup inside town routes.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Clock3 className="h-6 w-6 text-green-700" />
              <div>
                <p className="font-semibold">24x7 Availability</p>
                <p className="text-sm text-muted-foreground">Early morning and late-night rides.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-green-700" />
              <div>
                <p className="font-semibold">Verified Drivers</p>
                <p className="text-sm text-muted-foreground">Trusted local riders with tracking.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Book Transport</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>From (Current Location)</Label>
              <div className="flex gap-2">
                <Input value={fromAddress} readOnly placeholder="Tap Use Current Location" />
                <Button type="button" variant="outline" onClick={useCurrentLocation}>
                  <MapPin className="h-4 w-4 mr-1" /> Use Current
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>To (Type City)</Label>
              <Input
                value={toSearch}
                onChange={(e) => searchCitySuggestions(e.target.value)}
                placeholder="Type city / area"
              />
              {loadingSuggestions && <p className="text-xs text-muted-foreground">Loading suggestions...</p>}
              {suggestions.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  {suggestions.map((item) => (
                    <button
                      key={`${item.lat}-${item.lon}`}
                      type="button"
                      onClick={() => selectDestination(item)}
                      className="w-full text-left p-2 text-sm hover:bg-muted border-b last:border-b-0"
                    >
                      {item.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>Distance: <b>{distanceKm ? distanceKm.toFixed(2) : "0.00"} km</b></p>
              <p>Rate: <b>₹{RATE_PER_KM} / km</b></p>
              <p>Estimated Charge: <b>₹{estimatedCharge.toFixed(2)}</b></p>
            </div>

            <Button className="w-full" disabled={submitting} onClick={submitBooking}>
              {submitting ? "Booking..." : "Confirm Transport Booking"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Transport Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {myBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transport bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {myBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-md p-3 text-sm">
                    <p><b>From:</b> {booking.from_address}</p>
                    <p><b>To:</b> {booking.to_address}</p>
                    <p><b>KM:</b> {Number(booking.distance_km).toFixed(2)} | <b>Charge:</b> ₹{Number(booking.charge_amount).toFixed(2)}</p>
                    <p><b>Status:</b> {booking.status} | <b>Date:</b> {new Date(booking.created_at).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Transport;
