// src/pages/AuthCallback.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

type Portal = "admin" | "connect";
type Role = "admin" | "user";

export default function AuthCallback() {
  const [status, setStatus] = useState<"checking" | "ok" | "mismatch" | "error">("checking");
  const [role, setRole] = useState<Role | null>(null);
  const [intended, setIntended] = useState<Portal | null>(null);

  const getDestForRole = (r: Role) => (r === "admin" ? "/admin/app" : "/connect/app");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const destParam = (params.get("dest") as Portal | null) ?? null;
        const ls = (localStorage.getItem("post_login_dest") as Portal | null) ?? null;
        const intendedPortal = destParam ?? ls ?? "connect";
        setIntended(intendedPortal);

        const { data: sdata } = await supabase.auth.getSession();
        const uid = sdata.session?.user?.id;
        if (!uid) {
          setStatus("error");
          return;
        }
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();
        if (error) {
          setStatus("error");
          return;
        }
        const r = (profile?.role ?? "user") as Role;
        setRole(r);

        const portalFromRole: Portal = r === "admin" ? "admin" : "connect";
        if (portalFromRole !== intendedPortal) {
          setStatus("mismatch");
          return;
        }

        setStatus("ok");
        window.location.replace(getDestForRole(r));
      } catch {
        setStatus("error");
      } finally {
        localStorage.removeItem("post_login_dest");
      }
    };
    run();
  }, []);

  if (status === "checking") return null;

  if (status === "mismatch") {
    const correctDest = role ? (role === "admin" ? "/admin/app" : "/connect/app") : "/";
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 space-y-4">
          <h1 className="text-lg font-semibold">Wrong portal</h1>
          <p className="text-sm text-muted-foreground">
            This account is {role === "admin" ? "an admin" : "a user"} but you opened the{" "}
            {intended === "admin" ? "SK Command" : "SK Connect"} link.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.replace(correctDest)}>Continue to the correct app</Button>
            <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); window.location.replace("/"); }}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 space-y-4">
          <h1 className="text-lg font-semibold">Sign-in error</h1>
          <p className="text-sm text-muted-foreground">We couldn’t verify your session. Please try again.</p>
          <Button onClick={() => window.location.replace("/")}>Back to home</Button>
        </div>
      </div>
    );
  }

  return null;
}
