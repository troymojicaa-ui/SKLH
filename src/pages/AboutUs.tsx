import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { aboutUsMock } from "@/data/aboutUsMock";
import { Button } from "@/components/ui/button";

export default function AboutUs() {
  const featured =
    aboutUsMock.teamMembers.find((m) => m.role?.toLowerCase().includes("chair")) ??
    aboutUsMock.teamMembers[0];

  const rest = featured
    ? aboutUsMock.teamMembers.filter((m) => m !== featured)
    : aboutUsMock.teamMembers;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const openModal = (src?: string) => {
    setModalImage(
      src ||
        "https://placehold.co/960x540/png?text=Timeline+Item+Preview"
    );
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  return (
    <div className="bg-white">
      <Header />

      <section className="relative isolate overflow-hidden" aria-label="About hero">
        <div className="h-[48vh] md:h-[58vh] w-full bg-gray-200">
          <img src={aboutUsMock.heroImage} alt="" className="h-full w-full object-cover" />
        </div>
      </section>

      <section className="relative bg-gradient-to-r from-sky-800 to-sky-500 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20 grid gap-10 md:grid-cols-2 items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">About</h2>
            <p className="text-white/90 leading-relaxed">{aboutUsMock.whyWeMadeText}</p>
            <p className="mt-4 text-white/90 leading-relaxed">{aboutUsMock.missionText}</p>
          </div>
          <div className="mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-xl shadow ring-1 ring-white/20">
              <img
                src={aboutUsMock.whyWeMadeThisImage}
                alt="About visual"
                className="w-full h-[18rem] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Introduce your team</h2>
        </div>

        {featured && (
          <div className="mt-10 mx-auto max-w-4xl px-6 text-center">
            <div className="mx-auto h-28 w-28 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200">
              <img src={featured.image} alt={featured.name} className="h-full w-full object-cover" />
            </div>
            <h3 className="mt-4 text-lg font-medium">{featured.name}</h3>
            <p className="text-sm text-gray-500">{featured.role}</p>
            {featured.bio && (
              <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">{featured.bio}</p>
            )}
          </div>
        )}

        {rest?.length > 0 && (
          <div className="mt-12 mx-auto max-w-6xl px-6 grid grid-cols-2 md:grid-cols-3 gap-8">
            {rest.map((m, i) => (
              <div key={`${m.name}-${i}`} className="text-center">
                <div className="mx-auto h-20 w-20 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                  <img src={m.image} alt={m.name} className="h-full w-full object-cover" />
                </div>
                <h4 className="mt-3 font-medium">{m.name}</h4>
                <p className="text-sm text-gray-500">{m.role}</p>
                {m.bio && <p className="mt-1 text-xs text-gray-600 line-clamp-3">{m.bio}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="py-16 md:py-20 bg-gray-50">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="text-xs uppercase tracking-wide text-gray-500">Tagline</span>
          <h3 className="mt-2 text-2xl md:text-4xl font-semibold text-gray-900">
            Medium length section heading goes here
          </h3>
          <p className="mt-3 text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros
            elementum tristique. Duis cursus mi quis viverra ornare.
          </p>
          <div className="mt-6">
            <Button className="bg-sky-700 hover:bg-sky-800">Button</Button>
          </div>
        </div>
      </section>

      {/* Timeline with modal trigger */}
      <section className="py-16 md:py-20 bg-white">
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gray-300 md:block" />
          <ol className="space-y-16 md:space-y-24">
            {[1, 2, 3, 4].map((i, idx) => {
              const isLeft = idx % 2 === 0;
              return (
                <li key={i} className="relative md:grid md:grid-cols-2 md:gap-12">
                  <div className="pointer-events-none absolute left-1/2 top-2 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-gray-400 md:block" />
                  <div className={`hidden md:flex ${isLeft ? "justify-end" : "justify-end opacity-0"}`}>
                    {isLeft && <TimelineCard align="right" onOpen={() => openModal()} />}
                  </div>
                  <div className={`hidden md:flex ${!isLeft ? "justify-start" : "justify-start opacity-0"}`}>
                    {!isLeft && <TimelineCard align="left" onOpen={() => openModal()} />}
                  </div>
                  <div className="md:hidden">
                    <TimelineCard align="left" onOpen={() => openModal()} />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Footer />

      <ImageModal open={modalOpen} onClose={closeModal} src={modalImage} />
    </div>
  );
}

/* Timeline card (now accepts onOpen) */
function TimelineCard({
  align,
  onOpen,
}: {
  align: "left" | "right";
  onOpen: () => void;
}) {
  const base = "max-w-md";
  const lean = align === "right" ? "text-right" : "text-left";

  return (
    <div className={`${base} ${lean}`}>
      <p className="text-sm text-gray-500">Date</p>
      <h4 className="mt-1 font-medium">Short heading here</h4>
      <p className="mt-2 text-sm text-gray-600">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros
        elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla.
      </p>
      <Button variant="link" className="px-0 text-sky-700" onClick={onOpen}>
        Button →
      </Button>
    </div>
  );
}

/* Lightweight modal (no extra deps) */
function ImageModal({
  open,
  onClose,
  src,
}: {
  open: boolean;
  onClose: () => void;
  src: string | null;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md bg-white/90 px-3 py-1.5 text-sm shadow"
        >
          Close
        </button>
        <img
          src={
            src ||
            "https://placehold.co/960x540/png?text=Timeline+Item+Preview"
          }
          alt="Timeline item"
          className="h-auto w-full object-cover"
        />
      </div>
    </div>
  );
}
