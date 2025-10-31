// src/pages/user/Events.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { format, startOfDay } from "date-fns";

type UIEvent = {
  id: string;
  title: string;
  startISO: string;
  endISO?: string | null;
  location: string;
  description?: string | null;
  speakers?: string[];
  mode?: "in-person" | "online";
  imageUrl?: string | null;
};

type RegistrationMap = Record<
  string,
  { status: "pending" | "approved" | "declined"; id: string } | undefined
>;

const HEADER_BLUE = "#0C4A6E";

function coalesce<T>(...vals: (T | undefined | null | "")[]) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return undefined;
}

function joinDateTime(dateStr?: string, timeStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (timeStr) {
    const [h, m = "0"] = timeStr.toString().split(":");
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  }
  return d.toISOString();
}

function mapProjectRow(row: any): UIEvent | null {
  // Require a real projects.id (to satisfy FK)
  if (!row?.id) return null;

  const startISO =
    coalesce<string>(
      row.starts_at,
      row.start_at,
      row.start_date,
      row.start_datetime,
      row.start,
      row.datetime,
      row.when,
      row.date
    ) ??
    joinDateTime(
      coalesce<string>(row.event_date, row.date_only, row.day, row.on_date, row.schedule_date),
      coalesce<string>(row.start_time, row.time_start, row.time)
    );

  if (!startISO) return null;

  const endISO =
    coalesce<string>(
      row.ends_at,
      row.end_at,
      row.end_date,
      row.end_datetime,
      row.end_time,
      row.end
    ) ??
    joinDateTime(
      coalesce<string>(row.event_date, row.date_only, row.day, row.on_date),
      coalesce<string>(row.end_time, row.time_end)
    ) ??
    null;

  const rawMode = (coalesce<string>(row.mode, row.type, row.format, row.project_type) ?? "")
    .toString()
    .toLowerCase();
  const mode: UIEvent["mode"] | undefined =
    rawMode.includes("online") ? "online" :
    (rawMode.includes("person") || rawMode.includes("onsite")) ? "in-person" : undefined;

  let speakers: string[] | undefined;
  if (Array.isArray(row.speakers)) speakers = row.speakers;
  else if (typeof row.speakers_csv === "string")
    speakers = row.speakers_csv.split(",").map((s: string) => s.trim()).filter(Boolean);
  else if (typeof row.hosts_csv === "string")
    speakers = row.hosts_csv.split(",").map((s: string) => s.trim()).filter(Boolean);

  const imageUrl =
    coalesce<string>(
      row.image_url,
      row.image,
      row.cover,
      row.cover_url,
      row.banner_url,
      row.thumbnail_url,
      row.photo_url
    ) ?? null;

  return {
    id: String(row.id), // <-- strictly use projects.id
    title: String(coalesce(row.title, row.name, row.project_title, "Untitled")),
    startISO,
    endISO,
    location: String(coalesce(row.location, row.venue, row.address, row.place, "To be announced")),
    description: coalesce(row.description, row.details, row.summary) ?? null,
    speakers,
    mode,
    imageUrl,
  };
}

