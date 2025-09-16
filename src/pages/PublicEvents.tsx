import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useMemo, useState } from "react";
import {
  allEvents,
  categories,
  featuredEvents,
  schedule,
} from "@/data/eventsMock";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function PublicEvents() {
  const [featIdx, setFeatIdx] = useState(0);
  const [cat, setCat] = useState("All");
  const [openDay, setOpenDay] = useState<string | null>(schedule?.[0]?.id ?? null);
  const featured = featuredEvents[featIdx];

  const filtered = useMemo(() => {
    return cat === "All" ? allEvents : allEvents.filter((e) => e.category === cat);
  }, [cat]);

  const toggleDay = (id: string) => {
    setOpenDay((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Featured section */}
      <section className="max-w-5xl mx-auto px-4 pt-12">
        <h1 className="text-center text-4xl font-semibold">Our Featured Events</h1>
        <p className="mt-2 text-center text-gray-600">
          Here are some upcoming events that we’re brewing
        </p>

        <div className="relative mt-8">
          {/* arrows – desktop (circular, no border, spaced away) */}
          <button
            className="absolute -left-16 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#173A67] shadow hover:bg-white"
            onClick={() =>
              setFeatIdx((i) => (i - 1 + featuredEvents.length) % featuredEvents.length)
            }
            aria-label="Previous featured"
          >
            &lt;
          </button>

          <button
            className="absolute -right-16 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#173A67] shadow hover:bg-white"
            onClick={() => setFeatIdx((i) => (i + 1) % featuredEvents.length)}
            aria-label="Next featured"
          >
            &gt;
          </button>

          {/* card */}
          <div className="grid sm:grid-cols-2 overflow-hidden rounded-xl ring-1 ring-gray-200 shadow-sm">
            {/* left – details */}
            <div className="bg-white p-6">
              <div className="inline-flex items-center gap-2 rounded border px-2 py-0.5 text-[11px]">
                {featured.mode}
              </div>

              <h2 className="mt-3 text-2xl font-semibold">{featured.title}</h2>

              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-4">
                  <span>{format(new Date(featured.date), "EEE dd MMM yyyy")}</span>
                  <span>•</span>
                  <span>
                    {featured.start} – {featured.end}
                  </span>
                </div>
                <div>📍 {featured.location}</div>
                {featured.speakers?.length ? (
                  <div>
                    <div className="text-xs font-semibold">Speaker/s</div>
                    <div className="text-sm text-gray-700">
                      {featured.speakers.join(", ")}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-xs font-semibold">Details</div>
                  <p className="text-sm text-gray-600">{featured.excerpt}</p>
                </div>
              </div>
            </div>

            {/* right – register panel on image */}
            <div
              className="relative min-h-[300px] bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(to bottom right, rgba(15,23,42,.55), rgba(15,23,42,.55)), url('${
                  featured.cover ?? ""
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
                    />
                    <input
                      placeholder="Last name"
                      className="rounded-md border border-white/30 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-500"
                    />
                  </div>
                  <input
                    placeholder="ID Number"
                    className="w-full rounded-md border border-white/30 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-500"
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

          {/* arrows – mobile (below register) */}
          <div className="mt-4 flex justify-center gap-8 md:hidden">
            <button
              onClick={() =>
                setFeatIdx((i) => (i - 1 + featuredEvents.length) % featuredEvents.length)
              }
              aria-label="Previous featured mobile"
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#173A67] shadow"
            >
              &lt;
            </button>
            <button
              onClick={() => setFeatIdx((i) => (i + 1) % featuredEvents.length)}
              aria-label="Next featured mobile"
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#173A67] shadow"
            >
              &gt;
            </button>
          </div>
        </div>
      </section>

      {/* All events */}
      <section className="mt-16 bg-sky-900 py-14 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-center text-3xl font-semibold">All Events</h2>

          {/* category pills + view all */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button className="rounded border border-white/30 px-3 py-1 text-sm">
              View all
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded px-3 py-1 text-sm ${
                  cat === c ? "bg-white text-sky-900" : "bg-white/10"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* cards */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <article
                key={e.id}
                className="rounded-xl bg-sky-800/40 ring-1 ring-white/10 overflow-hidden"
              >
                <div className="aspect-[16/9] bg-white/10">
                  <img
                    src={
                      e.cover ??
                      "https://via.placeholder.com/1200x675.png?text=Event+Cover"
                    }
                    alt={e.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium">{e.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/80">
                    <span>
                      {format(new Date(e.date), "EEE dd MMM yyyy")} • {e.start} – {e.end}
                    </span>
                    <span className="rounded border border-white/30 px-2 py-0.5">
                      {e.mode}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/90 line-clamp-2">{e.excerpt}</p>
                  <div className="mt-3 text-sm">
                    <Link to={`/events/${e.id}`} className="underline">
                      View event
                    </Link>
                    <span className="ml-1">→</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
              View all
            </button>
          </div>
        </div>
      </section>

      {/* Schedule (accordion + mobile-friendly) */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="rounded-2xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-center text-3xl font-semibold">Events Schedule</h2>
          <p className="mt-2 text-center text-gray-600 max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
            varius enim in eros elementum tristique.
          </p>

          <ul className="mt-8 divide-y">
            {schedule.map((day) => {
              const isOpen = openDay === day.id;
              return (
                <li key={day.id} className="py-3">
                  {/* Day header */}
                  <button
                    className="w-full flex items-center justify-between py-2 text-left"
                    onClick={() => toggleDay(day.id)}
                    aria-expanded={isOpen}
                    aria-controls={`day-${day.id}`}
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

                  {/* Items */}
                  {isOpen && (
                    <div id={`day-${day.id}`} className="pt-4">
                      {/* Desktop/tablet layout */}
                      <div className="hidden sm:block">
                        <div className="divide-y rounded-md border border-gray-200">
                          {day.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-[90px_1fr_110px_1fr_1fr_auto] items-center gap-3 px-4 py-3"
                            >
                              <div className="text-sm text-gray-700">{it.time}</div>
                              <div className="text-sm text-gray-900">{it.title}</div>
                              <div>
                                <span
                                  className={`inline-block rounded border px-2 py-0.5 text-[11px] ${
                                    it.mode === "In-person"
                                      ? "border-gray-300 text-gray-700"
                                      : "border-sky-500 text-sky-700"
                                  }`}
                                >
                                  {it.mode}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700">{it.speaker}</div>
                              <div className="text-sm text-gray-700">{it.location}</div>
                              <div className="text-right">
                                <button className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800">
                                  View details
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mobile layout */}
                      <div className="sm:hidden space-y-3">
                        {day.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="rounded-md border border-gray-200 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700">{it.time}</span>
                              <span
                                className={`inline-block rounded border px-2 py-0.5 text-[11px] ${
                                  it.mode === "In-person"
                                    ? "border-gray-300 text-gray-700"
                                    : "border-sky-500 text-sky-700"
                                }`}
                              >
                                {it.mode}
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-medium text-gray-900">
                              {it.title}
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-700">
                              <div>
                                <span className="block text-gray-500">Speaker</span>
                                <span>{it.speaker}</span>
                              </div>
                              <div>
                                <span className="block text-gray-500">Location</span>
                                <span>{it.location}</span>
                              </div>
                            </div>
                            <div className="mt-3">
                              <button className="w-full rounded-md bg-sky-700 px-3 py-2 text-xs font-medium text-white hover:bg-sky-800">
                                View details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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
