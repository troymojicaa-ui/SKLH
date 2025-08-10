import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ReportStatus = "new" | "working" | "solved";

export type Report = {
  id: string;
  title: string;
  description?: string;
  created_at: string; // ISO
  status: ReportStatus;
  location: { lat: number; lng: number };
  images?: string[];
};

type ReportDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  report: Report | null;
  onMarkSolved?: (id: string) => void;
};

export default function ReportDetailsModal({
  open,
  onClose,
  report,
  onMarkSolved,
}: ReportDetailsModalProps) {
  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent
  className="
    report-details-modal
    fixed z-[10000] w-[360px] sm:w-[420px] max-w-none
    bg-white border rounded-xl shadow-2xl
    p-0
  "


        style={{
          transform: "translateY(-50%)", // only vertical centering
        }}
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-base sm:text-lg">{report.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Created: {new Date(report.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {report.description ? (
            <p className="text-sm leading-relaxed">{report.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No description provided.</p>
          )}

          <div className="text-sm">
            <span className="font-medium">Status:</span>{" "}
            <span className="capitalize">{report.status}</span>
          </div>

          {report.images?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {report.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Report image ${i + 1}`}
                  className="h-20 w-full object-cover rounded-md border"
                />
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {onMarkSolved && report.status !== "solved" ? (
              <Button onClick={() => onMarkSolved(report.id)}>Mark as solved</Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
