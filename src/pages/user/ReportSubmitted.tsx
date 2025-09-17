import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * Simple success screen:
 * Reads ?ref=XXXXXX and shows it, then “Okay” → back to list.
 */
export default function ReportSubmitted() {
  const nav = useNavigate();
  const { search } = useLocation();
  const refNo = useMemo(() => new URLSearchParams(search).get("ref") ?? "—", [search]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold mb-6">Issue Reported</h1>

      {/* Cute placeholder illustration box (replace with your asset if you have one) */}
      <div className="w-56 h-40 mb-6 rounded-xl bg-orange-100 grid place-items-center">
        <span className="text-4xl">🎉</span>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Your Issue Reference No. is{" "}
        <span className="font-semibold text-rose-500">#{refNo}</span>.<br />
        We're sorry to hear about your experience.
      </p>

      <Button className="px-8" onClick={() => nav("/dashboard/report")}>
        Okay
      </Button>
    </div>
  );
}
