// src/pages/MobileHome.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginModal from "@/components/auth/LoginModal";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { supabase } from "@/lib/supabaseClient";
import { BarChart3, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

/** ---- Types ---- */

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

type Poll = {
  id: string;
  question: string;
  options: string[]; // text[]
  is_active: boolean | null;
  created_at: string | null;
};

export default function MobileHome() {
  const [loginOpen, setLoginOpen] = useState(false);

  // Poll (connected to Command)
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollResults, setPollResults] = useState<Record<number, number>>({});
  const [votedOption, setVotedOption] = useState<number | null>(null);
  const [pollLoading, setPollLoading] = useState(true);

  // Projects (public) — carousel
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectIndex, setProjectIndex] = useState(0);
  const [projectLoading, setProjectLoading] = useState(true);

  // swipe refs/state (Projects carousel)
  const swipeRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchLastX = useRef<number | null>(null);
  const isSwiping = useRef(false);

  // Scroll-to-top button visibility (show from Poll section onwards)
  const pollSectionRef = useRef<HTMLElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    (async () => {
      setPollLoading(true);
      setProjectLoading(true);

      // 1) ACTIVE POLL
      const { data: pollData, error: pollErr } = await supabase
        .from("polls")
        .select("id, question, options, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pollErr && pollData) {
        setPoll(pollData as Poll);

        // 1a) Results (count votes for this poll)
        const { data: votesData, error: votesErr } = await supabase
          .from("poll_votes")
          .select("option_index")
          .eq("poll_id", pollData.id);

        if (!votesErr) {
          const counts: Record<number, number> = {};
          (votesData || []).forEach((r: any) => {
            const idx = Number(r.option_index);
            counts[idx] = (counts[idx] || 0) + 1;
          });
          setPollResults(counts);
        }

        // 1b) Detect if user already voted
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (uid) {
          const { data: myVote } = await supabase
            .from("poll_votes")
            .select("option_index")
            .eq("poll_id", pollData.id)
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (
            myVote &&
            myVote.option_index !== null &&
            myVote.option_index !== undefined
          ) {
            setVotedOption(Number(myVote.option_index));
          }
        }
      } else {
        setPoll(null);
        setPollResults({});
        setVotedOption(null);
      }

      setPollLoading(false);

      // 2) PROJECTS (public/visible) — fetch multiple and carousel them
      const { data: projData, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .eq("visibility", "public")
        .order("start_date", { ascending: false, nullsFirst: false })
        .limit(12);

      if (!projErr && projData) {
        const list = projData as Project[];
        setProjects(list);
        setProjectIndex(0);
      } else {
        setProjects([]);
        setProjectIndex(0);
      }

      setProjectLoading(false);
    })();
  }, []);

  // Scroll-to-top visibility (when Poll section enters viewport or has been passed)
  useEffect(() => {
    const el = pollSectionRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setShowScrollTop(entry.isIntersecting || entry.boundingClientRect.top < 0);
      },
      { threshold: 0, rootMargin: "-20% 0px 0px 0px" }
    );

    io.observe(el);

    return () => {
      io.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function handleVote(optionIndex: number) {
    if (!poll) return;

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) {
      setLoginOpen(true);
      return;
    }
    if (votedOption !== null) return;

    const { error } = await supabase.from("poll_votes").insert({
      poll_id: poll.id,
      option_index: optionIndex,
      user_id: uid,
    });

    if (error) return;

    setVotedOption(optionIndex);
    setPollResults((prev) => ({
      ...prev,
      [optionIndex]: (prev[optionIndex] || 0) + 1,
    }));
  }

  const totalVotes = useMemo(
    () => Object.values(pollResults).reduce((a, b) => a + b, 0),
    [pollResults]
  );

  // Carousel controls (circular)
  const activeProject = projects.length ? projects[projectIndex] : null;

  function goPrevProject() {
    if (!projects.length) return;
    setProjectIndex((i) => (i - 1 + projects.length) % projects.length);
  }

  function goNextProject() {
    if (!projects.length) return;
    setProjectIndex((i) => (i + 1) % projects.length);
  }

  // ---- Swipe handlers (touch) ----
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (projectLoading || projects.length <= 1) return;
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchLastX.current = t.clientX;
    isSwiping.current = false;
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (projectLoading || projects.length <= 1) return;
    const t = e.touches[0];
    touchLastX.current = t.clientX;

    const sx = touchStartX.current;
    const sy = touchStartY.current;
    if (sx == null || sy == null) return;

    const dx = t.clientX - sx;
    const dy = t.clientY - sy;

    // lock when user is clearly swiping horizontally
    if (!isSwiping.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        isSwiping.current = true;
      }
    }

    // if horizontal swipe detected, prevent vertical scroll "steal"
    if (isSwiping.current) {
      e.preventDefault();
    }
  }

  function onTouchEnd() {
    if (projectLoading || projects.length <= 1) return;

    const sx = touchStartX.current;
    const lx = touchLastX.current;
    if (sx == null || lx == null) return;

    const dx = lx - sx;

    // threshold
    const THRESH = 45;
    if (dx <= -THRESH) {
      // swiped left -> next
      goNextProject();
    } else if (dx >= THRESH) {
      // swiped right -> prev
      goPrevProject();
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchLastX.current = null;
    isSwiping.current = false;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO (IMAGE PLACEHOLDER ONLY) */}
      <section className="relative w-full overflow-hidden bg-white">
        {/* Background image placeholder */}
        <div className="relative h-[85vh] w-full bg-gray-200">
          {/* Optional subtle white gradient like Figma */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/30 to-white/90" />
          {/* Put your image later:
              <img src="..." className="absolute inset-0 h-full w-full object-cover" />
           */}
        </div>

        {/* HERO TEXT OVERLAY (added) */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-start pt-24 text-center">
          <div className="text-[16px] font-medium tracking-[0.18em] text-[#1B3B6B]">
            WELCOME TO
          </div>
          <div className="mt-1 font-serif text-[40px] leading-[1.05] tracking-[0.08em] text-black">
            SK LOYOLA
          </div>
        </div>

        {/* Light blue curved wave at the bottom (matches Figma vibe) */}
        <Wave
          className="absolute -bottom-1 left-0 w-full"
          fill="#9AE4FF"
          flip={false}
        />
      </section>

      {/* POLL / CONSENSUS (Figma style) */}
      <section
        ref={pollSectionRef as any}
        className="relative bg-[#9AE4FF] px-6 pt-10 pb-14"
      >
        <div className="mx-auto max-w-md">
          <div className="flex justify-center">
            <div className="rounded bg-black px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-white shadow">
              CONSENSUS
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-[340px] rounded-[12px] bg-[#FAFAFA] p-6 shadow-[0px_4px_8px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1D344D]">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>

              {pollLoading ? (
                <div className="mt-6 space-y-3">
                  <div className="h-5 w-4/5 mx-auto rounded bg-gray-200 animate-pulse" />
                  <div className="h-10 rounded bg-gray-200 animate-pulse" />
                  <div className="h-10 rounded bg-gray-200 animate-pulse" />
                  <div className="h-10 rounded bg-gray-200 animate-pulse" />
                </div>
              ) : poll ? (
                <>
                  <h2 className="mt-6 text-center text-[18px] leading-[1.25] font-medium text-black">
                    {poll.question}
                  </h2>

                  <div className="mt-6 space-y-3">
                    {poll.options.map((opt, idx) => {
                      const isMine = votedOption === idx;
                      const disabled = votedOption !== null;
                      const count = pollResults[idx] || 0;
                      const pct =
                        totalVotes > 0
                          ? Math.round((count / totalVotes) * 100)
                          : 0;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleVote(idx)}
                          disabled={disabled}
                          className={[
                            "w-full rounded-lg bg-black px-4 py-3 text-left text-sm text-white transition",
                            disabled
                              ? "opacity-90 cursor-default"
                              : "hover:opacity-95",
                            isMine ? "ring-2 ring-white/70" : "",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{opt}</span>
                            {votedOption !== null && (
                              <span className="text-xs text-white/80">
                                {pct}% ({count})
                              </span>
                            )}
                          </div>

                          {votedOption !== null && (
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/20">
                              <div
                                className="h-full bg-white/80"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 text-center text-xs text-gray-600">
                    {votedOption !== null
                      ? `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`
                      : "Vote to see results."}
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-lg bg-white p-4 text-sm text-gray-700">
                  No active poll right now. Check back soon.
                </div>
              )}
            </div>
          </div>

          <p className="mt-10 text-center text-[12px] leading-relaxed text-black/70">
            This is a short note about the event. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit.
          </p>
        </div>

        {/* Dark blue wave into Projects section */}
        <Wave
          className="absolute -bottom-1 left-0 w-full"
          fill="#1B3B6B"
          flip={false}
        />
      </section>

      {/* PROJECTS (dark section like Figma) */}
      <section className="relative bg-[#1B3B6B] px-6 pt-16 pb-16 text-white overflow-hidden min-h-[760px]">
        <div className="mx-auto max-w-md">
          <div className="flex justify-center">
            <div className="rounded bg-black px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-white shadow">
              PAST PROJECTS
            </div>
          </div>

          {/* Swipable area */}
          <div
            ref={swipeRef}
            className="mt-10 relative min-h-[560px]"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ touchAction: "pan-y" }}
          >
            {/* Arrow buttons centered vertically in the section */}
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/15 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/15"
              aria-label="Previous"
              type="button"
              onClick={goPrevProject}
              disabled={projectLoading || projects.length <= 1}
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>

            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-white/15 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/15"
              aria-label="Next"
              type="button"
              onClick={goNextProject}
              disabled={projectLoading || projects.length <= 1}
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>

            {/* Content padded so arrows don't overlap */}
            <div className="px-12">
              {projectLoading ? (
                <div className="mt-6 animate-pulse">
                  <div className="h-56 w-full rounded-xl bg-white/15" />
                  <div className="mt-5 h-8 w-3/4 rounded bg-white/15" />
                  <div className="mt-3 h-5 w-full rounded bg-white/10" />
                  <div className="mt-2 h-5 w-4/5 rounded bg-white/10" />
                  <div className="mt-4 h-5 w-24 rounded bg-white/10" />
                </div>
              ) : activeProject ? (
                <div className="mt-6">
                  {/* Image stays as a card; text is NOT inside a bordered/boxed card */}
                  <div className="h-56 w-full overflow-hidden rounded-xl shadow-[0px_4px_24px_rgba(0,0,0,0.18)] bg-black/10">
                    <img
                      src={
                        activeProject.cover_url ??
                        "https://via.placeholder.com/1200x675.png?text=Project+Cover"
                      }
                      alt={activeProject.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>

                  {/* Text below uses the section background (no card background/border) */}
                  <div className="mt-5">
                    <h3 className="text-[28px] leading-[1.2] font-semibold">
                      {activeProject.title}
                    </h3>

                    {activeProject.summary && (
                      <p className="mt-3 text-[14px] leading-relaxed text-white/90">
                        {activeProject.summary}
                      </p>
                    )}

                    <div className="mt-4">
                      <Link
                        to={`/projects/${activeProject.id}`}
                        className="text-[16px] underline underline-offset-4"
                      >
                        Read More
                      </Link>
                    </div>

                    <div className="mt-5">
                      <Link to="/projects">
                        <Button className="bg-black text-white hover:bg-black/90">
                          View all projects
                        </Button>
                      </Link>
                    </div>

                    {/* Optional tiny counter (remove if you don’t want it) */}
                    <div className="mt-4 text-center text-[12px] text-white/70">
                      {projects.length > 1
                        ? `${projectIndex + 1} / ${projects.length}`
                        : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-xl bg-white/10 p-6 text-sm text-white/90">
                  No projects to show yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Light blue wave into FAQ section */}
        <Wave
          className="absolute -bottom-1 left-0 w-full"
          fill="#9AE4FF"
          flip={false}
        />
      </section>

      {/* FAQ (light blue like Figma) */}
      <section className="bg-[#9AE4FF] px-6 pt-16 pb-16">
        <div className="mx-auto max-w-md">
          <div className="flex justify-center">
            <div className="rounded bg-black px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-white shadow">
              FREQUENTLY ASKED QUESTIONS
            </div>
          </div>

          <div className="mt-10">
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((q, i) => (
                <AccordionItem
                  key={i}
                  value={`q-${i}`}
                  className="rounded-[10px] border border-black bg-white"
                >
                  <AccordionTrigger className="px-4 py-3 text-left text-[14px] font-medium text-black">
                    {q.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-[13px] text-black/70">
                    {q.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Keep your existing footer component */}
      <Footer />

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        role="user"
      />

      {/* Scroll-to-top button (shows from Poll section onwards) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Scroll to top"
          type="button"
        >
          <ChevronUp className="w-6 h-6 text-black" />
        </button>
      )}
    </div>
  );
}

/* ---------- Components ---------- */

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
      viewBox="0 0 1440 180"
      preserveAspectRatio="none"
      style={{ transform: flip ? "scaleY(-1)" : undefined }}
      aria-hidden="true"
    >
      <path
        d="M0,25 C240,175 480,175 720,95 C960,15 1200,55 1440,135 L1440,180 L0,180 Z"
        fill={fill}
      />
    </svg>
  );
}

/* ---------- FAQ data ---------- */

const faqItems = [
  {
    q: "Lorem ipsum dolor sit amet?",
    a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras at fermentum orci.",
  },
  {
    q: "Consectetur adipiscing elit?",
    a: "Suspendisse varius enim in eros elementum tristique. Vestibulum ante ipsum primis.",
  },
  {
    q: "Ut massa mi, aliquam?",
    a: "Ut et massa mi. Aliquam in hendrerit urna. Pellentesque sit amet sapien fringilla, mattis ligula consectetur.",
  },
  {
    q: "Lorem ipsum dolor sit amet?",
    a: "Curabitur nec velit pulvinar, bibendum ante vitae, accumsan sem.",
  },
  {
    q: "Lorem ipsum dolor sit amet?",
    a: "Integer non nisi quis elit. Morbi ac tincidunt risus.",
  },
  {
    q: "Lorem ipsum dolor sit amet?",
    a: "Aliquam bibendum aliquam massa, a porttitor massa dapibus id.",
  },
];
