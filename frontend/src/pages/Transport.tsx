import React, { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bike, Clock3, MapPin, ShieldCheck } from "lucide-react";

interface TransportProps {
  user?: any;
}

const Transport: React.FC<TransportProps> = ({ user }) => {
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [contact, setContact] = useState("");

  const submitBooking = () => {
    if (!pickup || !drop || !contact) {
      alert("Please fill pickup, drop and contact number");
      return;
    }

    alert("Transport booking request submitted. Driver will be assigned soon.");
    setPickup("");
    setDrop("");
    setContact("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container px-4 py-8 space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 text-white p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Village Transport</h1>
          <p className="mt-2 text-sm md:text-base text-green-50">
            Rapido-style quick rides and parcel delivery for your nearby villages.
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
            <CardTitle>Book a Ride</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup">Pickup Location</Label>
              <Input
                id="pickup"
                placeholder="Enter pickup"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drop">Drop Location</Label>
              <Input
                id="drop"
                placeholder="Enter destination"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                placeholder="Enter mobile number"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={submitBooking}>
              <MapPin className="h-4 w-4 mr-2" />
              Confirm Transport Booking
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transport;
