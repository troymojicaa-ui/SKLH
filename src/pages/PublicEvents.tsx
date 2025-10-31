// src/pages/PublicEvents.tsx
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import LoginModal from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthProvider";

type Project = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_url: string | null;
  cover_path: string | null;
  location: string | null;
  status: string | null;
  visibility: string | null;
  mode?: string | null;
  speakers?: string[] | null;
};

type RegistrationStatus = "pending" | "approved" | "denied";
type RegistrationMap = Record<string, { id: string; status: RegistrationStatus } | undefined>;

function safeDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateRange(start?: string | null, end?: string | null) {
  const sd = safeDate(start);
  const ed = safeDate(end);
  if (!sd) return "";
  const left = format(sd, "EEE dd MMM yyyy");
  if (!ed) return left;
  const sameDay =
    sd.getFullYear() === ed.getFullYear() &&
    sd.getMonth() === ed.getMonth() &&
    sd.getDate() === ed.getDate();
  return sameDay ? left : `${left} – ${format(ed, "EEE dd MMM yyyy")}`;
}

function isPastEvent(p: Project) {
  const now = new Date();
  const start = safeDate(p.start_date);
  const end = safeDate(p.end_date || p.start_date);
  if (!start) return true;
  const lastDay = end ?? start;
  const cutoff = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate(),
    23, 59, 59, 999
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return cutoff < today;
}

