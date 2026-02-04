import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useMemo, useState, useEffect } from "react";
import { format, isAfter, startOfDay } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Clock,
  MapPin,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import LoginModal from "@/components/auth/LoginModal";
// import { useAuth } from "@/context/AuthProvider";
import { useEvents } from "@/hooks/useEvents"; // Import your hook
import type { Project } from "../hooks/useEvents";

import { useAuth } from "../hooks/useAuth";

const HEADER_BLUE = "#0C4A6E";

// Helper to handle Django's date strings
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
  const sameDay = format(sd, 'yyyy-MM-dd') === format(ed, 'yyyy-MM-dd');
  return sameDay ? left : `${left} – ${format(ed, "EEE dd MMM yyyy")}`;
}

function isPastEvent(p: Project) {
  const today = startOfDay(new Date());
  const eventDate = safeDate(p.end_date || p.start_date);
  if (!eventDate) return false;
  return !isAfter(eventDate, today) && format(eventDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd');
}

export default function PublicEvents() {
  // const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 1. Hook Integration
  const { projects, isLoading } = useEvents();

  const [featIdx, setFeatIdx] = useState(0);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Project | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // Get user data and logout function from useAuth
  const { user, logout, isAuthenticated } = useAuth();


  // Filter only public and active projects
  const publicProjects = useMemo(() => {
    return Array.isArray(projects) ? projects.filter(p => p.visibility === 'public' && p.is_active) : [];
  }, [projects]);

  // 2. Memoized logic for Featured Events
  const featuredProjects = useMemo(() => {
    const today = startOfDay(new Date());
    return publicProjects
      .filter((p) => {
        const d = safeDate(p.start_date);
        return d !== null && (isAfter(d, today) || format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
      })
      .sort((a, b) => {
        const da = safeDate(a.start_date)?.getTime() ?? 0;
        const db = safeDate(b.start_date)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 3);
  }, [publicProjects]);

  const featured = featuredProjects[featIdx] ?? null;

  // 3. Memoized logic for the "All Events" grid
  const allSorted = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming = publicProjects
      .filter((p) => {
        const d = safeDate(p.start_date);
        return d && (isAfter(d, today) || format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));
      })
      .sort((a, b) => (safeDate(a.start_date)?.getTime() ?? 0) - (safeDate(b.start_date)?.getTime() ?? 0));

    const past = publicProjects
      .filter((p) => {
        const d = safeDate(p.start_date);
        return d && !isAfter(d, today) && format(d, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd');
      })
      .sort((a, b) => (safeDate(b.start_date)?.getTime() ?? 0) - (safeDate(a.start_date)?.getTime() ?? 0));

    return [...upcoming, ...past];
  }, [publicProjects]);

  const listToShow = expanded ? allSorted : allSorted.slice(0, 3);

  // 4. Grouping for the Schedule list
  const schedule = useMemo(() => {
    const grouped: Record<string, Project[]> = {};
    publicProjects.forEach((p) => {
      if (!p.start_date) return;
      const key = p.start_date; // Django returns 'YYYY-MM-DD'
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        id: date,
        label: format(new Date(date), "EEEE, MMM dd yyyy"),
        items,
      }));
  }, [publicProjects]);

  const toggleDay = (id: string) => setOpenDay((prev) => (prev === id ? null : id));

  function openLoginFlow(eventId?: string) {
    console.log('openLoginFlow')
    setLoginOpen(true);
    if (eventId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("login", "1");
      newParams.set("registerEvent", eventId);
      setSearchParams(newParams);
    }
  }

  function handleRegister(eventObj: Project) {
    if (isPastEvent(eventObj)) return;
    if (!isAuthenticated) {
      openLoginFlow(eventObj.id);
      return;
    }
    // Redirect to dashboard with the event ID
    window.location.assign(`/dashboard/events?eventId=${encodeURIComponent(eventObj.id)}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {isLoading && <div className="text-center py-20 text-gray-500">Loading events...</div>}

      {!isLoading && featured && (
        <section className="max-w-5xl mx-auto px-4 pt-12">
          <h1 className="text-center text-4xl font-semibold">Our Featured Events</h1>
          <p className="mt-2 text-center text-gray-600">Events currently brewing in our community</p>

          <div className="relative mt-8">
            {/* Nav buttons */}
            {featuredProjects.length > 1 && (
              <>
                <button 
                  className="absolute -left-16 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 z-10"
                  onClick={() => setFeatIdx((i) => (i - 1 + featuredProjects.length) % featuredProjects.length)}
                > &lt; </button>
                <button 
                  className="absolute -right-16 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 z-10"
                  onClick={() => setFeatIdx((i) => (i + 1) % featuredProjects.length)}
                > &gt; </button>
              </>
            )}

            <div className="grid sm:grid-cols-2 overflow-hidden rounded-xl ring-1 ring-gray-200 shadow-sm bg-white">
              <div className="p-6">
                <Badge className="mb-2 uppercase">{featured.status}</Badge>
                <h2 className="text-2xl font-semibold">{featured.title}</h2>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{formatDateRange(featured.start_date, featured.end_date)}</span>
                  </div>
                  {/* Note: If you add 'address' to Django, use it here */}
                  {featured.summary && <p className="mt-4 text-gray-600">{featured.summary}</p>}
                </div>
              </div>

              <div
                className="relative min-h-[300px] bg-cover bg-center"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, rgba(15,23,42,0.7), rgba(15,23,42,0.7)), url('${featured.cover_image ?? ""}')`,
                }}
              >
                <div className="absolute inset-0 p-6 text-white flex flex-col justify-center">
                  <h3 className="text-lg font-medium mb-4">Save your spot for this event</h3>
                  <button
                    className="w-full max-w-xs rounded-md bg-sky-700 px-4 py-2 text-sm font-medium hover:bg-sky-800 transition"
                    onClick={() => handleRegister(featured)}
                  >
                    {isAuthenticated ? "Register Now" : "Login to Register"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All Events Section */}
      <section className="mt-16 bg-sky-900 py-14 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-center text-3xl font-semibold">All Events</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listToShow.map((p) => (
              <article key={p.id} className="rounded-xl bg-sky-800/40 ring-1 ring-white/10 overflow-hidden flex flex-col">
                <div className="aspect-[16/9]">
                  <img src={p.cover_image ?? "/placeholder.png"} alt={p.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-medium line-clamp-1">{p.title}</h3>
                  <div className="mt-2 text-xs text-white/70">
                    {formatDateRange(p.start_date, p.end_date)}
                    {isPastEvent(p) && <span className="ml-2 bg-white/20 px-1 rounded">Past</span>}
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <button onClick={() => setSelectedEvent(p)} className="text-xs underline underline-offset-4">View Details</button>
                    {!isPastEvent(p) && (
                      <button 
                        onClick={() => handleRegister(p)}
                        className="bg-sky-700 px-3 py-1.5 text-xs rounded-md hover:bg-sky-600"
                      >
                        Register
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <button onClick={() => setExpanded(!expanded)} className="bg-white text-sky-900 px-6 py-2 rounded-md font-medium text-sm">
              {expanded ? "Show Less" : "View All Events"}
            </button>
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="rounded-2xl border border-gray-100 p-8 shadow-sm">
          <h2 className="text-center text-3xl font-semibold mb-8">Event Schedule</h2>
          <div className="space-y-2">
            {schedule.map((day) => (
              <div key={day.id} className="border-b border-gray-100 last:border-0">
                <button 
                  onClick={() => toggleDay(day.id)}
                  className="w-full flex justify-between items-center py-4 text-left font-medium text-gray-800"
                >
                  {day.label}
                  {openDay === day.id ? <ChevronUp /> : <ChevronDown />}
                </button>
                {openDay === day.id && (
                  <div className="pb-4 space-y-3">
                    {day.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{item.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{item.status}</p>
                        </div>
                        <button 
                          onClick={() => handleRegister(item)}
                          disabled={isPastEvent(item)}
                          className="text-xs bg-sky-700 text-white px-3 py-1 rounded disabled:bg-gray-300"
                        >
                          Register
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button className="absolute right-4 top-4" onClick={() => setSelectedEvent(null)}><X /></button>
            <img src={selectedEvent.cover_image ?? ""} className="w-full h-64 object-cover rounded-xl mb-6" alt="" />
            <h2 className="text-2xl font-bold mb-2">{selectedEvent.title}</h2>
            <div className="flex gap-4 text-sm text-gray-600 mb-4">
               <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatDateRange(selectedEvent.start_date, selectedEvent.end_date)}</span>
            </div>
            <p className="text-gray-700 leading-relaxed mb-6">{selectedEvent.body || selectedEvent.summary}</p>
            {!isPastEvent(selectedEvent) && (
               <button 
                onClick={() => handleRegister(selectedEvent)}
                className="w-full bg-sky-900 text-white py-3 rounded-xl font-bold hover:bg-sky-800"
               >
                Register Now
               </button>
            )}
          </div>
        </div>
      )}

      <Footer />
      <LoginModal isOpen={loginOpen} onOpenChange={setLoginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

// Small Badge helper
function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-sky-100 text-sky-700 ${className}`}>
      {children}
    </span>
  );
}