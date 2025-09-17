import { useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ReportSuccess() {
  const q = useQuery();
  const ref = q.get("ref");

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
      <h1 className="mt-3 text-xl font-semibold">Report Submitted</h1>
      <p className="mt-1 text-sm text-slate-600">
        Thanks for reporting. Your Issue Reference Number is{" "}
        <span className="font-semibold">#{ref ?? "—"}</span>.
      </p>

      <div className="mt-6 grid gap-3">
        <Button asChild>
          <Link to="/dashboard/report">Back to Reports</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
