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
import { Link } from "react-router-dom";

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

export default function PublicEvents() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [featIdx, setFeatIdx] = useState(0);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Project | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) console.error(error);
      else setProjects(data || []);
    };
    fetchProjects();
  }, []);

  const today = new Date();

  // Featured = only upcoming events, soonest first, max 3
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

  // All Events ordering: upcoming (soonest first) then past (most recent first)
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

  // Close modal on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEvent(null);
    };
    if (selectedEvent) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedEvent]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Featured section (upcoming only) */}
      {featured && (
        <section className="max-w-5xl mx-auto px-4 pt-12">
          <h1 className="text-center text-4xl font-semibold">Our Featured Events</h1>
          <p className="mt-2 text-center text-gray-600">
            Here are some upcoming events that we’re brewing
          </p>

          <div className="relative mt-8">
            {/* arrows – desktop */}
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

            {/* card with registration form */}
            <div className="grid sm:grid-cols-2 overflow-hidden rounded-xl ring-1 ring-gray-200 shadow-sm">
              {/* left – details */}
              <div className="bg-white p-6">
                {/* Removed status pill per request */}
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
                </div>
              </div>

              {/* right – registration form */}
              <div
                className="relative min-h-[300px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, rgba(15,23,42,.7), rgba(15,23,42,.7)), url('${
                    featured.cover_url ?? ""
                  }')`,
                }}
              >
                <div className="absolute inset-0 p-6 text-white">
                  <h3 className="text-lg font-medium">
                    Register for this event and save your spot
                  </h3>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      alert("Pretend registered ✅ (wire to backend later)");
                    }}
                    className="mt-4 space-y-3 max-w-sm"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="First name"
                        className="rounded-md border border-white/30 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-500"
                        required
                      />
                      <input
                        placeholder="Last name"
                        className="rounded-md border border-white/30 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-500"
                        required
                      />
                    </div>
                    <input
                      placeholder="ID Number"
                      className="w-full rounded-md border border-white/30 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-500"
                      required
                    />
                    <button
                      className="mt-2 inline-flex rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
                      type="submit"
                    >
                      Save my spot
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All events */}
      <section className="mt-16 bg-sky-900 py-14 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-center text-3xl font-semibold">All Events</h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listToShow.map((p) => (
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
                    {/* status pill removed per request */}
                  </div>
                  {p.summary && (
                    <p className="mt-2 text-sm text-white/90 line-clamp-2">
                      {p.summary}
                    </p>
                  )}
                  <div className="mt-3 text-sm">
                    {/* GREY link; open modal */}
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
                </div>
              </article>
            ))}
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

      {/* Modal for event details */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            // Close only when clicking the backdrop, not the content
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

            {/* Cover image */}
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
          </div>
        </div>
      )}

      {/* Schedule */}
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
                      {day.items.map((it: Project & { id: string }) => (
                        <div
                          key={it.id}
                          className="grid grid-cols-[90px_1fr_110px_1fr_1fr] items-center gap-3 px-4 py-3 border-b"
                        >
                          <div className="text-sm text-gray-700">--:--</div>
                          <div className="text-sm text-gray-900">{it.title}</div>
                          <div className="text-sm text-gray-700">{it.status ?? "—"}</div>
                          <div className="text-sm text-gray-700">{it.location ?? "—"}</div>
                          <div className="text-right">
                            <button className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800">
                              View details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
