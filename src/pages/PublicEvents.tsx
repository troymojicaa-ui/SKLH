// src/pages/PublicEvents.tsx
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginModal from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useIsMobile } from "@/hooks/use-mobile";

import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  X,
} from "lucide-react";

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

function formatTimeLabel(dt?: string | null) {
  const d = safeDate(dt);
  if (!d) return "--:--";
  return format(d, "h:mm a");
}

/* -----------------------------
   MAIN PAGE (shared logic)
-------------------------------- */
export default function PublicEvents() {
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Project | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [regs, setRegs] = useState<RegistrationMap>({});
  const [loginOpen, setLoginOpen] = useState(false);

  // desktop-only
  const [expanded, setExpanded] = useState(false);

  // shared (mobile & desktop)
  const [featIdx, setFeatIdx] = useState(0);
  const [openDay, setOpenDay] = useState<string | null>(null);

  // mobile-only “back to top”
  const [showTop, setShowTop] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);

  // mobile swipe
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const pointerActive = useRef(false);

  /* -----------------------------
     Fetch projects + user + regs
  -------------------------------- */
  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("start_date", { ascending: true });
      if (!error) setProjects((data as any) || []);
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
    if (session && !userId) setUserId(session.user.id);
  }, [session, userId]);

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
    if (searchParams.get("login") === "1") setLoginOpen(true);
  }, [searchParams]);

  /* -----------------------------
     Mobile back-to-top visibility
  -------------------------------- */
  useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  function scrollToTop() {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* -----------------------------
     Shared navigation handlers
  -------------------------------- */
  function openLoginFlow(eventId?: string) {
    setLoginOpen(true);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("login", "1");
    if (eventId) newParams.set("registerEvent", eventId);
    setSearchParams(newParams);
  }

  function goToDashboardEvents(eventId: string) {
    const q = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    window.location.assign(`/dashboard/events${q}`);
  }

  function handleRegister(eventObj: Project) {
    if (isPastEvent(eventObj)) return;
    if (!session) {
      openLoginFlow(eventObj.id);
      return;
    }
    goToDashboardEvents(eventObj.id);
  }

  const today = new Date();

  /* -----------------------------
     Mobile featured list (upcoming only)
  -------------------------------- */
  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const withValid: { p: Project; d: Date }[] = projects
      .map((p) => ({ p, d: safeDate(p.start_date) }))
      .filter((x): x is { p: Project; d: Date } => x.d !== null);

    return withValid
      .filter((x) => x.d >= startOfToday)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .map((x) => x.p);
  }, [projects, today]);

  const mobileFeaturedList = upcomingEvents.length > 0 ? upcomingEvents : projects.slice(0, 1);
  const mobileFeatured = mobileFeaturedList[featIdx] ?? null;

  /* -----------------------------
     Desktop featured list (top 3 upcoming)
  -------------------------------- */
  const desktopFeaturedProjects = useMemo(() => {
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
  }, [projects, today]);

  const desktopFeatured = desktopFeaturedProjects[featIdx] ?? null;

  // keep featIdx in bounds when list length changes (mobile and desktop)
  useEffect(() => {
    const len = (isMobile ? mobileFeaturedList.length : desktopFeaturedProjects.length) || 1;
    if (featIdx > Math.max(0, len - 1)) setFeatIdx(0);
  }, [isMobile, mobileFeaturedList.length, desktopFeaturedProjects.length, featIdx]);

  const goPrev = () => {
    const list = isMobile ? mobileFeaturedList : desktopFeaturedProjects;
    if (list.length <= 1) return;
    setFeatIdx((i) => (i - 1 + list.length) % list.length);
  };

  const goNext = () => {
    const list = isMobile ? mobileFeaturedList : desktopFeaturedProjects;
    if (list.length <= 1) return;
    setFeatIdx((i) => (i + 1) % list.length);
  };

  /* -----------------------------
     Mobile swipe on featured card
  -------------------------------- */
  useEffect(() => {
    if (!isMobile) return;

    const el = swipeRef.current;
    if (!el) return;

    const threshold = 45;

    const isInteractiveTarget = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      return !!t.closest("button,a,input,textarea,select,label");
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isInteractiveTarget(e.target)) return;
      pointerActive.current = true;
      pointerStartX.current = e.clientX;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointerActive.current || pointerStartX.current === null) return;
      const dx = e.clientX - pointerStartX.current;

      pointerActive.current = false;
      pointerStartX.current = null;

      if (Math.abs(dx) < threshold) return;
      if (dx < 0) goNext();
      else goPrev();
    };

    const onPointerCancel = () => {
      pointerActive.current = false;
      pointerStartX.current = null;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [isMobile, mobileFeaturedList.length]);

  /* -----------------------------
     Desktop “All Events” list logic
  -------------------------------- */
  const allSorted = useMemo(() => {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const withValid: { p: Project; d: Date }[] = projects
      .map((p) => ({ p, d: safeDate(p.start_date) }))
      .filter((x): x is { p: Project; d: Date } => x.d !== null);

    const upcoming = withValid
      .filter((x) => x.d >= startOfToday)
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .map((x) => x.p);

    const past = withValid
      .filter((x) => x.d < startOfToday)
      .sort((a, b) => b.d.getTime() - a.d.getTime())
      .map((x) => x.p);

    return [...upcoming, ...past];
  }, [projects, today]);

  const closestThree = useMemo(() => allSorted.slice(0, 3), [allSorted]);
  const listToShow = expanded ? allSorted : closestThree;

  /* -----------------------------
     Shared schedule grouping
     (format labels differently per view)
  -------------------------------- */
  const scheduleRaw = useMemo(() => {
    const grouped: Record<string, Project[]> = {};

    projects.forEach((p) => {
      if (!p.start_date) return;
      const d = safeDate(p.start_date);
      if (!d) return;

      const key = format(d, "yyyy-MM-dd");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });

    const entries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

    return entries.map(([date, items]) => {
      const sortedItems = items.slice().sort((a, b) => {
        const ta = safeDate(a.start_date)?.getTime() ?? 0;
        const tb = safeDate(b.start_date)?.getTime() ?? 0;
        return ta - tb;
      });

      return { id: date, dateObj: new Date(date), items: sortedItems };
    });
  }, [projects]);

  const scheduleMobile = useMemo(() => {
    return scheduleRaw.map((d) => ({
      id: d.id,
      label: format(d.dateObj, "EEEE dd MMM"), // Figma: "Friday 09 Feb"
      items: d.items,
    }));
  }, [scheduleRaw]);

  const scheduleDesktop = useMemo(() => {
    return scheduleRaw.map((d) => ({
      id: d.id,
      label: format(d.dateObj, "EEEE, MMM dd yyyy"),
      items: d.items,
    }));
  }, [scheduleRaw]);

  /* -----------------------------
     Close modal on ESC (shared)
  -------------------------------- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEvent(null);
      if (isMobile) {
        if (e.key === "ArrowLeft") goPrev();
        if (e.key === "ArrowRight") goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, mobileFeaturedList.length, desktopFeaturedProjects.length]);

  return (
    <div className="min-h-screen bg-white">
      <div ref={topRef} />
      <Header />

      {/* -----------------------------
          MOBILE vs DESKTOP
      -------------------------------- */}
      {isMobile ? (
        <MobileView
          featured={mobileFeatured}
          featuredList={mobileFeaturedList}
          featIdx={featIdx}
          goPrev={goPrev}
          goNext={goNext}
          swipeRef={swipeRef}
          openDay={openDay}
          setOpenDay={setOpenDay}
          schedule={scheduleMobile}
          session={!!session}
          onRegister={handleRegister}
          onLogin={openLoginFlow}
          onView={(p) => setSelectedEvent(p)}
        />
      ) : (
        <DesktopView
          featured={desktopFeatured}
          featuredProjects={desktopFeaturedProjects}
          featIdx={featIdx}
          setFeatIdx={setFeatIdx}
          listToShow={listToShow}
          expanded={expanded}
          setExpanded={setExpanded}
          schedule={scheduleDesktop}
          openDay={openDay}
          toggleDay={(id) => setOpenDay((prev) => (prev === id ? null : id))}
          session={!!session}
          onRegister={handleRegister}
          onLogin={openLoginFlow}
          onView={(p) => setSelectedEvent(p)}
        />
      )}

      {/* EVENT MODAL (shared) */}
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
                  <span>{formatDateRange(selectedEvent.start_date, selectedEvent.end_date)}</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
            </div>

            {selectedEvent.summary && <p className="mt-4 text-gray-600">{selectedEvent.summary}</p>}
            {selectedEvent.description && (
              <p className="mt-3 text-gray-800 whitespace-pre-line">{selectedEvent.description}</p>
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

      <Footer />

      {/* Back-to-top (mobile only) */}
      {isMobile && showTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-50 rounded-full bg-[#173A67] text-white shadow-lg hover:shadow-xl transition p-3"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}

      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        isOpen={loginOpen as any}
        onClose={() => setLoginOpen(false)}
      />
    </div>
  );
}

/* -----------------------------
   MOBILE VIEW
-------------------------------- */
function MobileView(props: {
  featured: Project | null;
  featuredList: Project[];
  featIdx: number;
  goPrev: () => void;
  goNext: () => void;
  swipeRef: React.RefObject<HTMLDivElement | null>;
  openDay: string | null;
  setOpenDay: (v: string | null) => void;
  schedule: { id: string; label: string; items: Project[] }[];
  session: boolean;
  onRegister: (p: Project) => void;
  onLogin: (eventId: string) => void;
  onView: (p: Project) => void;
}) {
  const {
    featured,
    featuredList,
    goPrev,
    goNext,
    swipeRef,
    openDay,
    setOpenDay,
    schedule,
    session,
    onRegister,
    onLogin,
    onView,
  } = props;

  return (
    <>
      {/* UPCOMING EVENTS HERO (mobile) */}
      <section className="relative bg-[#9BE7FF] pt-14">
        <div className="max-w-5xl mx-auto px-4 pb-20">
          <h1 className="text-center text-[44px] sm:text-[56px] font-light leading-[1.05] tracking-[-0.02em] text-[#0B1F33]">
            Upcoming <br className="sm:hidden" />
            Events
          </h1>

          <p className="mt-5 text-center text-[15px] sm:text-[16px] leading-[1.6] text-[#2F3E4E] max-w-md mx-auto">
            Here are some upcoming events that we’re brewing
          </p>

          <div className="mt-10 flex justify-center">
            <div className="relative w-full max-w-[420px]">
              {/* Swipe area */}
              <div ref={swipeRef} className="select-none" style={{ touchAction: "pan-y" }}>
                <div className="rounded-2xl bg-white shadow-lg ring-1 ring-black/10 overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-2xl font-medium text-gray-900">
                      {featured?.title ?? "No upcoming events yet"}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700">
                        {featured?.mode ?? "In-person"}
                      </span>
                    </div>

                    {featured ? (
                      <div className="mt-4 space-y-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-gray-600" />
                          <span>{formatDateRange(featured.start_date, featured.end_date)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-600" />
                          <span>{formatTimeLabel(featured.start_date)} – --:--</span>
                        </div>

                        {featured.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-600" />
                            <span>{featured.location}</span>
                          </div>
                        )}

                        {featured.summary && (
                          <div className="pt-2">
                            <div className="text-xs font-semibold text-gray-900">Details</div>
                            <p className="text-sm text-gray-600">{featured.summary}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-gray-600">
                        Check back soon — new events will appear here automatically.
                      </p>
                    )}
                  </div>

                  {/* CTA band */}
                  <div className="bg-[#173A67] px-6 py-6 text-white">
                    <h3 className="text-base font-medium">
                      Register for this event <br /> and save your spot
                    </h3>

                    <div className="mt-4">
                      {!featured ? (
                        <button
                          className="w-full rounded-lg bg-white/30 px-4 py-2 text-sm font-medium opacity-80 cursor-not-allowed"
                          disabled
                        >
                          No upcoming events
                        </button>
                      ) : isPastEvent(featured) ? (
                        <button
                          className="w-full rounded-lg bg-white/30 px-4 py-2 text-sm font-medium opacity-80 cursor-not-allowed"
                          disabled
                        >
                          Registration closed
                        </button>
                      ) : session ? (
                        <button
                          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#173A67] hover:bg-white/90"
                          onClick={() => onRegister(featured)}
                        >
                          Let’s go!
                        </button>
                      ) : (
                        <button
                          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#173A67] hover:bg-white/90"
                          onClick={() => onLogin(featured.id)}
                        >
                          Login to register
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom centered arrows */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8">
                <button
                  onClick={goPrev}
                  disabled={featuredList.length <= 1}
                  aria-label="Previous event"
                  className={`h-11 w-11 rounded-full flex items-center justify-center ${
                    featuredList.length <= 1 ? "opacity-30 cursor-not-allowed" : "opacity-100 hover:opacity-70"
                  }`}
                >
                  <ChevronLeft className="h-9 w-9 text-black" />
                </button>

                <button
                  onClick={goNext}
                  disabled={featuredList.length <= 1}
                  aria-label="Next event"
                  className={`h-11 w-11 rounded-full flex items-center justify-center ${
                    featuredList.length <= 1 ? "opacity-30 cursor-not-allowed" : "opacity-100 hover:opacity-70"
                  }`}
                >
                  <ChevronRight className="h-9 w-9 text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* wave bottom (keep your current one for now) */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,64 C240,120 480,120 720,64 C960,8 1200,8 1440,64 L1440,120 L0,120 Z"
            fill="#ffffff"
          />
        </svg>
      </section>

      {/* SCHEDULE (mobile / Figma) */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <p className="text-center text-gray-500">Tagline</p>

        <h2 className="text-center text-4xl font-semibold text-gray-900 mt-2">Schedule</h2>

        <p className="mt-3 text-center text-gray-500 max-w-xl mx-auto">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros
          elementum tristique.
        </p>

        <div className="mt-10 max-w-[420px] mx-auto rounded-xl border border-gray-200 overflow-hidden bg-white">
          <ul className="divide-y divide-gray-200">
            {schedule.map((day) => {
              const isOpen = openDay === day.id;

              return (
                <li key={day.id}>
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => setOpenDay(isOpen ? null : day.id)}
                  >
                    <span className="text-base font-semibold text-gray-900">{day.label}</span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5">
                      <div className="border-t border-gray-200" />

                      <div className="divide-y divide-gray-200">
                        {day.items.map((it) => {
                          const past = isPastEvent(it);

                          return (
                            <div key={it.id} className="py-5">
                              <div className="text-sm text-gray-500">{formatTimeLabel(it.start_date)}</div>

                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <div className="text-base font-semibold text-gray-900">{it.title}</div>

                                <span className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700">
                                  {it.mode ?? "In-person"}
                                </span>

                                {it.status && (
                                  <span className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700">
                                    {it.status}
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 text-sm text-gray-500 space-y-0.5">
                                <div>Speaker</div>
                                <div>{it.location ?? "Location"}</div>
                              </div>

                              <div className="mt-4 flex items-center gap-6">
                                <button
                                  className="rounded-md bg-black px-4 py-2 text-xs font-medium text-white hover:bg-black/90"
                                  onClick={() => onView(it)}
                                >
                                  View Details
                                </button>

                                {past ? (
                                  <span className="text-xs text-gray-500">Registration closed</span>
                                ) : session ? (
                                  <button
                                    onClick={() => onRegister(it)}
                                    className="rounded-md bg-sky-700 px-4 py-2 text-xs font-medium text-white hover:bg-sky-800"
                                  >
                                    Register
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => onLogin(it.id)}
                                    className="rounded-md bg-sky-700 px-4 py-2 text-xs font-medium text-white hover:bg-sky-800"
                                  >
                                    Login to register
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}

/* -----------------------------
   DESKTOP VIEW
-------------------------------- */
function DesktopView(props: {
  featured: Project | null;
  featuredProjects: Project[];
  featIdx: number;
  setFeatIdx: (fn: (i: number) => number) => void;
  listToShow: Project[];
  expanded: boolean;
  setExpanded: (fn: (v: boolean) => boolean) => void;
  schedule: { id: string; label: string; items: Project[] }[];
  openDay: string | null;
  toggleDay: (id: string) => void;
  session: boolean;
  onRegister: (p: Project) => void;
  onLogin: (eventId: string) => void;
  onView: (p: Project) => void;
}) {
  const {
    featured,
    featuredProjects,
    featIdx,
    setFeatIdx,
    listToShow,
    expanded,
    setExpanded,
    schedule,
    openDay,
    toggleDay,
    session,
    onRegister,
    onLogin,
    onView,
  } = props;

  return (
    <>
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
                setFeatIdx((i) => (i - 1 + featuredProjects.length) % featuredProjects.length)
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
                    <span>{formatDateRange(featured.start_date, featured.end_date)}</span>
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
                      <div className="text-sm text-gray-700">{featured.speakers.join(", ")}</div>
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
                        onClick={() => onRegister(featured)}
                      >
                        Register
                      </button>
                    ) : (
                      <button
                        className="inline-flex w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
                        onClick={() => onLogin(featured.id)}
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

      {/* All Events grid */}
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
                      src={p.cover_url ?? "https://via.placeholder.com/1200x675.png?text=Event+Cover"}
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
                      <p className="mt-2 text-sm text-white/90 line-clamp-2">{p.summary}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div>
                        <Link
                          to="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onView(p);
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
                            onClick={() => onRegister(p)}
                            className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                          >
                            Register
                          </button>
                        ) : (
                          <button
                            onClick={() => onLogin(p.id)}
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

      {/* Desktop schedule */}
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
                    <span className="text-sm sm:text-base text-gray-900">{day.label}</span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="pt-4">
                      {day.items.map((it) => {
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
                                  onClick={() => onRegister(it)}
                                  className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
                                >
                                  Register
                                </button>
                              ) : (
                                <button
                                  onClick={() => onLogin(it.id)}
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
    </>
  );
}
