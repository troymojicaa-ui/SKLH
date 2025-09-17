import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { refFromId } from "@/lib/refCode";

type ReportRow = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "resolved" | string;
  photo_url: string | null;
  created_at: string;
};

export default function UserRAI() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("reports")
        .select("id, title, description, status, photo_url, created_at")
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (error) {
          setRows([]);
        } else {
          setRows(data ?? []);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reported Incidents</h1>
        <Link to="/dashboard/report/new" className="text-sm font-medium text-sky-700 hover:underline">
          + New Report
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No reports yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {rows.map((r) => (
            <AccordionItem
              key={r.id}
              value={r.id}
              className="focus-within:outline-none focus-within:ring-0 focus-visible:outline-none focus-visible:ring-0"
            >
              <AccordionTrigger className="text-left focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="truncate">
                    <div className="font-medium truncate">{r.title}</div>
                    <div className="text-xs text-slate-500">
                      Ref. #{refFromId(r.id)} • {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {r.status}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {/* Keep your carousel/gallery here if you have one */}
                {r.photo_url ? (
                  <div className="mb-2">
                    <img
                      src={r.photo_url}
                      alt="Report"
                      className="h-40 w-full rounded-md object-cover"
                    />
                  </div>
                ) : null}

                {r.description && (
                  <p className="mb-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {r.description}
                  </p>
                )}

                {/* Ref + View Details row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-500">
                    Issue Ref. No. #{refFromId(r.id)}
                  </div>
                  <Link
                    to={`/dashboard/report/${r.id}`}
                    className="text-xs font-medium text-sky-700 hover:underline"
                  >
                    View Details
                  </Link>
                </div>

                {/* Keep your existing “Edit once” / actions below if you have them */}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
