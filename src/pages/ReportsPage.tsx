// src/pages/ReportsPage.tsx
import { useState } from "react";
import ReportDetailsModal, { Report } from "@/components/reports/ReportDetailsModal";
// import CreateReportModal from "@/components/reports/CreateReportModal";

export default function ReportsPage() {
  const [selected, setSelected] = useState<Report | null>(null);
  const [openDetails, setOpenDetails] = useState(false);

  const reports: Report[] = []; // your data

  return (
    <div className="p-4">
      {/* your list/map */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              setSelected(r);
              setOpenDetails(true);
            }}
            className="text-left border rounded-lg p-3 hover:shadow-sm"
          >
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
          </button>
        ))}
      </div>

      <ReportDetailsModal
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        report={selected}
        onMarkSolved={(id) => {
          // your solve logic
          setOpenDetails(false);
        }}
      />
    </div>
  );
}
