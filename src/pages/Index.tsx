// src/pages/Index.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Target, Eye, Sparkles, ChevronRight } from "lucide-react";

import LoginModal from "@/components/auth/LoginModal";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginRole, setLoginRole] = useState<"admin" | "user">("user");

  const handleLoginClick = (role: "admin" | "user") => {
    setLoginRole(role);
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Single header only */}
      <Header onLoginClick={handleLoginClick} />

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#F4F7FB]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-28">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            {/* Left copy */}
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
                <Link to="/projects">
                  <Button variant="outline">Explore Projects</Button>
                </Link>
              </div>
            </div>

            {/* Right visual placeholder */}
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

      {/* UPCOMING EVENTS */}
      <UpcomingSection
        kicker="Upcoming Events"
        title="Medium length section heading goes here"
        desc="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique."
        buttonLabel="Button"
        align="left"
      />

      {/* UPCOMING PROJECTS */}
      <UpcomingSection
        kicker="Upcoming Projects"
        title="Medium length section heading goes here"
        desc="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique."
        buttonLabel="Button"
        align="right"
      />

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

      {/* Footer */}
      <Footer />

      {/* Login Modal */}
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

function UpcomingSection({
  kicker,
  title,
  desc,
  buttonLabel,
  align = "left",
}: {
  kicker: string;
  title: string;
  desc: string;
  buttonLabel: string;
  align?: "left" | "right";
}) {
  const textFirst = align === "left";

  return (
    <section className="relative overflow-hidden bg-white py-20">
      {/* soft blue curved background */}
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
        {/* Text */}
        <div className={`${textFirst ? "order-1" : "order-2"} max-w-xl`}>
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            {kicker}
          </div>
          <h2 className="text-2xl md:text-4xl font-semibold text-gray-900">
            {title}
          </h2>
          <p className="mt-3 text-gray-600">{desc}</p>

          <Button variant="ghost" className="mt-4 px-0 text-sky-800 hover:text-sky-900">
            {buttonLabel}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* Visuals */}
        <div className={`${textFirst ? "order-2" : "order-1"} relative`}>
          <div className="relative mx-auto h-64 w-64 rounded-xl bg-gray-200 shadow" />
          <div className="absolute -right-4 -top-6 h-24 w-24 rounded-lg bg-gray-200 shadow" />
          <div className="absolute right-16 top-10 h-14 w-20 rounded-md bg-gray-200 shadow" />
          <div className="absolute -left-6 bottom-6 h-20 w-28 rounded-lg bg-gray-200 shadow" />
        </div>
      </div>
    </section>
  );
}

export default Index;
