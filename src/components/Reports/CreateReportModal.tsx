// src/components/reports/CreateReportModal.tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MODAL_POSITION_CLASSES } from "@/components/ui/modalPosition";

/* ---------- Types ---------- */
type ReportStatus = "new" | "working" | "solved";

export type Report = {
  id: string;
  title: string;
  description?: string;
  created_at: string; // ISO
  status: ReportStatus;
  location: { lat: number; lng: number };
  address?: string;
  user?: { name: string };
  image_url?: string | null;
};

type CreateInput = {
  title: string;
  description?: string;
  location: { lat: number; lng: number };
  address?: string;
  user?: { name: string };
  image?: File | null;
};

type CreateReportModalProps = {
  open: boolean;
  onClose: () => void;
  latLng: { lat: number; lng: number } | null;
  /** Called after a report is successfully created */
  onCreated: (report: Report) => void;
  /**
   * Optional: provide your own creator.
   * If omitted, a local mock will be used (generates an object URL for the image).
   */
  createReport?: (data: CreateInput) => Promise<Report>;
};

/* ---------- Reverse geocode helper ---------- */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.display_name as string) ?? null;
  } catch {
    return null;
  }
}

/* ---------- Component ---------- */
export default function CreateReportModal({
  open,
  onClose,
  latLng,
  onCreated,
  createReport,
}: CreateReportModalProps) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDesc("");
      setImage(null);
      setPreview(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const submit = async () => {
    if (!latLng) return;
    if (!title.trim()) {
      alert("Please provide a report title.");
      return;
    }

    setSaving(true);
    try {
      // 1) Look up a human-readable address
      const addr = await reverseGeocode(latLng.lat, latLng.lng);

      // 2) If a creator was provided, use it; otherwise mock locally
      let created: Report;
      if (createReport) {
        created = await createReport({
          title: title.trim(),
          description: desc.trim(),
          location: latLng,
          address: addr ?? undefined,
          user: { name: "You" },
          image,
        });
      } else {
        const image_url = image ? URL.createObjectURL(image) : null;
        created = {
          id: String(Date.now()),
          title: title.trim(),
          description: desc.trim(),
          created_at: new Date().toISOString(),
          status: "new",
          location: latLng,
          address: addr ?? undefined,
          user: { name: "You" },
          image_url,
        };
      }

      onCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent
        className={`
          ${MODAL_POSITION_CLASSES}
          w-[360px] sm:w-[420px] max-w-none
          bg-white border rounded-xl shadow-2xl
          p-0
        `}
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-base sm:text-lg">New report</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {latLng
              ? `Clicked at: ${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`
              : "Pick a location on the map."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 p-5 pt-3">
          <label className="text-sm">
            Title
            <input
              className="mt-1 w-full border rounded p-2"
              placeholder="e.g., Flooded street, broken signage"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="text-sm">
            Description (optional)
            <textarea
              className="mt-1 w-full border rounded p-2 min-h-[100px]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe what happened…"
            />
          </label>

          <label className="text-sm">
            Photo (optional)
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full border rounded p-2"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImage(file || null);
                const next = file ? URL.createObjectURL(file) : null;
                if (preview) URL.revokeObjectURL(preview);
                setPreview(next);
              }}
            />
          </label>

          {preview && (
            <div className="rounded border p-2">
              <img src={preview} alt="Preview" className="w-full h-auto rounded" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !latLng}>
            {saving ? "Submitting…" : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
