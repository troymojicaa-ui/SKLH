// src/pages/Index.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, Eye, Sparkles, ChevronRight, CalendarDays, MapPin } from "lucide-react";

import LoginModal from "@/components/auth/LoginModal";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

/* types & utils */
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

function startOfTodayISO() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d.toISOString();
}

const Index = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<"admin" | "user">("user");

  const [upcoming, setUpcoming] = useState<Project | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .gte("start_date", startOfTodayISO())
        .order("start_date", { ascending: true })
        .limit(5);
      if (error) return;
      const items = (data || []).filter((p) => !!safeDate(p.start_date));
      items.sort(
        (a, b) =>
          (safeDate(a.start_date)?.getTime() ?? 0) -
          (safeDate(b.start_date)?.getTime() ?? 0)
      );
      setUpcoming(items[0] ?? null);
    })();
  }, []);

  const handleLoginClick = (role: "admin" | "user") => {
    setLoginRole(role);
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onLoginClick={handleLoginClick} />

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#F4F7FB]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-28">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-xs font-medium tracking-wide text-sky-700">
                SK LOYOLA HEIGHTS
              </div>
              <h1 className="mt-2 text-4xl md:text-6xl font-extrabold leading-tight text-[#0E1B2C]">
                Empowering youth,
                <br />
                building community.
              </h1>
              <p className="mt-4 text-[#394150]">
                Stay updated with events and projects. Join SK Connect to submit
                reports, view facilities, and participate in local programs.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => handleLoginClick("user")}
                  className="bg-sky-700 hover:bg-sky-800"
                >
                  Login
                </Button>
                <Link to="/events">
                  <Button variant="outline">Explore Events</Button>
                </Link>
              </div>
            </div>

            <div className="rounded-xl bg-gray-200/70 ring-1 ring-gray-300 h-[320px] md:h-[420px] grid place-items-center text-gray-500">
              Hero Image Placeholder
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE ROW */}
      <section className="relative bg-gradient-to-r from-sky-600 to-sky-400 text-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 md:grid-cols-3">
            <Feature
              Icon={Target}
              title="Mission"
              desc="The Sangguniang Kabataan of Barangay Loyola Heights is dedicated to fostering youth leadership, promoting transparency and inclusivity, and creating meaningful opportunities for personal and community growth."
            />
            <Feature
              Icon={Eye}
              title="Vision"
              desc="A united, empowered, and proactive youth community that leads with purpose, participates in nation-building, and contributes to a safe, inclusive, and progressive Barangay Loyola Heights."
            />
            <Feature
              Icon={Sparkles}
              title="Highlight three"
              desc="Aenean faucibus nibh et justo cursus id rutrum lorem imperdiet. Integer non nisi quis elit."
            />
          </div>
        </div>
      </section>

      {/* UPCOMING EVENT (dynamic) */}
      <section className="relative overflow-hidden bg-white py-20">
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute -top-32 right-0 h-[420px] w-[720px] bg-gradient-to-b from-sky-50 to-sky-200 opacity-90"
            style={{ clipPath: "ellipse(60% 45% at 80% 20%)" }}
          />
          <div
            className="absolute -bottom-40 left-0 h-[420px] w-[720px] bg-gradient-to-t from-sky-50 to-sky-200 opacity-90"
            style={{ clipPath: "ellipse(60% 45% at 20% 80%)" }}
          />
        </div>

        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl order-1">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              Upcoming Event
            </div>
            <h2 className="text-2xl md:text-4xl font-semibold text-gray-900">
              {upcoming ? upcoming.title : "No upcoming events yet"}
            </h2>
            <p className="mt-3 text-gray-600">
              {upcoming?.summary ?? (upcoming ? "" : "Please check back soon.")}
            </p>

            <div className="mt-4 space-y-2 text-sm text-gray-700">
              {upcoming && formatDateRange(upcoming.start_date, upcoming.end_date) && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-gray-600" />
                  <span>{formatDateRange(upcoming.start_date, upcoming.end_date)}</span>
                </div>
              )}
              {upcoming?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span>{upcoming.location}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Link to="/events">
                <Button className="bg-sky-700 hover:bg-sky-800">See details</Button>
              </Link>
              <Link to="/events">
                <Button variant="ghost" className="px-0 text-sky-800 hover:text-sky-900">
                  View all events
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="order-2 relative">
            <div className="relative mx-auto h-64 w-full max-w-[480px] overflow-hidden rounded-xl bg-gray-200 shadow">
              {upcoming && (
                <img
                  src={
                    upcoming.cover_url ??
                    "https://via.placeholder.com/1200x675.png?text=Event+Cover"
                  }
                  alt={upcoming.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-[14px] bg-gray-200 
                           ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(16,24,40,.06),0_2px_8px_rgba(16,24,40,.08)]"
              >
                <div className="aspect-[4/3] w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-black/5">
            <h2 className="text-center text-2xl font-semibold">
              Frequently asked questions
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Frequently asked questions ordered by popularity. Add more as
              needed.
            </p>

            <div className="mt-6 divide-y">
              {[
                "Question text goes here",
                "Question text goes here",
                "Question text goes here",
              ].map((q, i) => (
                <details key={i} className="group py-3">
                  <summary className="cursor-pointer list-none font-medium">
                    {q}
                    <span className="float-right text-gray-400 group-open:rotate-180 transition">
                      ▾
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-gray-600">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Suspendisse varius enim in eros elementum tristique.
                  </p>
                </details>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Button className="bg-sky-700 hover:bg-sky-800">Get in touch</Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        role={loginRole}
      />
    </div>
  );
};

/* ——— helpers ——— */

function Feature({
  Icon,
  title,
  desc,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/90">{desc}</p>
    </div>
  );
}

export default Index;
