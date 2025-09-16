import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { aboutUsMock } from "@/data/aboutUsMock";
import { Button } from "@/components/ui/button";

export default function AboutUs() {
  // Feature the chair if present; otherwise first member
  const featured =
    aboutUsMock.teamMembers.find((m) =>
      m.role?.toLowerCase().includes("chair")
    ) ?? aboutUsMock.teamMembers[0];

  const rest =
    featured
      ? aboutUsMock.teamMembers.filter((m) => m !== featured)
      : aboutUsMock.teamMembers;

  return (
    <div className="bg-white">
      {/* Top navbar */}
      <Header />

      {/* HERO */}
      <section
        className="relative isolate overflow-hidden"
        aria-label="About hero"
      >
        <div className="h-[48vh] md:h-[58vh] w-full bg-gray-200">
          <img
            src={aboutUsMock.heroImage}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      {/* ABOUT STRIP */}
      <section className="relative bg-gradient-to-r from-sky-800 to-sky-500 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-20 grid gap-10 md:grid-cols-2 items-center">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">About</h2>
            <p className="text-white/90 leading-relaxed">
              {aboutUsMock.whyWeMadeText}
            </p>
            <p className="mt-4 text-white/90 leading-relaxed">
              {aboutUsMock.missionText}
            </p>
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

      {/* TEAM INTRO */}
      <section className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Introduce your team
          </h2>
        </div>

        {/* Featured person */}
        {featured && (
          <div className="mt-10 mx-auto max-w-4xl px-6 text-center">
            <div className="mx-auto h-28 w-28 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200">
              <img
                src={featured.image}
                alt={featured.name}
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="mt-4 text-lg font-medium">{featured.name}</h3>
            <p className="text-sm text-gray-500">{featured.role}</p>
            {featured.bio && (
              <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto">
                {featured.bio}
              </p>
            )}
          </div>
        )}

        {/* Rest of the team */}
        {rest?.length > 0 && (
          <div className="mt-12 mx-auto max-w-6xl px-6 grid grid-cols-2 md:grid-cols-3 gap-8">
            {rest.map((m, i) => (
              <div key={`${m.name}-${i}`} className="text-center">
                <div className="mx-auto h-20 w-20 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                  <img
                    src={m.image}
                    alt={m.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <h4 className="mt-3 font-medium">{m.name}</h4>
                <p className="text-sm text-gray-500">{m.role}</p>
                {m.bio && (
                  <p className="mt-1 text-xs text-gray-600 line-clamp-3">
                    {m.bio}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA BAND */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <span className="text-xs uppercase tracking-wide text-gray-500">
            Tagline
          </span>
          <h3 className="mt-2 text-2xl md:text-4xl font-semibold text-gray-900">
            Medium length section heading goes here
          </h3>
          <p className="mt-3 text-gray-600">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
            varius enim in eros elementum tristique. Duis cursus mi quis viverra
            ornare.
          </p>
          <div className="mt-6">
            <Button className="bg-sky-700 hover:bg-sky-800">Button</Button>
          </div>
        </div>
      </section>

      {/* TIMELINE (center spine, items lean toward spine) */}
      <section className="py-16 md:py-20 bg-white">
        <div className="relative mx-auto max-w-5xl px-6">
          {/* spine */}
          <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gray-300 md:block" />

          <ol className="space-y-16 md:space-y-24">
            {[1, 2, 3, 4].map((i, idx) => {
              const isLeft = idx % 2 === 0; // left/right alternate
              return (
                <li
                  key={i}
                  className="relative md:grid md:grid-cols-2 md:gap-12"
                >
                  {/* dot on spine */}
                  <div className="pointer-events-none absolute left-1/2 top-2 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-gray-400 md:block" />

                  {/* LEFT column wrapper (holds item when isLeft) */}
                  <div
                    className={`hidden md:flex ${isLeft ? "justify-end" : "justify-end opacity-0"}`}
                  >
                    {isLeft && (
                      <TimelineCard align="right" /> // text leans to spine
                    )}
                  </div>

                  {/* RIGHT column wrapper (holds item when !isLeft) */}
                  <div
                    className={`hidden md:flex ${!isLeft ? "justify-start" : "justify-start opacity-0"}`}
                  >
                    {!isLeft && (
                      <TimelineCard align="left" /> // text leans to spine
                    )}
                  </div>

                  {/* Mobile: single column (no alternating layout) */}
                  <div className="md:hidden">
                    <TimelineCard align="left" />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

/** A single timeline card. `align="right"` => right-aligned text that leans to the spine. */
function TimelineCard({ align }: { align: "left" | "right" }) {
  const base =
    "max-w-md"; // keep content from stretching; this makes the lean feel intentional
  const lean =
    align === "right"
      ? "text-right"
      : "text-left";

  return (
    <div className={`${base} ${lean}`}>
      <p className="text-sm text-gray-500">Date</p>
      <h4 className="mt-1 font-medium">Short heading here</h4>
      <p className="mt-2 text-sm text-gray-600">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
        varius enim in eros elementum tristique. Duis cursus, mi quis viverra
        ornare, eros dolor interdum nulla.
      </p>
      <Button variant="link" className="px-0 text-sky-700">
        Button →
      </Button>
    </div>
  );
}
