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
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refFromId } from "@/lib/refCode";

import { useReports } from "@/hooks/useReports"; // Your new CRUD hook

type ReportRow = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "resolved" | string;
  attachment_url: string | null;
  created_at: string;
};

export default function UserRAI() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // const [rows, setRows] = useState<ReportRow[]>([]);
  // const [loading, setLoading] = useState(true);

  // 1. Use the TanStack-powered hook instead of useEffect/useState
  const { reports, isLoading } = useReports();

  // 2. Map the data safely (TanStack returns 'data', we named it 'reports' in the hook)
  const rows: ReportRow[] = reports ?? [];

  // useEffect(() => {
  //   let ignore = false;

  //   async function load() {
  //     setLoading(true);

  //     const { data, error } = await supabase
  //       .from("reports")
  //       .select("id, title, description, status, photo_url, created_at")
  //       .order("created_at", { ascending: false });

  //     if (!ignore) {
  //       if (error) {
  //         setRows([]);
  //       } else {
  //         setRows(data ?? []);
  //       }
  //       setLoading(false);
  //     }
  //   }

  //   load();
  //   return () => {
  //     ignore = true;
  //   };
  // }, [user?.id]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ✅ NEW STICKY TOP PART (matches your 2nd screenshot) */}
      {/* Mobile header is fixed at ~56px in UserLayout, so we stick below it */}
      <div className="sticky top-[56px] md:top-0 z-30 bg-white/95 backdrop-blur border-b">
        <div className="mx-auto w-full max-w-md px-4 pt-3 pb-4">
          {/* Back to Home */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </button>

          {/* Title */}
          <h1 className="mt-3 text-center text-[28px] font-semibold tracking-tight text-slate-900">
            Reported Issues
          </h1>

          {/* Sticky button */}
          <div className="mt-4 flex justify-center">
            <Button
              onClick={() => navigate("/dashboard/report/new")}
              className="w-full max-w-[420px] h-12 rounded-xl bg-sky-900 hover:bg-sky-950 text-white shadow-md"
            >
              Submit A Report
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ CONTENT BELOW (your existing list stays the same) */}
      <div className="mx-auto w-full max-w-md px-4 pb-10 pt-4">
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
                        Ref. #{refFromId(r.id)} •{" "}
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {r.status}
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  {r.attachment_url ? (
                    <div className="mb-2">
                      <img
                        src={r.attachment_url}
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
