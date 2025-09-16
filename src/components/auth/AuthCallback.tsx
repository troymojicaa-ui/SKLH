import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const desc = params.get("error_description");
      const urlDest = params.get("dest");

      if (desc) {
        setError(desc);
        return;
      }
      if (!code) {
        setError("Missing auth code in URL.");
        return;
      }

      // Exchange magic link code for a session
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) {
        setError(exErr.message);
        return;
      }

      // Figure out where to send the user next
      let dest: "admin" | "connect" = (urlDest as any) || (localStorage.getItem("post_login_dest") as any);

      if (!dest) {
        // fallback: check profile role
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes?.user?.id;
        if (uid) {
          const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).single();
          const role = (prof?.role ?? "member").toString().toLowerCase();
          dest = role === "admin" ? "admin" : "connect";
        } else {
          dest = "connect";
        }
      }

      const path = dest === "admin" ? "/admin/app" : "/dashboard"; // <-- adjust path if your connect portal uses a different URL
      window.location.replace(path);
    })();
  }, []);

  return (
    <div className="mx-auto mt-24 max-w-md p-6 text-center">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <p className="flex items-center justify-center text-gray-700">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finishing sign-in…
        </p>
      )}
    </div>
  );
}
