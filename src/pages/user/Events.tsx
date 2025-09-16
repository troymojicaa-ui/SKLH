import { Card } from "@/components/ui/card";
import { format } from "date-fns";

type Event = {
  id: string;
  title: string;
  date: string;     // ISO
  location: string;
  description?: string;
};

const mockEvents: Event[] = [
  {
    id: "e1",
    title: "Youth Assembly",
    date: new Date().toISOString(),
    location: "Barangay Hall",
    description: "Barangay-wide youth general assembly.",
  },
  {
    id: "e2",
    title: "Clean-Up Drive",
    date: new Date(Date.now() + 86400000).toISOString(),
    location: "Katipunan Ave.",
    description: "Let’s clean and green Loyola Heights.",
  },
];

export default function Events() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">Upcoming Events</h1>
      <div className="grid gap-4">
        {mockEvents.map((ev) => (
          <Card key={ev.id} className="p-4">
            <h2 className="text-lg font-semibold">{ev.title}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(ev.date), "PPpp")} • {ev.location}
            </p>
            {ev.description && <p className="mt-2 text-sm">{ev.description}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
