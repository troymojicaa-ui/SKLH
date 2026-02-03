// src/pages/AboutUs.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import {
  fetchAboutUs,
  type AboutUsDTO,
  type MemberDTO,
  type TimelineItemDTO,
} from "@/services/aboutUs";

export default function AboutUs() {
  const [data, setData] = useState<AboutUsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Shared modal (used by both desktop + mobile)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const openModal = (src?: string | null) => {
    if (!src) return;
    setModalImage(src);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  // Scroll-to-top button (only intended for mobile layout)
  const teamSectionRef = useRef<HTMLElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await fetchAboutUs();
      setData(d);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  // Show scroll-to-top once user reaches Team section onwards (mobile)
  useEffect(() => {
    if (loading) return;

    const el = teamSectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // show when team section is intersecting OR once scrolled past it
        setShowScrollTop(
          entry.isIntersecting || entry.boundingClientRect.top < 0
        );
      },
      { threshold: 0, rootMargin: "-20% 0px 0px 0px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Shared computed values (used by both layouts)
  const featured = useMemo<MemberDTO | undefined>(() => {
    if (!data?.team?.length) return undefined;
    const chair =
      data.team.find((m) => (m.role || "").toLowerCase().includes("chair")) ??
      data.team[0];
    return chair;
  }, [data]);

  const rest = useMemo<MemberDTO[]>(() => {
    if (!data?.team?.length) return [];
    return featured ? data.team.filter((m) => m !== featured) : data.team;
  }, [data, featured]);

  const timelineSorted = useMemo<TimelineItemDTO[]>(() => {
    if (!Array.isArray(data?.timeline)) return [];
    return data!.timeline
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center text-slate-600">
          Loading…
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Header />

      {/* ===================== MOBILE (new design) ===================== */}
      <div className="block md:hidden">
        {/* ABOUT (dark blue band + wave into light blue) */}
        <section className="relative bg-[#1B3B6B] text-white overflow-hidden">
          <div className="mx-auto max-w-md px-6 pt-10 pb-28 text-center">
            <h1 className="text-[26px] font-medium">About</h1>

            <div className="mt-4 space-y-4 text-[12px] leading-relaxed text-white/85">
              {data.whyWeMadeText ? (
                <p className="whitespace-pre-wrap">{data.whyWeMadeText}</p>
              ) : null}
              {data.missionText ? (
                <p className="whitespace-pre-wrap">{data.missionText}</p>
              ) : null}
            </div>
          </div>

          <Wave className="absolute -bottom-1 left-0 w-full" fill="#9AE4FF" />
        </section>

        {/* TEAM (Light blue section) */}
        <section
          ref={teamSectionRef as any}
          className="relative bg-[#9AE4FF] px-6 pt-10 pb-16"
        >
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto h-40 w-40 overflow-hidden rounded-full bg-white/30 ring-4 ring-white/40 shadow">
              {data.whyWeMadeThisImage || data.heroImage ? (
                <img
                  src={(data.whyWeMadeThisImage ?? data.heroImage)!}
                  alt="Our Team"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <h2 className="mt-6 text-[18px] font-medium text-black">
              Our Team
            </h2>

            <p className="mt-3 text-[11px] leading-relaxed text-black/70">
              {data.teamIntroText
                ? data.teamIntroText
                : "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique."}
            </p>

            {(featured || rest.length > 0) && (
              <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10 text-left">
                {featured && (
                  <MemberCard
                    name={featured.name}
                    role={featured.role}
                    bio={featured.bio}
                    avatarUrl={featured.avatarUrl}
                    onOpen={() => openModal(featured.avatarUrl)}
                  />
                )}

                {rest.map((m, i) => (
                  <MemberCard
                    key={`${m.id ?? m.name}-${i}`}
                    name={m.name}
                    role={m.role}
                    bio={m.bio}
                    avatarUrl={m.avatarUrl}
                    onOpen={() => openModal(m.avatarUrl)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Image */}
        <section className="relative bg-[#9AE4FF] px-6 pt-12 pb-16">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto h-56 w-56 overflow-hidden rounded-[32px] bg-white/30 shadow-[0px_10px_30px_rgba(0,0,0,0.18)]">
              {data.heroImage ? (
                <img
                  src={data.heroImage}
                  alt="Featured"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : null}
            </div>
          </div>
        </section>

        {/* TIMELINE / UPDATES (vertical line timeline) */}
        <section className="bg-[#9AE4FF] px-6 pt-10 pb-16">
          <div className="mx-auto max-w-md">
            <h2 className="text-[18px] font-medium leading-tight text-black text-center">
              {data.timelineHeading ?? "Medium length section heading goes here"}
            </h2>

            {data.timelineSubheading ? (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-black/70 whitespace-pre-wrap">
                {data.timelineSubheading}
              </p>
            ) : (
              <p className="mt-2 text-center text-[11px] leading-relaxed text-black/70">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Curabitur nec velit pulvinar, bibendum ante vitae, accumsan sem.
              </p>
            )}

            {timelineSorted.length > 0 && (
              <div className="mt-8">
                {timelineSorted.map((t, idx) => {
                  const isLast = idx === timelineSorted.length - 1;
                  return (
                    <div key={t.id ?? idx} className="relative flex gap-4">
                      {/* Left timeline rail */}
                      <div className="relative w-6 flex justify-center">
                        {/* Dot */}
                        <div className="mt-[6px] h-2.5 w-2.5 rounded-full bg-black" />
                        {/* Vertical line */}
                        {!isLast && (
                          <div className="absolute top-4 bottom-0 w-[2px] bg-black/80" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-10">
                        <div className="text-[12px] font-semibold text-black">
                          {t.date ?? "Date"}
                        </div>

                        <div className="mt-1 text-[16px] font-semibold leading-tight text-black">
                          {t.title ?? "Short heading here"}
                        </div>

                        <p className="mt-3 text-[11px] leading-relaxed text-black/70 whitespace-pre-wrap">
                          {t.description ??
                            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat. Lorem ipsum dolor sit amet, consectetur adipiscing elit."}
                        </p>

                        {t.buttonLabel && t.buttonUrl ? (
                          <div className="mt-4">
                            <a
                              href={t.buttonUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-[11px] text-black/80 hover:text-black"
                            >
                              <span>{t.buttonLabel}</span>
                              <span aria-hidden="true">→</span>
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Dark swoosh into footer (more dramatic) */}
        <section className="relative h-32 bg-[#9AE4FF] overflow-hidden">
          <svg
            className="absolute bottom-0 left-0 w-full h-full"
            viewBox="0 0 1440 160"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,35 C260,155 520,15 760,95 C980,170 1200,55 1440,115 L1440,160 L0,160 Z"
              fill="#0F2A47"
            />
          </svg>
        </section>
      </div>

      {/* ===================== DESKTOP (old design) ===================== */}
      <div className="hidden md:block">
        {/* Hero */}
        <section className="relative isolate overflow-hidden" aria-label="About hero">
          <div className="h-[48vh] md:h-[58vh] w-full bg-gray-200">
            {data.heroImage ? (
              <img
                src={data.heroImage}
                alt="About hero"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </section>

        {/* About band */}
        <section className="relative bg-gradient-to-r from-sky-800 to-sky-500 text-white">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20 grid gap-10 md:grid-cols-2 items-center">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4">About</h2>
              {data.whyWeMadeText ? (
                <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                  {data.whyWeMadeText}
                </p>
              ) : null}
              {data.missionText ? (
                <p className="mt-4 text-white/90 leading-relaxed whitespace-pre-wrap">
                  {data.missionText}
                </p>
              ) : null}
            </div>

            <div className="mx-auto w-full max-w-md">
              <div className="overflow-hidden rounded-xl shadow ring-1 ring-white/20">
                {data.whyWeMadeThisImage ? (
                  <img
                    src={data.whyWeMadeThisImage}
                    alt="About visual"
                    className="w-full h-[18rem] object-cover"
                  />
                ) : (
                  <div className="h-[18rem] w-full bg-white/10" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        {(featured || (rest && rest.length)) && (
          <section className="py-16 md:py-20 bg-white">
            <div className="mx-auto max-w-3xl px-6 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold">
                Members of the Office
              </h2>
            </div>

            {featured && (
              <div className="mt-10 mx-auto max-w-4xl px-6 text-center">
                <div className="mx-auto h-28 w-28 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                  {featured.avatarUrl ? (
                    <img
                      src={featured.avatarUrl}
                      alt={featured.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <h3 className="mt-4 text-lg font-medium">{featured.name}</h3>
                <p className="text-sm text-gray-500">{featured.role}</p>
                {featured.bio && (
                  <p className="mt-2 text-sm text-gray-600 max-w-xl mx-auto whitespace-pre-wrap">
                    {featured.bio}
                  </p>
                )}
              </div>
            )}

            {rest?.length > 0 && (
              <div className="mt-12 mx-auto max-w-6xl px-6 grid grid-cols-2 md:grid-cols-3 gap-8">
                {rest.map((m, i) => (
                  <div key={`${m.id ?? m.name}-${i}`} className="text-center">
                    <div className="mx-auto h-20 w-20 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <h4 className="mt-3 font-medium">{m.name}</h4>
                    <p className="text-sm text-gray-500">{m.role}</p>
                    {m.bio && (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">
                        {m.bio}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Timeline */}
        {Array.isArray(data.timeline) && data.timeline.length > 0 && (
          <section className="py-16 md:py-20 bg-white">
            <div className="relative mx-auto max-w-5xl px-6">
              <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gray-300 md:block" />

              <ol className="space-y-16 md:space-y-24">
                {data.timeline
                  .slice()
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((t: TimelineItemDTO, idx) => {
                    const isLeft = idx % 2 === 0;

                    return (
                      <li
                        key={t.id ?? idx}
                        className="relative md:grid md:grid-cols-2 md:gap-12"
                      >
                        <div className="pointer-events-none absolute left-1/2 top-2 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-gray-400 md:block" />

                        {/* Left column */}
                        <div
                          className={`hidden md:flex ${
                            isLeft ? "justify-end" : "justify-end opacity-0"
                          }`}
                        >
                          {isLeft && (
                            <TimelineCard
                              align="right"
                              date={t.date}
                              title={t.title}
                              description={t.description}
                              buttonLabel={t.buttonLabel}
                              buttonUrl={t.buttonUrl}
                              onOpen={() => openModal(null)}
                            />
                          )}
                        </div>

                        {/* Right column */}
                        <div
                          className={`hidden md:flex ${
                            !isLeft ? "justify-start" : "justify-start opacity-0"
                          }`}
                        >
                          {!isLeft && (
                            <TimelineCard
                              align="left"
                              date={t.date}
                              title={t.title}
                              description={t.description}
                              buttonLabel={t.buttonLabel}
                              buttonUrl={t.buttonUrl}
                              onOpen={() => openModal(null)}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ol>
            </div>
          </section>
        )}
      </div>

      <Footer />

      <ImageModal open={modalOpen} onClose={closeModal} src={modalImage} />

      {/* Scroll-to-top button (MOBILE ONLY) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform md:hidden"
          aria-label="Scroll to top"
          type="button"
        >
          <ChevronUp className="w-6 h-6 text-black" />
        </button>
      )}
    </div>
  );
}

/* ---------------- Desktop helper ---------------- */

function TimelineCard({
  align,
  date,
  title,
  description,
  buttonLabel,
  buttonUrl,
  onOpen,
}: {
  align: "left" | "right";
  date?: string | null;
  title?: string | null;
  description?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  onOpen: () => void;
}) {
  const base = "max-w-md";
  const lean = align === "right" ? "text-right" : "text-left";

  return (
    <div className={`${base} ${lean}`}>
      {date ? <p className="text-sm text-gray-500">{date}</p> : null}
      {title ? <h4 className="mt-1 font-medium">{title}</h4> : null}
      {description ? (
        <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
          {description}
        </p>
      ) : null}
      {buttonLabel && buttonUrl ? (
        <Button asChild variant="link" className="px-0 text-sky-700">
          <a href={buttonUrl} target="_blank" rel="noreferrer">
            {buttonLabel}
          </a>
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------- Mobile helpers ---------------- */

function MemberCard({
  name,
  role,
  bio,
  avatarUrl,
  onOpen,
}: {
  name?: string | null;
  role?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={avatarUrl ? onOpen : undefined}
        className="mx-auto block h-16 w-16 rounded-full overflow-hidden bg-white/50 ring-2 ring-black/10"
        aria-label={name ? `Open ${name} photo` : "Member photo"}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name ?? "Member"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-white/40" />
        )}
      </button>

      <div className="mt-3 text-[12px] font-semibold text-black">
        {name ?? "Full name"}
      </div>
      <div className="text-[11px] text-black/70">{role ?? "Job title"}</div>

      {bio ? (
        <p className="mt-2 text-[10px] leading-relaxed text-black/65 line-clamp-4 whitespace-pre-wrap">
          {bio}
        </p>
      ) : (
        <p className="mt-2 text-[10px] leading-relaxed text-black/55 line-clamp-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
          varius enim.
        </p>
      )}
    </div>
  );
}

function Wave({
  className = "",
  fill = "#9AE4FF",
  flip = false,
}: {
  className?: string;
  fill?: string;
  flip?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 200"
      preserveAspectRatio="none"
      style={{ transform: flip ? "scaleY(-1)" : undefined }}
      aria-hidden="true"
    >
      <path
        d="M0,0 C360,200 1080,200 1440,0 L1440,200 L0,200 Z"
        fill={fill}
      />
    </svg>
  );
}

/* ---------------- Shared modal ---------------- */

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
        {src ? (
          <img src={src} alt="Preview" className="h-auto w-full object-cover" />
        ) : null}
      </div>
    </div>
  );
}
