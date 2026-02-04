import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { refFromId } from "@/lib/refCode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useReports } from "@/hooks/useReports"; // Your TanStack CRUD hook

type Row = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  photo_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export default function ReportDetail() {
  // const { id } = useParams<{ id: string }>();
  // const [row, setRow] = useState<Row | null>(null);
  // const [loading, setLoading] = useState(true);

  const { id } = useParams<{ id: string }>();

  // 1. Pass the 'id' to your hook to fetch the specific report
  // TanStack handles the fetch, loading state, and error logic
  const { reports: row, isLoading, isError } = useReports(id);

  // useEffect(() => {
  //   let ignore = false;
  //   async function load() {
  //     if (!id) return;
  //     setLoading(true);
  //     const { data, error } = await supabase
  //       .from("reports")
  //       .select("id,title,description,status,photo_url,address,lat,lng,created_at")
  //       .eq("id", id)
  //       .single();
  //     if (!ignore) {
  //       setRow(error ? null : data);
  //       setLoading(false);
  //     }
  //   }
  //   load();
  //   return () => {
  //     ignore = true;
  //   };
  // }, [id]);

  // if (loading) {
  //   return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  // }

  if (isError || !row) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-600">Report not found.</p>
        <Button asChild className="mt-3">
          <Link to="/dashboard/report">Back to Reports</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{row.title}</h1>
          <div className="text-xs text-slate-500">
            Ref. #{refFromId(row.id)} • {new Date(row.created_at).toLocaleString()}
          </div>
        </div>
        <Badge variant="secondary">{row.status}</Badge>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          {row.attachment_url ? (
            <img
              src={row.attachment_url}
              alt="Report"
              className="mb-3 h-56 w-full rounded-md object-cover"
            />
          ) : null}

          {row.description ? (
            <p className="whitespace-pre-wrap text-sm text-slate-700">{row.description}</p>
          ) : (
            <p className="text-sm text-slate-500">No description provided.</p>
          )}

          <div className="mt-4 text-sm">
            <div>
              <span className="font-medium">Address: </span>
              {row.address ?? "—"}
            </div>
            <div>
              <span className="font-medium">Coordinates: </span>
              {row.lat != null && row.lng != null ? `${row.lat}, ${row.lng}` : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button asChild>
        <Link to="/dashboard/report">Back to Reports</Link>
      </Button>
    </div>
  );
}
