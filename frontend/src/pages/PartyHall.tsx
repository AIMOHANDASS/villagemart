import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Music, Users } from "lucide-react";
import { API_BASE_URL } from "../api";

interface PartyHallProps {
  user?: any;
}

const BASE_3_HR_CHARGE = 700;
const SUPPORT_NUMBER = "+91 8903003808";

const ADD_ON_PRICES: Record<string, number> = {
  water: 5,
  snacks: 30,
  cake: 450,
  decoration: 350,
  tea: 15,
};

const SLOT_OPTIONS = [
  "09:00",
  "12:00",
  "15:00",
  "18:00",
  "21:00",
];

type PartyHallBooking = {
  id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  person_count: number;
  total_charge: number;
  status: string;
  created_at: string;
};

type ExistingSlot = {
  start_time: string;
  end_time: string;
};

const add3Hours = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setHours(date.getHours() + 3);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const PartyHall: React.FC<PartyHallProps> = ({ user }) => {
  const [customerName, setCustomerName] = useState(user?.username || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("15:00");

  const [personCount, setPersonCount] = useState("100");
  const [snacksCount, setSnacksCount] = useState("100");
  const [waterCount, setWaterCount] = useState("100");
  const [cakeCount, setCakeCount] = useState("1");

  const [addOns, setAddOns] = useState<string[]>(["water", "snacks"]);
  const [notes, setNotes] = useState("");

  const [availability, setAvailability] = useState<ExistingSlot[]>([]);
  const [myBookings, setMyBookings] = useState<PartyHallBooking[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const endTime = useMemo(() => add3Hours(startTime), [startTime]);

  const addOnCharge = useMemo(() => {
    const persons = Number(personCount || 0);
    const snacks = Number(snacksCount || 0);
    const water = Number(waterCount || 0);
    const cake = Number(cakeCount || 0);

    let total = 0;
    if (addOns.includes("snacks")) total += snacks * ADD_ON_PRICES.snacks;
    if (addOns.includes("water")) total += water * ADD_ON_PRICES.water;
    if (addOns.includes("cake")) total += cake * ADD_ON_PRICES.cake;
    if (addOns.includes("decoration")) total += ADD_ON_PRICES.decoration;
    if (addOns.includes("tea")) total += persons * ADD_ON_PRICES.tea;
    return total;
  }, [addOns, personCount, snacksCount, waterCount, cakeCount]);

  const totalCharge = BASE_3_HR_CHARGE + addOnCharge;



  useEffect(() => {
    if (!user?.id) return;

    fetch(`${API_BASE_URL}/party-hall/user/${user.id}`)
      .then((res) => res.json())
      .then((data) => setMyBookings(data || []))
      .catch(() => setMyBookings([]));
  }, [user?.id]);

  useEffect(() => {
    if (!eventDate) {
      setAvailability([]);
      return;
    }

    fetch(`${API_BASE_URL}/party-hall/availability?date=${eventDate}`)
      .then((res) => res.json())
      .then((data) => setAvailability(data || []))
      .catch(() => setAvailability([]));
  }, [eventDate]);

  const isSlotBooked = (slot: string) => {
    const slotEnd = add3Hours(slot);
    return availability.some((s) => !(s.end_time.slice(0, 5) <= slot || s.start_time.slice(0, 5) >= slotEnd));
  };

  const toggleAddOn = (item: string) => {
    setAddOns((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const submitHallBooking = async () => {
    if (!user?.id) {
      alert("Please login to book party hall");
      return;
    }

    if (!customerName || !customerPhone || !eventDate || !startTime || !personCount) {
      alert("Please fill all required fields");
      return;
    }

    if (isSlotBooked(startTime)) {
      alert("Selected slot is already booked. Choose another slot.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/party-hall/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          customerName,
          customerPhone,
          eventDate,
          startTime,
          personCount: Number(personCount),
          snacksCount: Number(snacksCount || 0),
          waterCount: Number(waterCount || 0),
          cakeCount: Number(cakeCount || 0),
          addOns,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");

      alert(
        `✅ Party hall booked (${data.start_time}-${data.end_time}). Total ₹${data.total_charge}. Clarification: ${data.support_number}`
      );

      setMyBookings((prev) => [{
        id: data.bookingId,
        event_date: eventDate,
        start_time: data.start_time,
        end_time: data.end_time,
        person_count: Number(personCount),
        total_charge: data.total_charge,
        status: "BOOKED",
        created_at: new Date().toISOString(),
      }, ...prev]);
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
        <section className="rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Party Hall Booking</h1>
          <p className="mt-2 text-sm md:text-base text-purple-50">
            3-hour slot charge ₹700. Add-ons available at affordable prices.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Users className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">Mention Person Count</p>
                <p className="text-sm text-muted-foreground">Plan snacks/cake/water by headcount.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Music className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">Add-on Services</p>
                <p className="text-sm text-muted-foreground">Water, snacks, cake, tea, decoration.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Calendar className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">Slot Blocking</p>
                <p className="text-sm text-muted-foreground">Booked slot becomes unavailable for others.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Request Hall Booking</CardTitle>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Start Time (3-hour slot)</Label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md border p-2"
                >
                  {SLOT_OPTIONS.map((slot) => (
                    <option key={slot} value={slot} disabled={isSlotBooked(slot)}>
                      {slot} - {add3Hours(slot)} {isSlotBooked(slot) ? "(Booked)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Person Count</Label>
                <Input type="number" value={personCount} onChange={(e) => setPersonCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Snacks Count</Label>
                <Input type="number" value={snacksCount} onChange={(e) => setSnacksCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Water Count</Label>
                <Input type="number" value={waterCount} onChange={(e) => setWaterCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cake Count</Label>
                <Input type="number" value={cakeCount} onChange={(e) => setCakeCount(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Add-on Services</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ADD_ON_PRICES).map(([key, price]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAddOn(key)}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      addOns.includes(key) ? "bg-primary text-primary-foreground" : "bg-background"
                    }`}
                  >
                    {key} (₹{price})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes / Doubts</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special note"
              />
              <p className="text-xs text-muted-foreground">
                Clarification contact: <b>{SUPPORT_NUMBER}</b>
              </p>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>Base (3hr): <b>₹{BASE_3_HR_CHARGE}</b></p>
              <p>Add-ons: <b>₹{addOnCharge}</b></p>
              <p>Total: <b>₹{totalCharge}</b></p>
              <p>Selected Slot: <b>{startTime} - {endTime}</b></p>
            </div>

            <Button className="w-full" disabled={submitting} onClick={submitHallBooking}>
              {submitting ? "Booking..." : "Submit Party Hall Request"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Party Hall Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {myBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No party hall bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {myBookings.map((booking) => (
                  <div key={booking.id} className="border rounded-md p-3 text-sm">
                    <p><b>Date:</b> {booking.event_date}</p>
                    <p><b>Slot:</b> {String(booking.start_time).slice(0, 5)} - {String(booking.end_time).slice(0, 5)}</p>
                    <p><b>Persons:</b> {booking.person_count} | <b>Total:</b> ₹{Number(booking.total_charge).toFixed(2)}</p>
                    <p><b>Status:</b> {booking.status}</p>
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

export default PartyHall;
