import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";

export default function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Mock events onlyy
  const events = [
    { id: 1, date: "2025-08-10", title: "Community Clean-Up Drive", category: "Public" },
    { id: 2, date: "2025-08-15", title: "Youth Sports Festival", category: "Volunteer" },
    { id: 3, date: "2025-08-18", title: "Barangay SK Meeting", category: "Internal" },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-7 w-7 text-blue-600" />
          Calendar
        </h1>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Calendar Placeholder */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-7 text-center font-medium border-b pb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Mock weeks */}
        <div className="grid grid-cols-7 gap-2 mt-4">
          {Array.from({ length: 30 }).map((_, i) => {
            const day = i + 1;
            const dateStr = `2025-08-${String(day).padStart(2, "0")}`;
            const eventToday = events.find((e) => e.date === dateStr);

            return (
              <div
                key={day}
                className="h-24 border rounded p-1 flex flex-col text-sm hover:bg-gray-50 cursor-pointer"
              >
                <span className="font-semibold">{day}</span>
                {eventToday && (
                  <span
                    className={`mt-1 rounded px-1 text-xs text-white ${
                      eventToday.category === "Public"
                        ? "bg-blue-500"
                        : eventToday.category === "Volunteer"
                        ? "bg-green-500"
                        : "bg-purple-500"
                    }`}
                  >
                    {eventToday.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
