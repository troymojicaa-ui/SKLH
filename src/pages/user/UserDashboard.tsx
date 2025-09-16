import { Link } from "react-router-dom";
import { CalendarDays, FileText, ChevronRight } from "lucide-react";
import { projectMock } from "@/data/projectMock";

/**
 * Mobile "app-like" dashboard:
 * - no vertical scroll
 * - top content = two horizontal carousels (events, projects)
 * - FAB (RAI) stuck to bottom middle
 *
 * Desktop still shows some spacing and allows scroll (md:*)
 */
export default function UserDashboard() {
  // Use your mock data as upcoming items (replace with API later)
  const events = projectMock.slice(0, 6);
  const projects = projectMock.slice(3, 9);

  return (
    <div className="
      relative
      h-[100dvh] md:h-auto
      overflow-hidden md:overflow-visible
      bg-white
      rounded-none
    ">
      {/* Header copy (mobile) */}
      <div className="px-4 pt-2 pb-3 md:hidden">
        <h1 className="text-xl font-semibold">Welcome to SK Connect</h1>
        <p className="text-sm text-muted-foreground">
          Quick look at what’s coming up.
        </p>
      </div>

      {/* CONTENT: fixed-height area with 2 horizontal rails */}
      <div className="flex flex-col gap-6 px-4 md:px-0 md:pb-10">

        {/* Upcoming Events */}
        <section aria-label="Upcoming events">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-sky-700" />
              <h2 className="text-base font-semibold">Upcoming Events</h2>
            </div>
            <Link
              to="/dashboard/projects"
              className="text-sm text-sky-700 hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* horizontal carousel */}
          <div
            className="
              flex gap-4 overflow-x-auto snap-x snap-mandatory
              pb-2 -mx-4 px-4
            "
          >
            {events.map((ev) => (
              <button
                key={ev.id}
                onClick={() => (window.location.href = "/dashboard/projects")}
                className="
                  min-w-[240px] max-w-[240px]
                  snap-start
                  rounded-xl bg-gray-100 overflow-hidden
                  shadow-sm hover:shadow
                  text-left
                "
              >
                <div className="h-36 w-full bg-gray-200">
                  <img
                    src={ev.image || "https://via.placeholder.com/640x360"}
                    alt={ev.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(ev.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm font-medium line-clamp-2">{ev.title}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Upcoming Projects */}
        <section aria-label="Upcoming projects">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-sky-700" />
              <h2 className="text-base font-semibold">Upcoming Projects</h2>
            </div>
            <Link
              to="/dashboard/projects"
              className="text-sm text-sky-700 hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* horizontal carousel */}
          <div
            className="
              flex gap-4 overflow-x-auto snap-x snap-mandatory
              pb-2 -mx-4 px-4
            "
          >
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => (window.location.href = "/dashboard/projects")}
                className="
                  min-w-[240px] max-w-[240px]
                  snap-start
                  rounded-xl bg-gray-100 overflow-hidden
                  shadow-sm hover:shadow
                  text-left
                "
              >
                <div className="h-36 w-full bg-gray-200">
                  <img
                    src={p.image || "https://via.placeholder.com/640x360"}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(p.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* FAB — RAI / Report (bottom center) */}
      <div className="
        fixed md:absolute
        bottom-5 left-1/2 -translate-x-1/2
        z-50
      ">
        <Link
          to="/dashboard/report"
          className="
            inline-flex items-center justify-center
            h-14 w-14 rounded-full
            bg-rose-600 text-white shadow-lg
            active:scale-95 transition
            border border-white
          "
          aria-label="Open Reports / RAI"
        >
          RAI
        </Link>
      </div>
    </div>
  );
}
