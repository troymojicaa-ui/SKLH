// src/context/AuthProvider.tsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "user";

type AuthCtx = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: Role;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  loading: true,
  session: null,
  user: null,
  role: "user",
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/* ===== Inactivity config ===== */
const INACTIVITY_MAX_MS = 15 * 60 * 1000; // 15 minutes
const INACTIVITY_POLL_MS = 30 * 1000;     // check every 30s
const LAST_ACTIVITY_KEY = "sklh:lastActivity";

/** Read a role from user metadata (fallback to "user"). Adjust if you store role differently. */
function inferRole(user: User | null): Role {
  const metaRole =
    (user?.app_metadata as any)?.role ??
    (user?.user_metadata as any)?.role ??
    (user as any)?.role;
  return metaRole === "admin" ? "admin" : "user";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("user");

  const pollTimer = useRef<number | null>(null);
  const bound = useRef(false);

  /* ---------- Init: get current session then subscribe ---------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        console.error("[Auth] getSession error:", error.message);
      }
      const s = data?.session ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      setRole(inferRole(s?.user ?? null));
      setLoading(false);
      if (s) touchActivityNow(); // seed activity when session exists
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setRole(inferRole(s?.user ?? null));
      // whenever auth changes, also mark activity
      if (s) touchActivityNow();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ---------- Inactivity tracker (Connect only) ---------- */
  useEffect(() => {
    // Only enforce inactivity for non-admin users
    const enforceInactivity = !!session && role !== "admin";

    // helper: compute ms since last activity (from localStorage, cross-tab)
    const msSinceLast = () => {
      const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
      const last = raw ? Number(raw) : 0;
      if (!last) return Number.POSITIVE_INFINITY;
      return Date.now() - last;
    };

    const maybeLogout = async () => {
      try {
        if (!enforceInactivity) return;
        if (msSinceLast() > INACTIVITY_MAX_MS) {
          console.info("[Auth] Inactivity exceeded; signing out.");
          await supabase.auth.signOut();
          // session will be cleared by onAuthStateChange listener
        }
      } catch (e) {
        console.error("[Auth] Inactivity signOut error:", e);
      }
    };

    const onAnyActivity = () => touchActivityNow();

    if (enforceInactivity && !bound.current) {
      // Track common user interactions
      const evs: (keyof WindowEventMap)[] = [
        "mousemove",
        "mousedown",
        "keydown",
        "scroll",
        "click",
        "touchstart",
        "visibilitychange",
      ];
      evs.forEach((e) => window.addEventListener(e, onAnyActivity, { passive: true }));
      // Cross-tab sync
      window.addEventListener("storage", (e) => {
        if (e.key === LAST_ACTIVITY_KEY) {
          // no-op; msSinceLast will pick it up on next poll
        }
      });
      bound.current = true;

      // Start polling
      pollTimer.current = window.setInterval(maybeLogout, INACTIVITY_POLL_MS);
    }

    // Cleanup when role changes, session ends, or unmount
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      if (bound.current) {
        bound.current = false;
        const evs: (keyof WindowEventMap)[] = [
          "mousemove",
          "mousedown",
          "keydown",
          "scroll",
          "click",
          "touchstart",
          "visibilitychange",
        ];
        evs.forEach((e) => window.removeEventListener(e, onAnyActivity));
      }
    };
  }, [session, role]);

  const value = useMemo<AuthCtx>(
    () => ({
      loading,
      session,
      user,
      role,
      signOut: async () => {
        await supabase.auth.signOut();
        // onAuthStateChange will update state
      },
    }),
    [loading, session, user, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ---------- Helpers ---------- */
function touchActivityNow() {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {}
}
