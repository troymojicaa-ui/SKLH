// src/pages/DebugAuth.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugAuth() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const sessionRes = await supabase.auth.getSession();
      const userRes = await supabase.auth.getUser();
      const ls: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith("sb-")) ls[k] = localStorage.getItem(k) || "";
      }
      setInfo({ sessionRes, userRes, localStorage: ls });
      console.log("[DebugAuth]", { sessionRes, userRes, localStorage: ls });
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Auth Debug</h2>
      <pre>{JSON.stringify(info, null, 2)}</pre>
      <button onClick={() => { localStorage.clear(); location.reload(); }}>
        Clear localStorage & reload
      </button>
    </div>
  );
}
