// src/pages/user/Events.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, CheckCircle2 } from "lucide-react";
import { format, startOfDay } from "date-fns";

import { useEvents } from "@/hooks/useEvents"; // Import your updated hook
import type { Project } from "../../hooks/useEvents";

import { useProjectRegistration } from "../../hooks/useProjectRegistration";

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
  { status: "pending" | "approved" | "denied"; id: string } | undefined
>;

const HEADER_BLUE = "#0C4A6E"; // match your header color if different

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

  const mode: UIEvent["mode"] | undefined = rawMode.includes("online")
    ? "online"
    : rawMode.includes("person") || rawMode.includes("onsite")
    ? "in-person"
    : undefined;

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
    id: String(coalesce(row.id, row.uuid, row.slug, Math.random().toString(36).slice(2))),
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

function isEventEnded(ev: UIEvent, now = new Date()) {
  const start = new Date(ev.startISO);
  const end = ev.endISO ? new Date(ev.endISO) : null;
  return now.getTime() > (end ? end.getTime() : start.getTime());
}

export default function Events() {
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [regs, setRegs] = useState<RegistrationMap>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  // Use the hook to fetch all projects
  const { projects, isLoading, isError } = useEvents();
  const { registrations, register } = useProjectRegistration();

  // useEffect(() => {
  //   (async () => {
  //     const { data } = await supabase.auth.getUser();
  //     setUserId(data?.user?.id ?? null);
  //   })();
  // }, []);

  // async function fetchProjects() {
  //   setLoading(true);
  //   setErr(null);

  //   const { data, error } = await supabase.from("projects").select("*");
  //   if (error) {
  //     setErr(error.message);
  //     setEvents([]);
  //     setLoading(false);
  //     return;
  //   }

  //   const mapped = (data ?? []).map(mapProjectRow).filter(Boolean) as UIEvent[];

  //   const today = startOfDay(new Date());
  //   const upcoming = mapped.filter((e) => {
  //     const start = new Date(e.startISO);
  //     const end = e.endISO ? new Date(e.endISO) : null;
  //     return start >= today || (end && end >= today);
  //   });

  //   const sorter = (a: UIEvent, b: UIEvent) => +new Date(a.startISO) - +new Date(b.startISO);
  //   setEvents((upcoming.length > 0 ? upcoming : mapped).sort(sorter));
  //   setLoading(false);
  // }

  // useEffect(() => {
  //   fetchProjects();

  //   const channel = supabase
  //     .channel("projects-live")
  //     .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => fetchProjects())
  //     .subscribe();

  //   return () => {
  //     try {
  //       if ("removeChannel" in supabase && typeof (supabase as any).removeChannel === "function") {
  //         (supabase as any).removeChannel(channel);
  //       } else if (channel && typeof (channel as any).unsubscribe === "function") {
  //         (channel as any).unsubscribe();
  //       }
  //     } catch {}
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // useEffect(() => {
  //   (async () => {
  //     if (!userId || events.length === 0) return;

  //     const ids = events.map((e) => e.id);
  //     const { data, error } = await supabase
  //       .from("project_registrations")
  //       .select("id, project_id, status")
  //       .in("project_id", ids)
  //       .eq("user_id", userId);

  //     if (!error && data) {
  //       const map: RegistrationMap = {};
  //       for (const r of data) map[String(r.project_id)] = { id: r.id, status: r.status };
  //       setRegs(map);
  //     }
  //   })();
  // }, [userId, events]);

  async function handleRegister(projectId: string) {
    // Pass the project UUID to the register function
    register(projectId, {
      onSuccess: () => {
        alert("Successfully registered to the event.");
      },
      onError: (error) => {
        alert("Failed to register: " + error.message);
      }
    });
    
    // if (!userId) {
    //   alert("Please log in first to register.");
    //   return;
    // }

    // setSubmitting((s) => ({ ...s, [projectId]: true }));

    // const { data, error } = await supabase
    //   .from("project_registrations")
    //   .upsert(
    //     { project_id: projectId, user_id: userId, status: "pending" as const },
    //     { onConflict: "project_id,user_id" }
    //   )
    //   .select("id,status")
    //   .single();

    // setSubmitting((s) => ({ ...s, [projectId]: false }));

    // if (error) {
    //   console.error(error);
    //   alert("Registration failed. Please try again.");
    //   return;
    // }

    // setRegs((r) => ({ ...r, [projectId]: { id: data!.id, status: data!.status } }));
  }

  const now = useMemo(() => new Date(), [projects, isLoading, isError]);

  const publicRows: Project[] = Array.isArray(projects) 
    ? projects.filter(p => p.visibility === 'public' && p.is_active)
    : [];

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24">
      <h1 className="text-2xl font-bold text-center mt-6 mb-2">Upcoming Events</h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Here are some upcoming events that we're brewing
      </p>

      {isError ? (
        <p className="text-center text-destructive">{isError}</p>
      ) : isLoading ? (
        <p className="text-center text-muted-foreground">Loading…</p>
      ) : publicRows.length === 0 ? (
        <p className="text-center text-muted-foreground">No events found.</p>
      ) : (
        <div className="grid gap-6">
          {publicRows.map((ev: Project) => {
            const reg = regs[ev.id];
            const applied = registrations.some(r => r.event === ev.id);
            const eventRegistration = registrations.find(r=>r.event===ev.id);
            const ended = isEventEnded(ev, now);

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
                    {format(new Date(ev.start_date), "EEE dd MMM yyyy")}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {format(new Date(ev.start_date), "h:mm a")}
                    {ev.end_date ? ` - ${format(new Date(ev.end_date), "h:mm a")}` : null}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-sky-700" />
                    <span className="text-sm">
                      {ev.address?.trim() || "To be announced"}
                    </span>
                  </p>
                </div>

                {ev.body && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold">Details</h3>
                    <p className="text-sm text-muted-foreground">{ev.body}</p>
                  </div>
                )}

                {ev.cover_image && (
                  <div className="mt-4">
                    <img
                      src={ev.cover_image}
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

                    {/* Only show pill for applied status */}
                    {applied ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-white/10 px-2 py-1 rounded">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {eventRegistration?.status === "approved"
                          ? "Approved"
                          : eventRegistration?.status === "denied"
                          ? "Denied"
                          : "Applied (pending)"}
                      </span>
                    ) : null}
                  </div>

                  {!applied ? (
                    <Button
                      type="button"
                      onClick={() => handleRegister(ev.id)}
                      disabled={ended || !!submitting[ev.id]}
                      className="w-full mt-3 bg-white hover:bg-white/90 disabled:opacity-60"
                      style={{ color: HEADER_BLUE }}
                    >
                      {ended ? "Event ended" : submitting[ev.id] ? "Saving…" : "Save my spot"}
                    </Button>
                  ) : (
                    <p className="mt-3 text-sm text-white/80">
                      You’ve registered for this event. Status:{" "}
                      <span className="font-semibold capitalize">{eventRegistration?.status}</span>.
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
