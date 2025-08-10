// src/components/reports/CreateReportModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MODAL_POSITION_CLASSES } from "@/components/ui/modalPosition";
// ...other imports

export default function CreateReportModal({ open, onClose /* ... */ }) {
  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className={MODAL_POSITION_CLASSES}>
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-base sm:text-lg">New report</DialogTitle>
        </DialogHeader>
        {/* ...rest of your form */}
      </DialogContent>
    </Dialog>
  );
}
