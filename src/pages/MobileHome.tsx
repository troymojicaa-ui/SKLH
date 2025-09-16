// src/pages/MobileHome.tsx
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginModal from "@/components/auth/LoginModal";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Target,
  Eye,
  Sparkles,
  CalendarDays,
  Images,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

/** Small decorative avatar image used in the hero */
function FloatyImg({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-10 w-10 rounded-md bg-gray-300 shadow-sm ${className}`}
      aria-hidden
    />
  );
}

export default function MobileHome() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* floating avatars */}
        <FloatyImg className="absolute left-4 top-6" />
        <FloatyImg className="absolute right-6 top-5" />
        <FloatyImg className="absolute -right-2 top-28 rotate-[12deg]" />
        <FloatyImg className="absolute left-3 top-[140px] rotate-[-8deg]" />

        <div className="px-4 pt-16 pb-8">
          {/* small label, like desktop */}
          <div className="text-center text-sky-700 text-xs font-semibold tracking-wide">
            SK LOYOLA HEIGHTS
          </div>

          {/* headline to match desktop wording */}
          <h1 className="mt-2 text-center text-4xl font-extrabold leading-tight text-slate-900">
            Empowering
            <br />
            youth,
            <br />
            building
            <br />
            community.
          </h1>

          {/* supporting line (same as desktop) */}
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

          {/* hero placeholder panel */}
          <div className="mt-8 mx-auto h-40 w-full max-w-[340px] rounded-xl bg-gray-200" />
        </div>

        {/* gradient band with three feature tiles */}
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

      {/* UPCOMING EVENTS */}
      <SectionBlock
        kicker="Upcoming Events"
        title="Medium length section heading goes here"
        desc="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique."
      >
        <div className="space-y-4">
          {/* lead card */}
          <div className="mx-auto h-32 w-[88%] rounded-xl bg-gray-200 shadow-sm" />
          {/* thumbnails row */}
          <div className="mt-2 grid grid-cols-3 gap-3 px-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-md bg-gray-200 shadow-sm" />
            ))}
          </div>
        </div>
      </SectionBlock>

      {/* UPCOMING PROJECTS */}
      <SectionBlock
        kicker="Upcoming Projects"
        title="Medium length section heading goes here"
        desc="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique."
      >
        {/* mosaic grid */}
        <div className="mt-3 grid grid-cols-2 gap-3 px-3">
          <div className="col-span-2 h-40 rounded-xl bg-gray-200" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-200" />
          ))}
        </div>
      </SectionBlock>

      {/* GALLERY STRIP (quick, subtle) */}
      <section className="px-4">
        <div className="mx-auto max-w-md grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-md bg-gray-200" />
          ))}
        </div>
      </section>

      {/* FAQ */}
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

      {/* CTA */}
      <section className="px-4 py-10">
        <div className="mx-auto max-w-md">
          <h3 className="text-lg font-semibold">
            Call to action to participate in a project or event
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Invite people to volunteer, donate, or sign up for activities. Keep it
            short; add a button that routes to your Projects or Events page.
          </p>
          <div className="mt-4 flex gap-2">
            <Button className="bg-sky-700 hover:bg-sky-800">Button</Button>
            <Button variant="outline">
              Gallery
              <Images className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* User (Connect) login modal */}
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

function SectionBlock({
  kicker,
  title,
  desc,
  children,
}: {
  kicker: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8">
      <div className="mx-auto max-w-md px-4">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">
          {kicker}
        </div>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{desc}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
