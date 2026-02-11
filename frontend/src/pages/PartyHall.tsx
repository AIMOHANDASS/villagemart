import React, { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Music, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";

type PartyHallProps = {
  user?: any;
};

const BASE_CHARGE = 700;
const SUPPORT_NUMBER = "91+ 8903003808";
const DRAFT_KEY = "vm_pending_booking";

const PartyHall: React.FC<PartyHallProps> = ({ user }) => {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [personCount, setPersonCount] = useState("50");
  const [snacksCount, setSnacksCount] = useState("50");
  const [waterCount, setWaterCount] = useState("50");
  const [cakeCount, setCakeCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [addOns, setAddOns] = useState<string[]>(["water", "snacks"]);
  const [availability, setAvailability] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!eventDate) {
        setAvailability([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/party-hall/availability?date=${eventDate}`);
        const data = await res.json();
        setAvailability(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch availability", err);
        setAvailability([]);
      }
    };
    load();
  }, [eventDate]);

  const addOnCharge = useMemo(() => {
    const persons = Math.max(0, Number(personCount || 0));
    const snacks = Math.max(0, Number(snacksCount || 0));
    const water = Math.max(0, Number(waterCount || 0));
    const cake = Math.max(0, Number(cakeCount || 0));
    let total = 0;

    if (addOns.includes("snacks")) total += snacks * 30;
    if (addOns.includes("water")) total += water * 5;
    if (addOns.includes("cake")) total += cake * 450;
    if (addOns.includes("decoration")) total += 350;
    if (addOns.includes("tea")) total += persons * 15;

    return Number(total.toFixed(2));
  }, [addOns, cakeCount, personCount, snacksCount, waterCount]);

  const totalCharge = Number((BASE_CHARGE + addOnCharge).toFixed(2));

  const toggleAddOn = (value: string) => {
    setAddOns((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  };

  const proceedToCheckout = () => {
    if (!user?.id || !customerName || !customerPhone || !eventDate || !startTime) {
      alert("Please fill all required details");
      return;
    }

    if (Number(personCount) <= 0) {
      alert("Person count should be greater than 0");
      return;
    }

    const draft = {
      type: "partyHall",
      payload: {
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
        baseCharge: BASE_CHARGE,
        addOnCharge,
        totalCharge,
      },
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    navigate("/checkout", { state: { bookingDraft: draft } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container px-4 py-8 space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Party Hall Booking</h1>
          <p className="mt-2 text-sm md:text-base text-purple-50">
            Fill party hall details here and continue to checkout only for payment.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Users className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">3-Hour Slot</p>
                <p className="text-sm text-muted-foreground">Fixed 3-hour booking.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Music className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">Add-on Services</p>
                <p className="text-sm text-muted-foreground">Water, snacks, cake, etc.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Calendar className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">Clarification</p>
                <p className="text-sm text-muted-foreground">{SUPPORT_NUMBER}</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Enter Party Hall Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Event Date</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Input type="number" placeholder="Persons" value={personCount} onChange={(e) => setPersonCount(e.target.value)} />
              <Input type="number" placeholder="Snacks count" value={snacksCount} onChange={(e) => setSnacksCount(e.target.value)} />
              <Input type="number" placeholder="Water count" value={waterCount} onChange={(e) => setWaterCount(e.target.value)} />
              <Input type="number" placeholder="Cake count" value={cakeCount} onChange={(e) => setCakeCount(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              {[
                ["water", "Water"],
                ["snacks", "Snacks"],
                ["cake", "Cake"],
                ["decoration", "Decoration"],
                ["tea", "Tea"],
              ].map(([key, label]) => (
                <label key={key} className="border rounded px-2 py-1 flex items-center gap-2">
                  <input type="checkbox" checked={addOns.includes(key)} onChange={() => toggleAddOn(key)} />
                  {label}
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="text-sm grid md:grid-cols-3 gap-2">
              <p>Base charge: ₹{BASE_CHARGE.toFixed(2)}</p>
              <p>Add-on charge: ₹{addOnCharge.toFixed(2)}</p>
              <p className="font-semibold">Total: ₹{totalCharge.toFixed(2)}</p>
            </div>

            <div className="bg-gray-50 border rounded p-3 text-sm">
              <p className="font-medium mb-2">Booked / unavailable time slots:</p>
              {availability.length === 0 ? (
                <p className="text-gray-500">No booked slots for selected date.</p>
              ) : (
                <ul className="list-disc ml-5 space-y-1">
                  {availability.map((slot: any) => (
                    <li key={slot.id}>
                      {String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)} ({slot.status})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button className="w-full" onClick={proceedToCheckout}>
              Continue to Checkout for Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartyHall;
