// src/pages/MobileHome.tsx
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginModal from "@/components/auth/LoginModal";
import { Button } from "@/components/ui/button";
import { ChevronRight, Target, Eye, Sparkles, CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";

/** Small decorative avatar image used in the hero */
function FloatyImg({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-10 w-10 rounded-md bg-gray-300 shadow-sm ${className}`}
      aria-hidden
    />
  );
}

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

export default function MobileHome() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [upcoming, setUpcoming] = useState<Project | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .gte("start_date", startOfTodayISO())
        .order("start_date", { ascending: true })
        .limit(5); // small buffer; we'll still pick the closest below
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

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="relative overflow-hidden">
        <FloatyImg className="absolute left-4 top-6" />
        <FloatyImg className="absolute right-6 top-5" />
        <FloatyImg className="absolute -right-2 top-28 rotate-[12deg]" />
        <FloatyImg className="absolute left-3 top-[140px] rotate-[-8deg]" />

        <div className="px-4 pt-16 pb-8">
          <div className="text-center text-sky-700 text-xs font-semibold tracking-wide">
            SK LOYOLA HEIGHTS
          </div>

          <h1 className="mt-2 text-center text-4xl font-extrabold leading-tight text-slate-900">
            Empowering
            <br />
            youth,
            <br />
            building
            <br />
            community.
          </h1>

          <p className="mt-3 text-center text-[15px] text-slate-600">
            Stay updated with events and projects. Join SK Connect to submit
            reports, view facilities, and participate in local programs.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <Button
              className="bg-sky-700 hover:bg-sky-800"
              onClick={() => setLoginOpen(true)}
            >
              Login
            </Button>
            <Button variant="outline">
              Learn more
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <div className="mt-8 mx-auto h-40 w-full max-w-[340px] rounded-xl bg-gray-200" />
        </div>

        <div className="bg-gradient-to-b from-sky-600 to-sky-500 text-white">
          <div className="grid grid-cols-1 divide-y divide-white/10">
            <FeatureTile
              icon={<Target className="h-5 w-5" />}
              title="Mission"
              desc="Short one–two line description that introduces your mission to visitors."
            />
            <FeatureTile
              icon={<Eye className="h-5 w-5" />}
              title="Vision"
              desc="Say what future you’re building for the youth of Loyola Heights."
            />
            <FeatureTile
              icon={<Sparkles className="h-5 w-5" />}
              title="Highlight"
              desc="Use this slot for a special initiative or ongoing flagship program."
            />
          </div>
        </div>
      </section>

      {/* Upcoming Event (dynamic) */}
      <section className="py-8">
        <div className="mx-auto max-w-md px-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Upcoming Event
          </div>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            {upcoming ? upcoming.title : "No upcoming events yet"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {upcoming?.summary ?? (upcoming ? "" : "Please check back soon.")}
          </p>
        </div>

        {upcoming && (
          <div className="mt-4 px-4">
            <div className="mx-auto max-w-md overflow-hidden rounded-xl ring-1 ring-gray-200">
              <div className="aspect-[16/9] bg-gray-100">
                <img
                  src={
                    upcoming.cover_url ??
                    "https://via.placeholder.com/1200x675.png?text=Event+Cover"
                  }
                  alt={upcoming.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="bg-white p-4">
                <div className="space-y-2 text-sm text-gray-700">
                  {formatDateRange(upcoming.start_date, upcoming.end_date) && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gray-600" />
                      <span>
                        {formatDateRange(upcoming.start_date, upcoming.end_date)}
                      </span>
                    </div>
                  )}
                  {upcoming.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <span>{upcoming.location}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Link
                    to="/events"
                    className="text-sm font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                  >
                    View all events
                  </Link>
                  <Link to="/events">
                    <Button className="bg-sky-700 hover:bg-sky-800 text-white text-sm">
                      See details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="px-4">
        <div className="mx-auto max-w-md grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-md bg-gray-200" />
          ))}
        </div>
      </section>

      <section className="px-4 py-10">
        <div className="mx-auto max-w-md">
          <h2 className="text-center text-lg font-semibold">FAQs</h2>
          <p className="mt-1 text-center text-xs text-gray-500">
            Short intro for common questions—update as you learn what people ask.
          </p>

          <Accordion type="single" collapsible className="mt-4">
            {faqItems.map((q, i) => (
              <AccordionItem key={i} value={`q-${i}`}>
                <AccordionTrigger className="text-sm">{q.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-gray-600">
                  {q.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        role="user"
      />
    </div>
  );
}

/* ——— pieces ——— */

function FeatureTile({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="px-5 py-6 grid grid-cols-[28px_1fr] gap-3">
      <div className="grid h-7 w-7 place-items-center rounded-full bg-white/20 ring-1 ring-white/25">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 text-[12px] leading-relaxed text-white/90">{desc}</p>
      </div>
    </div>
  );
}

const faqItems = [
  {
    q: "Question text goes here",
    a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras at fermentum orci.",
  },
  {
    q: "Question text goes here",
    a: "Suspendisse varius enim in eros elementum tristique. Vestibulum ante ipsum primis.",
  },
  {
    q: "Question text goes here",
    a: "Ut commodo diam libero vitae erat. Praesent non facilisis metus, eu feugiat lorem.",
  },
  {
    q: "Question text goes here",
    a: "Aliquam bibendum aliquam massa, a porttitor massa dapibus id.",
  },
  {
    q: "Question text goes here",
    a: "Integer non nisi quis elit. Morbi ac tincidunt risus.",
  },
  {
    q: "Question text goes here",
    a: "Curabitur nec velit pulvinar, bibendum ante vitae, accumsan sem.",
  },
];
