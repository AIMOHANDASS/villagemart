import React, { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Music, Users } from "lucide-react";

interface PartyHallProps {
  user?: any;
}

const PartyHall: React.FC<PartyHallProps> = ({ user }) => {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guests, setGuests] = useState("");

  const submitHallBooking = () => {
    if (!name || !eventDate || !guests) {
      alert("Please fill name, event date and guest count");
      return;
    }

    alert("Party hall booking request submitted. We will contact you shortly.");
    setName("");
    setEventDate("");
    setGuests("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container px-4 py-8 space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 text-white p-6">
          <h1 className="text-2xl md:text-3xl font-bold">Party Hall Booking</h1>
          <p className="mt-2 text-sm md:text-base text-purple-50">
            Book wedding, birthday and function halls with simple advance reservation.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Users className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">50 to 1000 Guests</p>
                <p className="text-sm text-muted-foreground">Small to large event halls available.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Music className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">Decoration & Sound</p>
                <p className="text-sm text-muted-foreground">Optional event support packages.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-start gap-3">
              <Calendar className="h-6 w-6 text-purple-700" />
              <div>
                <p className="font-semibold">Date Availability</p>
                <p className="text-sm text-muted-foreground">Book early and block your date.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Request Hall Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Customer Name</Label>
              <Input
                id="eventName"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guests">Expected Guests</Label>
              <Input
                id="guests"
                type="number"
                placeholder="e.g. 250"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={submitHallBooking}>
              Submit Party Hall Request
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PartyHall;
