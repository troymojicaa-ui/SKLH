// src/pages/user/UserDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, CalendarDays, Building2, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

type Prof = { full_name: string | null; avatar_url: string | null };

export default function UserDashboard() {
  const { session } = useAuth();
  const user = session?.user ?? null;

  const [profile, setProfile] = useState<Prof>({ full_name: "", avatar_url: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (!mounted) return;
        if (error) throw error;
        setProfile({
          full_name: data?.full_name ?? (user.user_metadata?.full_name || user.user_metadata?.name || ""),
          avatar_url: data?.avatar_url ?? null,
        });
      } catch {
        if (!mounted) return;
        setProfile({
          full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
          avatar_url: null,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const firstName = useMemo(() => {
    const n = (profile.full_name || "").trim();
    if (!n) return "";
    return n.split(/\s+/)[0];
  }, [profile.full_name]);

  return (
    <div
      className="
        relative
        h-[100dvh] md:min-h-[80vh]
        overflow-hidden md:overflow-visible
        rounded-none
      "
    >
      {/* Base soft gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-sky-50 to-sky-100" />
      {/* Subtle circle pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(2,132,199,0.08) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Gentle vignette for contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-sky-200/30 via-transparent to-transparent" />

      {/* Content layer */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-3 px-4">
          <Link to="/dashboard/profile" className="flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-full ring-2 ring-white/70 overflow-hidden bg-white grid place-items-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Your avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-6 w-6 text-slate-700" />
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-slate-600 text-xs">Signed in</p>
              <p className="text-slate-900 font-medium leading-tight truncate max-w-[16rem]">
                {profile.full_name || user?.email}
              </p>
            </div>
          </Link>
          <div className="text-slate-700 text-sm font-medium pr-[env(safe-area-inset-right)]">
            SK Loyola
          </div>
        </div>

        {/* Center hero copy */}
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <p className="text-slate-700 text-sm mb-1">
              {loading ? "…" : firstName ? `Hi, ${firstName} 👋` : "Welcome 👋"}
            </p>
            <h1 className="text-slate-900 text-3xl font-semibold tracking-tight">
              Welcome to <span className="text-sky-800">SK Loyola</span>
            </h1>
            <p className="mt-2 text-slate-700 text-sm">
              Submit issues, browse events and facilities — all in one place.
            </p>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {/* Primary CTA */}
          <Link
            to="/dashboard/report"
            className="
              w-full inline-flex items-center justify-center gap-2
              rounded-xl py-3
              bg-rose-600 text-white font-medium
              shadow-lg shadow-rose-900/10 border border-rose-600/10
              active:scale-[0.98] transition
            "
            aria-label="Report an Issue"
          >
            <Megaphone className="h-5 w-5" />
            Report an Issue
          </Link>

          {/* Quick links */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Link
              to="/dashboard/events"
              className="rounded-lg bg-white/90 backdrop-blur text-slate-800 flex flex-col items-center justify-center py-2.5 active:scale-95 transition shadow-sm"
            >
              <CalendarDays className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Events</span>
            </Link>
            <Link
              to="/dashboard/facilities"
              className="rounded-lg bg-white/90 backdrop-blur text-slate-800 flex flex-col items-center justify-center py-2.5 active:scale-95 transition shadow-sm"
            >
              <Building2 className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Facilities</span>
            </Link>
            <Link
              to="/dashboard/profile"
              className="rounded-lg bg-white/90 backdrop-blur text-slate-800 flex flex-col items-center justify-center py-2.5 active:scale-95 transition shadow-sm"
            >
              <UserRound className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Profile</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