export default function PublicEvents() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [featIdx, setFeatIdx] = useState(0);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Project | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [regs, setRegs] = useState<RegistrationMap>({});
  const [submitting, setSubmitting] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("start_date", { ascending: true });
      if (!error) setProjects(data || []);
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data?.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!userId || projects.length === 0) return;
      const ids = projects.map((p) => p.id);
      const { data, error } = await supabase
        .from("event_registrations")
        .select("id,event_id,status")
        .in("event_id", ids)
        .eq("user_id", userId);
      if (error || !data) return;
      const map: RegistrationMap = {};
      for (const r of data as any[]) {
        map[String(r.event_id)] = { id: r.id, status: r.status };
      }
      setRegs(map);
    })();
  }, [userId, projects]);

  useEffect(() => {
    if (session && !userId) {
      setUserId(session.user.id);
    }
  }, [session, userId]);

  useEffect(() => {
    if (searchParams.get("login") === "1") {
      setLoginOpen(true);
    }
  }, [searchParams]);

  const today = new Date();

  const featuredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        const d = safeDate(p.start_date);
        return d !== null && d >= today;
      })
      .sort((a, b) => {
        const da = safeDate(a.start_date)?.getTime() ?? 0;
        const db = safeDate(b.start_date)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 3);
  }, [projects]);

  const featured = featuredProjects[featIdx] ?? null;

  const toggleDay = (id: string) => {
    setOpenDay((prev) => (prev === id ? null : id));
  };

  const allSorted = useMemo(() => {
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const withValid = projects
      .map((p) => ({ p, d: safeDate(p.start_date) }))
      .filter((x) => x.d !== null) as { p: Project; d: Date }[];

    const upcoming = withValid
      .filter(({ d }) => d >= startOfToday)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .map(({ p }) => p);

    const past = withValid
      .filter(({ d }) => d < startOfToday)
      .sort((a, b) => b.d.getTime() - a.d.getTime())
      .map(({ p }) => p);

    return [...upcoming, ...past];
  }, [projects, today]);

  const closestThree = useMemo(() => allSorted.slice(0, 3), [allSorted]);
  const listToShow = expanded ? allSorted : closestThree;

  const schedule = useMemo(() => {
    const grouped: Record<string, Project[]> = {};
    projects.forEach((p) => {
      if (!p.start_date) return;
      const d = safeDate(p.start_date);
      if (!d) return;
      const key = format(d, "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return Object.entries(grouped).map(([date, items]) => ({
      id: date,
      label: format(new Date(date), "EEEE, MMM dd yyyy"),
      items,
    }));
  }, [projects]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEvent(null);
    };
    if (selectedEvent) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEvent]);

  async function registerWithoutDetails(eventId: string) {
    if (!userId) return;
    if (submitting) return;
    setSubmitting(true);
    const payload = {
      event_id: eventId,
      user_id: userId,
      status: "pending" as RegistrationStatus,
    };
    const { data, error } = await supabase
      .from("event_registrations")
      .upsert(payload, { onConflict: "event_id,user_id" })
      .select("id,status")
      .single();
    setSubmitting(false);
    if (error) {
      console.error(error);
      alert(error.message || "Registration failed. Please try again.");
      return;
    }
    setRegs((r) => ({
      ...r,
      [eventId]: { id: (data as any).id, status: (data as any).status as RegistrationStatus },
    }));
    alert("Registered! You’ll receive an update once reviewed.");
  }

  function openLoginFlow(eventId?: string) {
    setLoginOpen(true);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("login", "1");
    if (eventId) newParams.set("registerEvent", eventId);
    setSearchParams(newParams);
  }

  function goToDashboardEvents(eventId: string) {
    const q = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    // ensure absolute path to dashboard
    window.location.assign(`/dashboard/events${q}`);
  }

  function handleRegister(eventObj: Project) {
    const isPast = isPastEvent(eventObj);
    if (isPast) return;
    if (!session) {
      openLoginFlow(eventObj.id);
      return;
    }
    goToDashboardEvents(eventObj.id);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {featured && (
        <section className="max-w-5xl mx-auto px-4 pt-12">
          <h1 className="text-center text-4xl font-semibold">Our Featured Events</h1>
          <p className="mt-2 text-center text-gray-600">
            Here are some upcoming events that we’re brewing
          </p>

          <div className="relative mt-8">
            <button
              className="absolute -left-16 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#173A67] shadow hover:bg-white"
              onClick={() =>
                setFeatIdx(
                  (i) => (i - 1 + featuredProjects.length) % featuredProjects.length
                )
              }
              aria-label="Previous featured"
            >
              &lt;
            </button>
            <button
              className="absolute -right-16 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#173A67] shadow hover:bg-white"
              onClick={() => setFeatIdx((i) => (i + 1) % featuredProjects.length)}
              aria-label="Next featured"
            >
              &gt;
            </button>

            <div className="grid sm:grid-cols-2 overflow-hidden rounded-xl ring-1 ring-gray-200 shadow-sm">
              <div className="bg-white p-6">
                <h2 className="mt-1 text-2xl font-semibold">{featured.title}</h2>

                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-600" />
                    <span>
                      {formatDateRange(featured.start_date, featured.end_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-600" />
                    <span>8:00 – 12:00 PM</span>
                  </div>
                  {featured.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <span>{featured.location}</span>
                    </div>
                  )}
                  {featured.speakers && featured.speakers.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold">Speaker/s</div>
                      <div className="text-sm text-gray-700">
                        {featured.speakers.join(", ")}
                      </div>
                    </div>
                  )}
                  {featured.summary && (
                    <div>
                      <div className="text-xs font-semibold">Details</div>
                      <p className="text-sm text-gray-600">{featured.summary}</p>
                    </div>
                  )}
                  {regs[featured.id]?.status && (
                    <p className="mt-2 text-sm text-gray-600">
                      Status: <span className="font-medium capitalize">{regs[featured.id]!.status}</span>
                    </p>
                  )}
                </div>
              </div>

              <div
                className="relative min-h-[300px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, rgba(15,23,42,.7), rgba(15,23,42,.7)), url('${
                    featured.cover_url ?? ""
                  }')`,
                }}
              >
                <div className="absolute inset-0 p-6 text-white">
                  <h3 className="text-lg font-medium">Register for this event and save your spot</h3>

                  <div className="mt-4 max-w-sm space-y-2">
                    {isPastEvent(featured) ? (
                      <button
                        className="inline-flex w-full cursor-not-allowed rounded-md bg-gray-500 px-4 py-2 text-sm font-medium text-white opacity-70"
                        disabled
                      >
                        Registration closed
                      </button>
                    ) : session ? (
                      <button
                        className="inline-flex w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
                        onClick={() => handleRegister(featured)}
                      >
                        Register
                      </button>
                    ) : (
                      <button
                        className="inline-flex w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
                        onClick={() => openLoginFlow(featured.id)}
                      >
                        Login to register
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mt-16 bg-sky-900 py-14 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-center text-3xl font-semibold">All Events</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listToShow.map((p) => {
              const past = isPastEvent(p);
              return (
                <article
                  key={p.id}
                  className="rounded-xl bg-sky-800/40 ring-1 ring-white/10 overflow-hidden"
                >
                  <div className="aspect-[16/9] bg-white/10">
                    <img
                      src={
                        p.cover_url ??
                        "https://via.placeholder.com/1200x675.png?text=Event+Cover"
                      }
                      alt={p.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium">{p.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/80">
                      {formatDateRange(p.start_date, p.end_date) && (
                        <span>{formatDateRange(p.start_date, p.end_date)}</span>
                      )}
                      {past && (
                        <span className="rounded bg-white/20 px-2 py-0.5 text-[11px]">
                          past event
                        </span>
                      )}
                    </div>
                    {p.summary && (
                      <p className="mt-2 text-sm text-white/90 line-clamp-2">
                        {p.summary}
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div>
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedEvent(p);
                          }}
                          className="underline text-gray-300 decoration-gray-300 underline-offset-2 hover:text-gray-200 hover:decoration-gray-200"
                        >
                          View event
                        </Link>
                        <span className="ml-1 text-gray-300">→</span>
                      </div>
                      <div>
                        {past ? (
                          <button
                            className="rounded-md bg-gray-500 px-3 py-1.5 text-xs font-medium text-white opacity-70 cursor-not-allowed"
                            disabled
                          >
                            Registration closed
                          </button>
                        ) : session ? (
                          <button
                            onClick={() => handleRegister(p)}
                            className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                          >
                            Register
                          </button>
                        ) : (
                          <button
                            onClick={() => openLoginFlow(p.id)}
                            className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                          >
                            Login to register
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md bg-white text-sky-900 px-4 py-2 text-sm hover:bg-white/90"
            >
              {expanded ? "Show less" : "View all"}
            </button>
          </div>
        </div>
      </section>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEvent(null);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedEvent(null)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            {selectedEvent.cover_url && (
              <img
                src={selectedEvent.cover_url}
                alt={selectedEvent.title}
                className="rounded-md mb-4 w-full h-60 object-cover"
              />
            )}

            <h2 className="text-2xl font-semibold mb-2">{selectedEvent.title}</h2>

            <div className="space-y-2 text-sm text-gray-700">
              {formatDateRange(selectedEvent.start_date, selectedEvent.end_date) && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-600" />
                  <span>
                    {formatDateRange(
                      selectedEvent.start_date,
                      selectedEvent.end_date
                    )}
                  </span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
            </div>

            {selectedEvent.summary && (
              <p className="mt-4 text-gray-600">{selectedEvent.summary}</p>
            )}
            {selectedEvent.description && (
              <p className="mt-3 text-gray-800 whitespace-pre-line">
                {selectedEvent.description}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              {isPastEvent(selectedEvent) ? (
                <button
                  className="rounded-md bg-gray-500 px-4 py-2 text-sm font-medium text-white opacity-70 cursor-not-allowed"
                  disabled
                >
                  Registration closed
                </button>
              ) : session ? (
                <button
                  className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
                  onClick={() => goToDashboardEvents(selectedEvent.id)}
                >
                  Register
                </button>
              ) : (
                <button
                  className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
                  onClick={() => openLoginFlow(selectedEvent.id)}
                >
                  Login to register
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="rounded-2xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-center text-3xl font-semibold">Events Schedule</h2>
          <ul className="mt-8 divide-y">
            {schedule.map((day) => {
              const isOpen = openDay === day.id;
              return (
                <li key={day.id} className="py-3">
                  <button
                    className="w-full flex items-center justify-between py-2 text-left"
                    onClick={() => toggleDay(day.id)}
                  >
                    <span className="text-sm sm:text-base text-gray-900">
                      {day.label}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="pt-4">
                      {day.items.map((it: Project & { id: string }) => {
                        const past = isPastEvent(it);
                        return (
                          <div
                            key={it.id}
                            className="grid grid-cols-[90px_1fr_110px_1fr_1fr] items-center gap-3 px-4 py-3 border-b"
                          >
                            <div className="text-sm text-gray-700">--:--</div>
                            <div className="text-sm text-gray-900">{it.title}</div>
                            <div className="text-sm text-gray-700">{it.status ?? "—"}</div>
                            <div className="text-sm text-gray-700">{it.location ?? "—"}</div>
                            <div className="text-right">
                              {past ? (
                                <button
                                  className="rounded-md bg-gray-500 px-3 py-1.5 text-xs font-medium text-white opacity-70 cursor-not-allowed"
                                  disabled
                                >
                                  Registration closed
                                </button>
                              ) : session ? (
                                <button
                                  onClick={() => goToDashboardEvents(it.id)}
                                  className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                                >
                                  Register
                                </button>
                              ) : (
                                <button
                                  onClick={() => openLoginFlow(it.id)}
                                  className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                                >
                                  Login to register
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Footer />

      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        isOpen={loginOpen as any}
        onClose={() => setLoginOpen(false)}
      />
    </div>
  );
}