export default function Events() {
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [regs, setRegs] = useState<RegistrationMap>({});
  const [form, setForm] = useState<Record<string, { first: string; last: string; idnum: string }>>(
    {}
  );
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.from("projects").select("*");
    if (error) {
      setErr(error.message);
      setEvents([]);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map(mapProjectRow).filter(Boolean) as UIEvent[];

    const today = startOfDay(new Date());
    const upcoming = mapped.filter((e) => {
      const start = new Date(e.startISO);
      const end = e.endISO ? new Date(e.endISO) : null;
      return start >= today || (end && end >= today);
    });
    const sorter = (a: UIEvent, b: UIEvent) => +new Date(a.startISO) - +new Date(b.startISO);
    setEvents((upcoming.length > 0 ? upcoming : mapped).sort(sorter));
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
    const channel = supabase
      .channel("projects-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      try {
        if ("removeChannel" in supabase && typeof (supabase as any).removeChannel === "function") {
          (supabase as any).removeChannel(channel);
        } else if (channel && typeof (channel as any).unsubscribe === "function") {
          (channel as any).unsubscribe();
        }
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      if (!userId || events.length === 0) return;
      const ids = events.map((e) => e.id);
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id, event_id, status")
        .in("event_id", ids)
        .eq("user_id", userId);

      if (!error && data) {
        const map: RegistrationMap = {};
        for (const r of data)
          map[String((r as any).event_id)] = {
            id: (r as any).id,
            status: (r as any).status,
          };
        setRegs(map);
      }
    })();
  }, [userId, events]);

  async function handleRegister(eventId: string) {
    if (!userId) {
      alert("Please log in first to register.");
      return;
    }

    setSubmitting((s) => ({ ...s, [eventId]: true }));

    try {
      // Already registered?
      const { data: existing, error: checkErr } = await supabase
        .from("event_registrations")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existing) {
        setRegs((r) => ({ ...r, [eventId]: { id: existing.id, status: existing.status } }));
      } else {
        // Insert minimal valid columns; defaults/RLS handle the rest
        const { data: inserted, error: insErr } = await supabase
          .from("event_registrations")
          .insert({ event_id: eventId, user_id: userId }) // status/created_at/updated_at via defaults
          .select("id, status")
          .single();

        if (insErr) throw insErr;

        setRegs((r) => ({
          ...r,
          [eventId]: { id: (inserted as any).id, status: (inserted as any).status },
        }));
      }
    } catch (e: any) {
      console.error("Registration insert failed:", e?.message ?? e);
      alert("Registration failed. Please try again.");
    } finally {
      setSubmitting((s) => ({ ...s, [eventId]: false }));
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <h1 className="text-2xl font-bold text-center mt-6 mb-2">Upcoming Events</h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Here are some upcoming events that we're brewing
      </p>

      {err ? (
        <p className="text-center text-destructive">{err}</p>
      ) : loading ? (
        <p className="text-center text-muted-foreground">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-center text-muted-foreground">No events found.</p>
      ) : (
        <div className="grid gap-6">
          {events.map((ev) => {
            const reg = regs[ev.id];
            const applied = !!reg;
            return (
              <Card key={ev.id} className="p-4 shadow-sm rounded-xl border">
                {ev.mode && (
                  <Badge variant="secondary" className="mb-2">
                    {ev.mode === "in-person" ? "In-person" : "Online"}
                  </Badge>
                )}

                <h2 className="text-lg font-semibold">{ev.title}</h2>

                <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(ev.startISO), "EEE dd MMM yyyy")}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(ev.startISO), "h:mm a")}
                    {ev.endISO ? ` - ${format(new Date(ev.endISO), "h:mm a")}` : null}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {ev.location}
                  </p>
                </div>

                {ev.description && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold">Details</h3>
                    <p className="text-sm text-muted-foreground">{ev.description}</p>
                  </div>
                )}

                {ev.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={ev.imageUrl}
                      alt={ev.title}
                      className="w-full h-40 rounded-xl object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <div
                  className="mt-4 rounded-xl p-4"
                  style={{ backgroundColor: HEADER_BLUE, color: "white" }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Register for this event</h3>
                    {applied && (
                      <span className="inline-flex items-center gap-1 text-xs bg:white/10 px-2 py-1 rounded">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {reg!.status === "approved"
                          ? "Approved"
                          : reg!.status === "declined"
                          ? "Declined"
                          : "Applied (pending)"}
                      </span>
                    )}
                  </div>

                  {!applied ? (
                    <div className="mt-3 space-y-2">
                      <Input
                        placeholder="First name (optional)"
                        value={form[ev.id]?.first ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [ev.id]: { ...(f[ev.id] ?? { last: "", idnum: "" }), first: e.target.value },
                          }))
                        }
                        className="bg-white text-black placeholder:text-gray-500"
                      />
                      <Input
                        placeholder="Last name (optional)"
                        value={form[ev.id]?.last ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [ev.id]: { ...(f[ev.id] ?? { first: "", idnum: "" }), last: e.target.value },
                          }))
                        }
                        className="bg:white text-black placeholder:text-gray-500"
                      />
                      <Input
                        placeholder="ID Number (optional)"
                        value={form[ev.id]?.idnum ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [ev.id]: { ...(f[ev.id] ?? { first: "", last: "" }), idnum: e.target.value },
                          }))
                        }
                        className="bg:white text-black placeholder:text-gray-500"
                      />

                      <Button
                        type="button"
                        onClick={() => handleRegister(ev.id)}
                        disabled={submitting[ev.id]}
                        className="w-full bg-white hover:bg-white/90"
                        style={{ color: HEADER_BLUE }}
                      >
                        {submitting[ev.id] ? "Saving…" : "Save my spot"}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-white/80">
                      You’ve applied for this event. Status:{" "}
                      <span className="font-semibold capitalize">{reg!.status}</span>.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
