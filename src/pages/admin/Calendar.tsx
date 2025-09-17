// src/pages/admin/Calendar.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Calendar as CalendarIcon,
  MapPin,
  StickyNote,
  Tag,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type DayCell = { date: Date; inMonth: boolean; isToday: boolean };

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string; // UTC ISO
  ends_at: string | null; // UTC ISO
  is_all_day: boolean;
  category: "general" | "public" | "youth" | "internal";
  location: string | null;
  notes: string | null;
  created_by: string;
};

function buildMonthGrid(viewDate: Date): DayCell[] {
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days: DayCell[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push({
      date: day,
      inMonth: isSameMonth(day, viewDate),
      isToday: isToday(day),
    });
    day = addDays(day, 1);
  }
  return days;
}

/** Convert local date/time to UTC ISO for DB */
function toUTC(dateStr: string, timeStr?: string) {
  const local = timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`;
  return new Date(local).toISOString();
}

/** Event overlaps a local day cell? */
function eventHitsDay(ev: CalendarEvent, day: Date) {
  const start = new Date(ev.starts_at);
  const end = ev.ends_at ? new Date(ev.ends_at) : null;

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  if (end) return !isAfter(start, dayEnd) && !isBefore(end, dayStart);
  return start >= dayStart && start <= dayEnd;
}

/** Nice local date/time range string for the details modal */
function prettyRange(ev: CalendarEvent) {
  const s = new Date(ev.starts_at);
  const e = ev.ends_at ? new Date(ev.ends_at) : null;

  if (ev.is_all_day && isSameDay(s, e ?? s)) {
    return `${format(s, "MMMM d, yyyy")} • All day`;
  }

  if (!e || isSameDay(s, e)) {
    const date = format(s, "MMMM d, yyyy");
    const start = format(s, "p");
    const end = e ? format(e, "p") : null;
    return end ? `${date} • ${start} – ${end}` : `${date} • ${start}`;
  }

  // Cross-day range
  return `${format(s, "MMM d, yyyy p")} – ${format(e, "MMM d, yyyy p")}`;
}

/** Category badge style */
function categoryBadgeClass(cat: CalendarEvent["category"]) {
  switch (cat) {
    case "public":
      return "bg-green-50 text-green-700 border-green-200";
    case "youth":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "internal":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

export default function AdminCalendar() {
  const [viewDate, setViewDate] = useState(new Date());
  const [open, setOpen] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(""); // "YYYY-MM-DD"
  const [startTime, setStartTime] = useState(""); // "HH:mm"
  const [endTime, setEndTime] = useState(""); // "HH:mm"
  const [category, setCategory] = useState<"general" | "public" | "youth" | "internal">("general");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  // data
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // view details modal
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const grid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const mini = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  async function fetchMonthEvents(d: Date) {
    setLoading(true);
    try {
      const from = startOfMonth(d).toISOString();
      const to = endOfMonth(d).toISOString();

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .or(
          `and(starts_at.gte.${from},starts_at.lte.${to}),and(ends_at.gte.${from},starts_at.lte.${to})`
        )
        .order("starts_at", { ascending: true });

      if (error) throw error;
      setEvents((data as CalendarEvent[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMonthEvents(viewDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDate]);

  const resetForm = () => {
    setTitle("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setCategory("general");
    setLocation("");
    setNotes("");
  };

  async function handleCreate() {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be signed in.");
        return;
      }
      if (!title.trim() || !date) {
        alert("Please provide a title and date.");
        return;
      }

      const starts_at = toUTC(date, startTime || "00:00");
      const ends_at = endTime ? toUTC(date, endTime) : null;

      const { error } = await supabase.from("calendar_events").insert({
        title: title.trim(),
        starts_at,
        ends_at,
        is_all_day: !startTime && !endTime,
        category,
        location: location.trim() || null,
        notes: notes.trim() || null,
        created_by: user.id,
      });

      if (error) {
        console.error(error);
        alert("Failed to save event.");
        return;
      }

      setOpen(false);
      resetForm();
      await fetchMonthEvents(viewDate);
    } finally {
      setSaving(false);
    }
  }

  // events for a day cell
  function dayEvents(day: Date) {
    return events.filter((ev) => eventHitsDay(ev, day)).slice(0, 4);
  }

  // Sidebar Today/Tomorrow
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const todayEvents = events.filter((ev) => eventHitsDay(ev, today));
  const tomorrowEvents = events.filter((ev) => eventHitsDay(ev, tomorrow));

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
        <aside className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{format(viewDate, "MMMM yyyy")}</div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => setViewDate(subMonths(viewDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setViewDate(addMonths(viewDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-[11px] text-muted-foreground mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d} className="text-center py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {mini.map((d, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-md flex items-center justify-center text-sm
                  ${d.inMonth ? "text-foreground" : "text-muted-foreground/50"}
                  ${d.isToday ? "bg-blue-600 text-white font-medium" : "hover:bg-muted"}`}
                >
                  {format(d.date, "d")}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold mb-2">Today</div>
            {todayEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events</div>
            ) : (
              <ul className="space-y-1">
                {todayEvents.map((e) => (
                  <li key={e.id} className="text-sm">
                    <span className="font-medium">{e.title}</span>
                    {e.starts_at ? (
                      <span className="text-muted-foreground"> · {format(new Date(e.starts_at), "p")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold mb-2">Tomorrow</div>
            {tomorrowEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events</div>
            ) : (
              <ul className="space-y-1">
                {tomorrowEvents.map((e) => (
                  <li key={e.id} className="text-sm">
                    <span className="font-medium">{e.title}</span>
                    {e.starts_at ? (
                      <span className="text-muted-foreground"> · {format(new Date(e.starts_at), "p")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border bg-white p-4">
            <div className="text-sm font-semibold mb-2">Vacations</div>
            <div className="text-sm text-muted-foreground">None</div>
          </div>
        </aside>

        <main className="rounded-xl border bg-white">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b">
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost">
                <Menu className="h-5 w-5" />
              </Button>
            <h1 className="text-xl sm:text-2xl font-semibold">{format(viewDate, "MMMM yyyy")}</h1>
              <div className="hidden sm:flex items-center gap-1 ml-2">
                <Button size="icon" variant="ghost" onClick={() => setViewDate(subMonths(viewDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setViewDate(addMonths(viewDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="ml-3">
                <select className="border rounded-md px-2 py-1 text-sm bg-white">
                  <option>Month</option>
                  <option disabled>Week</option>
                  <option disabled>Day</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" title="Search">
                <Search className="h-4 w-4" />
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add event
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-xs text-muted-foreground px-4 sm:px-6 py-2">
            {["Sun", "Mon", "Tue", "Wed", "Thurs", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-6 border-t">
            {grid.map((d, i) => {
              const dayEvts = dayEvents(d.date);
              return (
                <div
                  key={i}
                  className={`min-h-[110px] sm:min-h-[120px] border-r border-b p-2 relative
                  ${i % 7 === 6 ? "border-r-0" : ""}`}
                >
                  <div
                    className={`text-[11px] sm:text-xs absolute top-2 right-2 px-1 rounded
                    ${d.inMonth ? "text-foreground" : "text-muted-foreground/50"}
                    ${d.isToday ? "bg-blue-600 text-white" : ""}`}
                  >
                    {format(d.date, "dd")}
                  </div>

                  {/* event pills */}
                  <div className="mt-5 space-y-1">
                    {dayEvts.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setSelected(e);
                          setViewOpen(true);
                        }}
                        className={`w-full text-left text-[11px] sm:text-xs px-2 py-1 rounded-md truncate border hover:opacity-90 cursor-pointer
                        ${categoryBadgeClass(e.category)}`}
                        title={e.title}
                      >
                        {e.title}
                      </button>
                    ))}
                    {dayEvts.length === 0 ? null : dayEvts.length >= 4 ? (
                      <div className="text-[11px] text-muted-foreground">+ more</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 sm:px-6 py-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            {loading ? "Loading events…" : events.length === 0 ? "No events scheduled." : `${events.length} events this month.`}
          </div>
        </main>
      </div>

      {/* Add Event Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Add event</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="text-sm">
              Title
              <Input
                className="mt-1"
                placeholder="e.g., Barangay Clean-up"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">
                Date
                <Input
                  type="date"
                  className="mt-1 bg-white"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  Start
                  <Input
                    type="time"
                    className="mt-1 bg-white"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  End
                  <Input
                    type="time"
                    className="mt-1 bg-white"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <label className="text-sm">
              Category
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger className="mt-1 bg-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="youth">Youth</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="text-sm">
              Location
              <Input
                className="mt-1 bg-white"
                placeholder="Optional"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>

            <label className="text-sm">
              Notes
              <Textarea
                className="mt-1 min-h-[90px] bg-white"
                placeholder="Optional details"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Event Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.title ?? "Event"}
              {selected ? (
                <Badge variant="outline" className={`border ${categoryBadgeClass(selected.category)}`}>
                  <Tag className="h-3 w-3 mr-1" />
                  {selected.category}
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{prettyRange(selected)}</div>
              </div>

              {selected.location ? (
                <div className="text-sm flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>{selected.location}</div>
                </div>
              ) : null}

              {selected.notes ? (
                <div className="text-sm flex items-start gap-2">
                  <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="whitespace-pre-wrap">{selected.notes}</div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
