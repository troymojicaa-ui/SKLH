// src/pages/command/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar as CalendarIcon, FileText, TrendingUp, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";

/** DB types */
type Project = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status?: string | null;      // e.g. 'published', 'draft'
  visibility?: string | null;  // e.g. 'public', 'private'
  is_active?: boolean | null;
  location?: string | null;
};

const ADMIN_BLUE = "#173A67";
const today = new Date();

/** Central, single source of truth for “is this project visible as an event?” */
function isPublicEventProject(p: Partial<Project>) {
  const vis = (p.visibility ?? "").toString().toLowerCase();
  const stat = (p.status ?? "").toString().toLowerCase();
  const notPrivate = vis === "" || vis === "public" || vis === null;
  const notDraft = stat === "" || stat === "published" || stat === null;
  return notPrivate && notDraft;
}

async function countRegistrationsSafe(projectId: string) {
  try {
    const { count } = await supabase
      .from("event_registrations")
      .select("*", { head: true, count: "exact" })
      .eq("project_id", projectId);
    return count ?? 0;
  } catch {
    return null;
  }
}

export default function AdminDashboard() {
  // Stats
  const [activeYouth, setActiveYouth] = useState(0);
  const [activeYouthChange, setActiveYouthChange] = useState("");

  const [upcomingCount, setUpcomingCount] = useState(0);
  const [upcomingChange, setUpcomingChange] = useState("");

  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [activeProjectsChange, setActiveProjectsChange] = useState("");

  // Recent
  const [recent, setRecent] = useState<{ id: string; text: string; by: string; when: string }[]>([]);

  // Bottom cards
  const [upcomingEvents, setUpcomingEvents] = useState<
    { id: string; title: string; dateLabel: string; attendees: string }[]
  >([]);

  // Calendar
  const [monthCursor, setMonthCursor] = useState(startOfMonth(today));
  const [monthEvents, setMonthEvents] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(monthCursor), end: endOfMonth(monthCursor) }),
    [monthCursor]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Project[]>();
    monthEvents.forEach((p) => {
      if (!p.start_date) return;
      const key = format(parseISO(p.start_date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [monthEvents]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDayEvents = eventsByDay.get(selectedKey) ?? [];
  const tomorrowKey = format(addDays(selectedDate, 1), "yyyy-MM-dd");
  const tomorrowEvents = eventsByDay.get(tomorrowKey) ?? [];
  const nothingSoon = selectedDayEvents.length === 0 && tomorrowEvents.length === 0;

  // ----------------- Load dashboard data -----------------
  useEffect(() => {
    (async () => {
      // 1) Active Youth Members (non-admin) + MoM delta (signups)
      {
        const { count: totalNonAdmin } = await supabase
          .from("profiles")
          .select("*", { head: true, count: "exact" })
          .or("is_admin.is.false,is_admin.is.null");
        setActiveYouth(totalNonAdmin ?? 0);

        const startThis = startOfMonth(today).toISOString();
        const startPrev = startOfMonth(subMonths(today, 1)).toISOString();

        const [{ count: thisMonth }, { count: prevMonth }] = await Promise.all([
          supabase
            .from("profiles")
            .select("*", { head: true, count: "exact" })
            .gte("created_at", startThis)
            .or("is_admin.is.false,is_admin.is.null"),
          supabase
            .from("profiles")
            .select("*", { head: true, count: "exact" })
            .gte("created_at", startPrev)
            .lt("created_at", startThis)
            .or("is_admin.is.false,is_admin.is.null"),
        ]);
        const diff = (thisMonth ?? 0) - (prevMonth ?? 0);
        setActiveYouthChange(`${diff >= 0 ? "+" : ""}${diff}% from last month`);
      }

      // 2) Upcoming “events” (projects) + MoM delta (using the same filter)
      {
        // future projects
        const { data } = await supabase
          .from("projects")
          .select("id,title,start_date,end_date,visibility,status,is_active,location")
          .gte("start_date", format(today, "yyyy-MM-dd"))
          .order("start_date", { ascending: true });

        const upcoming = (data ?? []).filter(isPublicEventProject);
        setUpcomingCount(upcoming.length);

        // month-on-month change (same filter)
        const startThis = startOfMonth(today);
        const startPrev = startOfMonth(subMonths(today, 1));
        const endPrev = endOfMonth(subMonths(today, 1));

        const [{ data: thisArr }, { data: prevArr }] = await Promise.all([
          supabase
            .from("projects")
            .select("id,start_date,visibility,status")
            .gte("start_date", format(startThis, "yyyy-MM-dd")),
          supabase
            .from("projects")
            .select("id,start_date,visibility,status")
            .gte("start_date", format(startPrev, "yyyy-MM-dd"))
            .lte("start_date", format(endPrev, "yyyy-MM-dd")),
        ]);
        const delta = (thisArr ?? []).filter(isPublicEventProject).length -
                      (prevArr ?? []).filter(isPublicEventProject).length;
        setUpcomingChange(`${delta >= 0 ? "+" : ""}${delta} from last month`);

        // Cards (top 3) with reg counts
        const top3 = upcoming.slice(0, 3);
        const cards = await Promise.all(
          top3.map(async (p) => {
            const regs = await countRegistrationsSafe(p.id);
            const dateLabel = p.start_date ? format(parseISO(p.start_date), "MMM d, yyyy") : "TBA";
            return {
              id: p.id,
              title: p.title,
              dateLabel,
              attendees: regs === null ? "— registered" : `${regs} registered`,
            };
          })
        );
        setUpcomingEvents(cards);
      }

      // 3) Active projects now (ongoing) + MoM
      {
        const { count } = await supabase
          .from("projects")
          .select("id", { head: true, count: "exact" })
          .or(`end_date.is.null,end_date.gte.${format(today, "yyyy-MM-dd")}`)
          .or("is_active.is.true,is_active.is.null");
        setActiveProjectsCount(count ?? 0);

        const prevCut = endOfMonth(subMonths(today, 1));
        const { count: prevActive } = await supabase
          .from("projects")
          .select("id", { head: true, count: "exact" })
          .or(`end_date.is.null,end_date.gte.${format(prevCut, "yyyy-MM-dd")}`)
          .or("is_active.is.true,is_active.is.null");
        const delta = (count ?? 0) - (prevActive ?? 0);
        setActiveProjectsChange(`${delta >= 0 ? "+" : ""}${delta} from last month`);
      }

      // 4) Recent (quick blend of profiles/projects)
      {
        const [{ data: p5 }, { data: pr5 }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,created_at")
            .or("is_admin.is.false,is_admin.is.null")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("projects")
            .select("id,title,created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const items: { id: string; text: string; by: string; when: string }[] = [];
        (p5 ?? []).forEach((r: any) =>
          items.push({
            id: `u-${r.id}`,
            text: "New youth member registered",
            by: "System",
            when: r.created_at ? format(parseISO(r.created_at), "p · MMM d") : "",
          })
        );
        (pr5 ?? []).forEach((r: any) =>
          items.push({
            id: `pr-${r.id}`,
            text: `Project created: ${r.title ?? "Untitled"}`,
            by: "Admin",
            when: r.created_at ? format(parseISO(r.created_at), "p · MMM d") : "",
          })
        );
        items.sort((a, b) => (a.when < b.when ? 1 : -1));
        // show ~6
        setRecent(items.slice(0, 6));
      }
    })();
  }, []);

  // Calendar month events fetch (same event filter)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,start_date,end_date,location,is_active,visibility,status")
        .gte("start_date", format(startOfMonth(monthCursor), "yyyy-MM-dd"))
        .lte("start_date", format(endOfMonth(monthCursor), "yyyy-MM-dd"))
        .order("start_date", { ascending: true });

      if (!error) setMonthEvents((data ?? []).filter(isPublicEventProject));
    })();
  }, [monthCursor]);

  const stats = [
    { name: "Active Youth Members", value: String(activeYouth), icon: Users, change: activeYouthChange },
    // This is “Upcoming Projects = Events”, using projects table + the same filter
    { name: "Upcoming Events", value: String(upcomingCount), icon: CalendarIcon, change: upcomingChange },
    { name: "Active Projects", value: String(activeProjectsCount), icon: FileText, change: activeProjectsChange },
    { name: "Participation Rate", value: "—", icon: TrendingUp, change: "data coming soon" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">SK Command Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here’s what’s happening in Loyola Heights.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.name} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">{s.name}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-emerald-600 mt-1">{s.change}</p>
                </div>
                <s.icon className="h-7 w-7" style={{ color: ADMIN_BLUE }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activities */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates from your community</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                recent.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="mt-2 h-2 w-2 rounded-full bg-sky-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{a.text}</p>
                      <p className="text-[11px] text-gray-500">by {a.by} • {a.when}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Calendar + schedule (no headings when empty) */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{format(monthCursor, "MMMM yyyy").toUpperCase()}</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setMonthCursor((d) => subMonths(d, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setMonthCursor((d) => addMonths(d, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Calendar grid */}
              <div>
                <div className="grid grid-cols-7 text-[11px] text-gray-500 mb-2">
                  {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => <div key={d} className="text-center">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const has = (eventsByDay.get(key) ?? []).length > 0;
                    const active = isSameDay(d, selectedDate);
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDate(d)}
                        className={[
                          "h-9 rounded-md text-sm hover:bg-gray-100 transition-colors",
                          !isSameMonth(d, monthCursor) ? "text-gray-400" : "text-gray-800",
                          active ? "ring-2 ring-sky-600" : "",
                        ].join(" ")}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className={isToday(d) ? "font-semibold" : ""}>{format(d, "d")}</span>
                          {has && <span className="mt-0.5 h-1 w-1 rounded-full bg-sky-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule */}
              <div>
                {nothingSoon ? (
                  <div className="text-sm text-muted-foreground">No events coming up.</div>
                ) : (
                  <>
                    {selectedDayEvents.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {selectedDayEvents.map((e) => (
                          <div key={e.id} className="rounded-md bg-sky-50 px-2 py-1.5 text-sm text-sky-900">
                            <div className="font-medium truncate">{e.title}</div>
                            <div className="text-[11px] flex items-center gap-1 text-sky-900/80">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {e.start_date ? format(parseISO(e.start_date), "HH:mm") : "TBA"}
                              {e.location && (<><span>•</span><MapPin className="h-3 w-3" /><span className="truncate">{e.location}</span></>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {tomorrowEvents.length > 0 && (
                      <div className="space-y-2">
                        {tomorrowEvents.map((e) => (
                          <div key={e.id} className="rounded-md bg-sky-50 px-2 py-1.5 text-sm text-sky-900">
                            <div className="font-medium truncate">{e.title}</div>
                            <div className="text-[11px] flex items-center gap-1 text-sky-900/80">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {e.start_date ? format(parseISO(e.start_date), "HH:mm") : "TBA"}
                              {e.location && (<><span>•</span><MapPin className="h-3 w-3" /><span className="truncate">{e.location}</span></>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events (projects) */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Events scheduled for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No upcoming events.</div>
            ) : (
              upcomingEvents.map((e) => (
                <div key={e.id} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 truncate">{e.title}</h4>
                  <p className="text-sm text-gray-600">{e.dateLabel}</p>
                  <p className="text-sm text-sky-700">{e.attendees}</p>
                  <Button size="sm" className="mt-2" variant="outline">View Details</Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
