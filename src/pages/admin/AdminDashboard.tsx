// src/pages/admin/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isAfter,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";

type Project = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status?: string | null;
  visibility?: string | null;
};

type PollRow = {
  id: string;
  question: string;
  is_active: boolean;
  updated_at: string;
};

type PollOptionRow = {
  id: string;
  poll_id: string;
  label: string;
  order_index: number;
  votes_count: number | null;
};

const ADMIN_BLUE = "#173A67";
const STRIP_BG = "#EAF2FF";
const TRACK = "#E8F2FF";
const today = new Date();

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
  const [activeYouth, setActiveYouth] = useState(0);
  const [activeYouthChange, setActiveYouthChange] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [upcomingChange, setUpcomingChange] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [activeProjectsChange, setActiveProjectsChange] = useState(0);

  const [recent, setRecent] = useState<{ id: string; text: string; by: string; when: string }[]>([]);

  const [upcomingEvents, setUpcomingEvents] = useState<
    { id: string; title: string; dateLabel: string; attendees: string }[]
  >([]);

  const [monthCursor, setMonthCursor] = useState(startOfMonth(today));
  const [monthEvents, setMonthEvents] = useState<Project[]>([]);
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

  const sidebarSchedule = useMemo(() => {
    const groups: { label: string; items: Project[] }[] = [];
    const labels = ["Today", "Tomorrow"];
    for (let i = 0; i < 10; i++) {
      const dayKey = format(addDays(today, i), "yyyy-MM-dd");
      const items = eventsByDay.get(dayKey) ?? [];
      if (items.length === 0) continue;
      const label = i < 2 ? labels[i] : format(addDays(today, i), "MMM d");
      groups.push({ label, items });
    }
    return groups.slice(0, 3);
  }, [eventsByDay]);

  const [pollOpen, setPollOpen] = useState(false);
  const [pollMode, setPollMode] = useState<"create" | "edit">("create");
  const [pollId, setPollId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");

  const [pollDisplay, setPollDisplay] = useState({
    question: "Poll question here?",
    options: [] as { label: string; pct: number; votes: number }[],
    lastUpdated: format(today, "p MMM d, yyyy"),
  });

  async function loadActivePoll() {
    const { data: polls } = await supabase
      .from("polls")
      .select("id,question,is_active,updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (!polls || polls.length === 0) {
      setPollId(null);
      setPollDisplay((d) => ({ ...d, question: "No active poll", options: [] }));
      return;
    }
    const p: PollRow = polls[0] as any;
    const { data: options } = await supabase
      .from("poll_options")
      .select("id,poll_id,label,order_index,votes_count")
      .eq("poll_id", p.id)
      .order("order_index", { ascending: true });
    const totalVotes = (options ?? []).reduce((acc, o) => acc + (o.votes_count || 0), 0);
    const mapped = (options ?? []).map((o) => ({
      label: (o as PollOptionRow).label,
      votes: (o as PollOptionRow).votes_count || 0,
      pct: totalVotes > 0 ? Math.round((((o as PollOptionRow).votes_count || 0) / totalVotes) * 100) : 0,
    }));
    setPollId(p.id);
    setPollDisplay({
      question: p.question,
      options: mapped,
      lastUpdated: format(new Date(p.updated_at), "p MMM d, yyyy"),
    });
  }

  async function createPoll(question: string, labels: string[]) {
    await supabase.from("polls").update({ is_active: false });
    const { data: inserted } = await supabase
      .from("polls")
      .insert({ question, is_active: true })
      .select("id,question,is_active,updated_at")
      .single();
    if (!inserted) return;
    const newId = (inserted as PollRow).id;
    const rows = labels.map((label, idx) => ({
      poll_id: newId,
      label,
      order_index: idx,
      votes_count: 0,
    }));
    if (rows.length > 0) {
      await supabase.from("poll_options").insert(rows);
    }
    await loadActivePoll();
  }

  async function updatePoll(id: string, question: string, labels: string[]) {
    await supabase.from("polls").update({ question }).eq("id", id);
    await supabase.from("poll_options").delete().eq("poll_id", id);
    const rows = labels.map((label, idx) => ({
      poll_id: id,
      label,
      order_index: idx,
      votes_count: 0,
    }));
    if (rows.length > 0) {
      await supabase.from("poll_options").insert(rows);
    }
    await loadActivePoll();
  }

  useEffect(() => {
    (async () => {
      const { count: totalNonAdmin } = await supabase
        .from("profiles")
        .select("*", { head: true, count: "exact" })
        .or("is_admin.is.false,is_admin.is.null");
      setActiveYouth(totalNonAdmin ?? 0);

      const startThisISO = startOfMonth(today).toISOString();
      const startPrevISO = startOfMonth(subMonths(today, 1)).toISOString();

      const [{ count: thisMonth }, { count: prevMonth }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { head: true, count: "exact" })
          .gte("created_at", startThisISO)
          .or("is_admin.is.false,is_admin.is.null"),
        supabase
          .from("profiles")
          .select("*", { head: true, count: "exact" })
          .gte("created_at", startPrevISO)
          .lt("created_at", startThisISO)
          .or("is_admin.is.false,is_admin.is.null"),
      ]);
      setActiveYouthChange((thisMonth ?? 0) - (prevMonth ?? 0));

      const { data: allProjects } = await supabase
        .from("projects")
        .select("id,title,start_date,end_date,status,visibility,created_at")
        .order("start_date", { ascending: true });

      const now = new Date();
      const in3Months = addMonths(now, 3);

      const withDates = (allProjects ?? []).filter((p) => !!p.start_date);
      const future = withDates.filter((p) => isAfter(new Date(p.start_date as string), now));
      const next3Months = future.filter((p) => new Date(p.start_date as string) <= in3Months);
      const chosen = (next3Months.length ? next3Months : future).sort(
        (a, b) => new Date(a.start_date as string).getTime() - new Date(b.start_date as string).getTime()
      );

      setUpcomingCount(future.length);

      const startThisM = startOfMonth(today);
      const startPrevM = startOfMonth(subMonths(today, 1));
      const endPrevM = endOfMonth(subMonths(today, 1));

      const [{ data: thisArr }, { data: prevArr }] = await Promise.all([
        supabase.from("projects").select("id,start_date").gte("start_date", format(startThisM, "yyyy-MM-dd")),
        supabase
          .from("projects")
          .select("id,start_date")
          .gte("start_date", format(startPrevM, "yyyy-MM-dd"))
          .lte("start_date", format(endPrevM, "yyyy-MM-dd")),
      ]);
      setUpcomingChange((thisArr ?? []).length - (prevArr ?? []).length);

      const cards = await Promise.all(
        chosen.slice(0, 4).map(async (p) => {
          const regs = await countRegistrationsSafe(p.id);
          const dateLabel = p.start_date
            ? `${format(parseISO(p.start_date), "EEE d MMM yyyy")}  ${format(parseISO(p.start_date), "h:mm a")}`
            : "TBA";
          return {
            id: p.id,
            title: p.title,
            dateLabel,
            attendees: regs === null ? "— registered" : `${regs} registered`,
          };
        })
      );
      setUpcomingEvents(cards);

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
          text: `New project created: ${r.title ?? "Untitled"}`,
          by: "Admin",
          when: r.created_at ? format(parseISO(r.created_at), "p · MMM d") : "",
        })
      );
      items.sort((a, b) => (a.when < b.when ? 1 : -1));
      setRecent(items.slice(0, 6));

      const todayIso = format(today, "yyyy-MM-dd");
      const { count } = await supabase
        .from("projects")
        .select("id", { head: true, count: "exact" })
        .or(`end_date.is.null,end_date.gte.${todayIso}`);
      setActiveProjectsCount(count ?? 0);

      const prevCut = endOfMonth(subMonths(today, 1));
      const { count: prevActive } = await supabase
        .from("projects")
        .select("id", { head: true, count: "exact" })
        .or(`end_date.is.null,end_date.gte.${format(prevCut, "yyyy-MM-dd")}`);
      setActiveProjectsChange((count ?? 0) - (prevActive ?? 0));

      await loadActivePoll();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const mStart = format(startOfMonth(monthCursor), "yyyy-MM-dd");
      const mEnd = format(endOfMonth(monthCursor), "yyyy-MM-dd");

      const { data } = await supabase
        .from("projects")
        .select("id,title,start_date,end_date,status,visibility")
        .order("start_date", { ascending: true });

      const rows = (data ?? []).filter((p) => {
        const sd = p.start_date ? new Date(p.start_date) : null;
        const ed = p.end_date ? new Date(p.end_date) : null;
        const monthStart = new Date(mStart);
        const monthEnd = new Date(mEnd);
        if (sd && sd >= monthStart && sd <= monthEnd) return true;
        if (ed && ed >= monthStart && ed <= monthEnd) return true;
        if (sd && sd < monthStart && (!ed || ed >= monthStart)) return true;
        return false;
      });

      setMonthEvents(rows);
    })();
  }, [monthCursor]);

  const statStrip = [
    { name: "Active Youth Members", value: String(activeYouth), change: activeYouthChange },
    { name: "Participation Rate", value: "84%", change: 3 },
    { name: "Upcoming Projects", value: String(upcomingCount), change: upcomingChange },
    { name: "Active Projects", value: String(activeProjectsCount), change: activeProjectsChange },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top strip forced under the header; pull it up to cover any page top padding */}
      <div className="w-screen relative left-1/2 -translate-x-1/2 bg-[#EAF2FF] -mt-6">
        <div className="px-6 pt-8 pb-12 lg:pt-10 lg:pb-14">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
            <div className="xl:col-span-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">SK Command Dashboard</h1>
              <p className="text-gray-700">Welcome back! Here’s what’s happening in Loyola Heights.</p>
            </div>
            <div className="xl:col-span-8">
              <div className="grid grid-cols-2 md:grid-cols-4">
                {statStrip.map((s, i) => {
                  const positive = s.change >= 0;
                  return (
                    <div key={s.name} className={["flex items-center justify-between px-3 py-2", i > 0 ? "md:border-l md:border-white/60" : ""].join(" ")}>
                      <div className="flex items-start gap-2">
                        {positive ? (
                          <TrendingUp className="h-4 w-4 mt-1 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mt-1 text-red-600" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-800">{s.name}</p>
                          <p className="mt-1 text-2xl font-extrabold text-gray-900">{s.value}</p>
                          <p className={`text-xs mt-1 ${positive ? "text-emerald-600" : "text-red-600"}`}>
                            {`${positive ? "+" : ""}${s.change} from last month`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-stretch">
          <Card className="border shadow-md rounded-xl h-full min-h-[calc(100vh-320px)] flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm tracking-widest text-gray-800">
                  {format(monthCursor, "MMMM yyyy").toUpperCase()}
                </CardTitle>
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
            <CardContent className="pt-0 flex-1">
              <div className="grid grid-cols-7 text-[11px] text-gray-500 mb-2">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div key={d} className="text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {monthDays.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const has = (eventsByDay.get(key) ?? []).length > 0;
                  return (
                    <div
                      key={key}
                      className={[
                        "h-9 rounded-md text-sm flex items-center justify-center",
                        !isSameMonth(d, monthCursor) ? "text-gray-400" : "text-gray-800",
                        isToday(d) ? "font-semibold ring-2 ring-sky-600" : "",
                      ].join(" ")}
                    >
                      <div className="flex flex-col items-center">
                        <span>{format(d, "d")}</span>
                        {has && <span className="mt-0.5 h-1 w-1 rounded-full bg-sky-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {sidebarSchedule.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events coming up.</div>
              ) : (
                sidebarSchedule.map((g) => (
                  <div key={g.label} className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">{g.label}</p>
                    <div className="space-y-2">
                      {g.items.map((e) => (
                        <div key={e.id} className="rounded-lg px-3 py-2 text-sm flex items-center justify-between" style={{ backgroundColor: TRACK, color: "#0B3759" }}>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{e.title}</div>
                            <div className="text-[11px] flex items-center gap-1 opacity-80">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {e.start_date ? `${format(parseISO(e.start_date), "h:mm a")}` : "TBA"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-md rounded-xl h-full min-h-[calc(100vh-320px)] flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-2xl">Recent Activites</CardTitle>
              <CardDescription>Last update at {format(today, "p MMM d, yyyy")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="space-y-3">
                {recent.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                ) : (
                  recent.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="mt-2 h-2 w-2 rounded-full bg-sky-700" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-semibold">{a.text}</p>
                        <p className="text-[11px] text-gray-500">by {a.by} • {a.when}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-md rounded-xl h-full min-h-[calc(100vh-320px)] flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="text-2xl">Upcoming Events</CardTitle>
              <CardDescription>Last update at {format(today, "p MMM d, yyyy")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events.</p>
                ) : (
                  upcomingEvents.map((e) => (
                    <div key={e.id} className="flex items-center justify-between rounded-xl bg-[#FBFCFE] border px-4 py-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{e.title}</p>
                        <p className="text-xs text-gray-700 truncate">{e.dateLabel}</p>
                        <div className="text-xs text-sky-700 flex items-center gap-1">
                          <span>{e.attendees}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="rounded-full border-[1.5px]" style={{ borderColor: ADMIN_BLUE, color: ADMIN_BLUE }}>
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-md rounded-xl h-full">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Poll</CardTitle>
                <Button
                  onClick={() => {
                    setPollMode("create");
                    setPollQuestion("");
                    setOpt1("");
                    setOpt2("");
                    setOpt3("");
                    setPollOpen(true);
                  }}
                  className="rounded-full bg-[#0d2747] hover:bg-[#0b223d] text-white"
                >
                  Create Poll
                </Button>
              </div>
              <CardDescription>Last respondent at {pollDisplay.lastUpdated}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <p className="text-sm font-medium text-gray-900">{pollDisplay.question}</p>
              {pollDisplay.options.length === 0 ? (
                <div className="text-sm text-muted-foreground">No options yet.</div>
              ) : (
                pollDisplay.options.map((o) => (
                  <div key={o.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-800">{o.label}</span>
                      <span className="text-gray-700">{o.pct}%</span>
                    </div>
                    <div className="h-8 rounded-lg" style={{ backgroundColor: TRACK }}>
                      <div className="h-8 rounded-lg flex items-center px-3" style={{ width: `${o.pct}%`, backgroundColor: ADMIN_BLUE }} />
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">{o.votes} votes</div>
                  </div>
                ))
              )}
              <button
                className="text-[11px] text-gray-600 underline"
                onClick={() => {
                  setPollMode("edit");
                  setPollQuestion(pollDisplay.question);
                  setOpt1(pollDisplay.options[0]?.label ?? "");
                  setOpt2(pollDisplay.options[1]?.label ?? "");
                  setOpt3(pollDisplay.options[2]?.label ?? "");
                  setPollOpen(true);
                }}
                disabled={!pollId}
              >
                Edit
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={pollOpen} onOpenChange={setPollOpen}>
        <DialogContent className="max-w-md rounded-2xl p-8">
          <div className="w-full flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: ADMIN_BLUE }}>
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-semibold">{pollMode === "create" ? "Create a new poll" : "Edit poll"}</DialogTitle>
          </DialogHeader>
          <div className="mt-6 space-y-4">
            <Input placeholder="Poll question" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} className="h-12 rounded-xl text-base" />
            <Input placeholder="Option 1" value={opt1} onChange={(e) => setOpt1(e.target.value)} className="h-12 rounded-xl text-base" />
            <Input placeholder="Option 2" value={opt2} onChange={(e) => setOpt2(e.target.value)} className="h-12 rounded-xl text-base" />
            <Input placeholder="Option 3" value={opt3} onChange={(e) => setOpt3(e.target.value)} className="h-12 rounded-xl text-base" />
          </div>
          <DialogFooter className="mt-8 flex w-full gap-4 justify-center">
            <Button
              variant="secondary"
              onClick={() => setPollOpen(false)}
              className="rounded-2xl px-8 h-12 text-lg bg-[#0d2747] text-white hover:bg-[#0b223d]"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const labels = [opt1, opt2, opt3].map((s) => s.trim()).filter((s) => s.length > 0);
                if (pollMode === "create") {
                  await createPoll(pollQuestion.trim() || "Poll", labels);
                } else if (pollMode === "edit" && pollId) {
                  await updatePoll(pollId, pollQuestion.trim() || "Poll", labels);
                }
                setPollOpen(false);
              }}
              className="rounded-2xl px-8 h-12 text-lg bg-[#0d2747] text-white hover:bg-[#0b223d]"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
