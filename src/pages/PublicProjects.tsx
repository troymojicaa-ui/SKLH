import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";

import { useEvents } from "@/hooks/useEvents"; // Import your updated hook
import type { Project } from "../hooks/useEvents";

// type Project = {
//   id: string;
//   title: string;
//   summary: string | null;
//   cover_url: string | null;
// };

export default function PublicProjects() {
  // const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const { projects, isLoading, isError } = useEvents();

  // useEffect(() => {
  //   (async () => {
  //     setLoading(true);
  //     setErr(null);
  //     try {
  //       const { data, error } = await supabase
  //         .from("projects")
  //         .select("id,title,summary,cover_url")
  //         .eq("status", "published")
  //         .eq("visibility", "public")
  //         .order("created_at", { ascending: false });
  //       if (error) throw error;
  //       setRows((data ?? []) as Project[]);
  //     } catch (e: any) {
  //       setErr(e?.message ?? "Failed to load projects");
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, []);

  const publicRows = Array.isArray(projects) 
    ? projects.filter(p => p.visibility === 'public' && p.is_active)
    : [];

  return (
    <div className="mx-auto max-w-5xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Projects</h1>

      {isLoading ? (
        <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>
      ) : isError ? (
        <Card className="p-4 text-sm text-red-600">{err}</Card>
      ) : publicRows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No projects yet.</Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {publicRows.map((p) => (
            <Link to={`/projects/${p.id}`} key={p.id}>
              <Card className="overflow-hidden hover:shadow transition">
                {p.cover_image && (
                  <img
                    src={p.cover_image}
                    alt={p.title}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-4">
                  <div className="font-medium line-clamp-1">{p.title}</div>
                  {p.summary && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {p.summary}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
