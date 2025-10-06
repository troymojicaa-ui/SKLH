// src/pages/AboutUs.tsx
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  fetchAboutUs,
  type AboutUsDTO,
  type MemberDTO,
  type TimelineItemDTO,
} from "@/services/aboutUs";

export default function AboutUs() {
  const [data, setData] = useState<AboutUsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const openModal = (src?: string | null) => {
    if (!src) return;
    setModalImage(src);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  useEffect(() => {
    (async () => {
      const d = await fetchAboutUs();
      setData(d);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

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

      {/* Hero */}
      <section className="relative isolate overflow-hidden" aria-label="About hero">
        <div className="h-[48vh] md:h-[58vh] w-full bg-gray-200">
          {data.heroImage ? (
            <img src={data.heroImage} alt="About hero" className="h-full w-full object-cover" />
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
            <h2 className="text-2xl md:text-3xl font-semibold">Members of the Office</h2>
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
                      <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
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
                    <li key={t.id ?? idx} className="relative md:grid md:grid-cols-2 md:gap-12">
                      <div className="pointer-events-none absolute left-1/2 top-2 hidden h-3 w-3 -translate-x-1/2 rounded-full bg-gray-400 md:block" />
                      <div className={`hidden md:flex ${isLeft ? "justify-end" : "justify-end opacity-0"}`}>
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
                      <div className={`hidden md:flex ${!isLeft ? "justify-start" : "justify-start opacity-0"}`}>
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
                      <div className="md:hidden">
                        <TimelineCard
                          align="left"
                          date={t.date}
                          title={t.title}
                          description={t.description}
                          buttonLabel={t.buttonLabel}
                          buttonUrl={t.buttonUrl}
                          onOpen={() => openModal(null)}
                        />
                      </div>
                    </li>
                  );
                })}
            </ol>
          </div>
        </section>
      )}

      <Footer />

      <ImageModal open={modalOpen} onClose={closeModal} src={modalImage} />
    </div>
  );
}

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
        <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{description}</p>
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
        {src ? <img src={src} alt="Timeline item" className="h-auto w-full object-cover" /> : null}
      </div>
    </div>
  );
}
