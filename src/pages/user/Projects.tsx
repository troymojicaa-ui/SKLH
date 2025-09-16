
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { format } from "date-fns";

type Project = {
  id: string;
  title: string;
  summary: string | null;
  cover_url: string | null;
  status: "draft" | "published" | "archived";
  start_date: string | null; // yyyy-mm-dd
  end_date: string | null;   // yyyy-mm-dd
  created_at: string;
};

export default function UserProjects() {
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,summary,cover_url,status,start_date,end_date,created_at")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as Project[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>
      ) : err ? (
        <Card className="p-4 text-sm text-red-600">{err}</Card>
      ) : rows.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No published projects yet.</Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {rows.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              {p.cover_url && (
                <img
                  src={p.cover_url}
                  alt={p.title}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium line-clamp-1">{p.title}</h3>
                  <Badge variant="secondary">project</Badge>
                </div>
                {p.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {p.summary}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {p.start_date
                    ? `${format(new Date(p.start_date), "PP")}${
                        p.end_date ? " – " + format(new Date(p.end_date), "PP") : ""
                      }`
                    : ""}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
