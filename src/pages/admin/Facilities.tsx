import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Plus,
  Trash2,
  Save,
  Clock,
} from "lucide-react";

// shadcn dialog
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Facility = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  facility_photos?: FacilityPhoto[];
  facility_hours?: FacilityHour[];
};

type FacilityPhoto = {
  id: string;
  facility_id: string;
  url: string;
  path: string | null;
  sort_order: number;
};

type FacilityHour = {
  facility_id: string;
  dow: number;              // 0=Sun ... 6=Sat
  open_time: string | null; // "HH:MM:SS" or null
  close_time: string | null;
};

const DOW_LABEL = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const;

function getManilaNow() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function isOpenNow(hours: FacilityHour[] | undefined): { open: boolean; today: string } {
  if (!hours || hours.length === 0) return { open: false, today: "Closed" };
  const manila = getManilaNow();
  const dow = manila.getDay();
  const h = hours.find((x) => x.dow === dow);
  if (!h || !h.open_time || !h.close_time) return { open: false, today: "Closed" };

  const [oh, om] = h.open_time.split(":").map(Number);
  const [ch, cm] = h.close_time.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const curMin = manila.getHours() * 60 + manila.getMinutes();

  const openNow =
    closeMin >= openMin ? curMin >= openMin && curMin < closeMin
                        : curMin >= openMin || curMin < closeMin;

  const label =
    h.open_time && h.close_time
      ? `${DOW_LABEL[dow]} · ${h.open_time.slice(0,5)}–${h.close_time.slice(0,5)}`
      : `${DOW_LABEL[dow]} · Closed`;

  return { open: openNow, today: label };
}

export default function AdminFacilities() {
  const [rows, setRows] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Editor state
  const [editing, setEditing] = useState<Facility | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState<FacilityHour[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  // --- NEW: local photo order state for drag&drop ---
  const [orderedPhotos, setOrderedPhotos] = useState<FacilityPhoto[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const photoIdsOriginal = useMemo(
    () => (editing?.facility_photos ?? []).slice().sort((a,b)=>a.sort_order-b.sort_order).map(p=>p.id).join(","),
    [editing]
  );
  const photoIdsCurrent = orderedPhotos.map(p=>p.id).join(",");
  const orderChanged = photoIdsCurrent !== photoIdsOriginal && orderedPhotos.length > 0;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id, name, description, is_active, created_at, updated_at,
          facility_photos:facility_photos(id, facility_id, url, path, sort_order),
          facility_hours:facility_hours(facility_id, dow, open_time, close_time)
        `)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as Facility[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  }

  function resetEditor(f?: Facility | null) {
    setEditing(f ?? null);
    setName(f?.name ?? "");
    setDescription(f?.description ?? "");

    const base: FacilityHour[] =
      f?.facility_hours && f.facility_hours.length
        ? f.facility_hours
        : Array.from({ length: 7 }, (_, dow) => ({
            facility_id: f?.id ?? "",
            dow,
            open_time: null,
            close_time: null,
          }));

    const map = new Map(base.map((x) => [x.dow, x]));
    const full = Array.from({ length: 7 }, (_, dow) => map.get(dow) ?? ({
      facility_id: f?.id ?? "",
      dow,
      open_time: null,
      close_time: null,
    }));
    setHours(full);
    setFiles([]);

    // NEW: init ordered photos from editing row
    const photos = (f?.facility_photos ?? []).slice().sort((a,b)=>a.sort_order-b.sort_order);
    setOrderedPhotos(photos);
    setDragIndex(null);
  }

  async function onCreate() {
    resetEditor(null);
    setEditing({} as any); // open modal
  }

  async function onEdit(f: Facility) {
    resetEditor(f);
  }

  function handleHourChange(dow: number, field: "open_time"|"close_time", value: string) {
    setHours((prev) =>
      prev.map((h) => (h.dow === dow ? { ...h, [field]: value || null } : h))
    );
  }

  async function saveFacility(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { alert("Name is required"); return; }
    if (files.length > 10) { alert("Max 10 images."); return; }

    setSaving(true);
    try {
      let facilityId = editing?.id ?? null;

      if (!facilityId) {
        const { data, error } = await supabase
          .from("facilities")
          .insert({ name, description: description || null })
          .select("id")
          .single();
        if (error) throw error;
        facilityId = data!.id as string;
      } else {
        const { error } = await supabase
          .from("facilities")
          .update({ name, description: description || null })
          .eq("id", facilityId);
        if (error) throw error;
      }

      const upserts = hours.map((h) => ({
        facility_id: facilityId!,
        dow: h.dow,
        open_time: h.open_time,
        close_time: h.close_time,
      }));
      const { error: hErr } = await supabase.from("facility_hours").upsert(upserts);
      if (hErr) throw hErr;

      // Upload new photos (if any)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${facilityId}/${Date.now()}-${i}.${ext}`;
        const up = await supabase.storage.from("facility-photos").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from("facility-photos").getPublicUrl(path);
        const url = pub?.publicUrl ?? null;
        if (!url) continue;
        const { error: pErr } = await supabase.from("facility_photos").insert({
          facility_id: facilityId,
          url,
          path,
          sort_order: i, // appended after existing
        });
        if (pErr) throw pErr;
      }

      await load();
      setEditing(null);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save facility.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(photo: FacilityPhoto) {
    if (!confirm("Remove this photo?")) return;
    try {
      const { error } = await supabase.from("facility_photos").delete().eq("id", photo.id);
      if (error) throw error;
      if (photo.path) {
        await supabase.storage.from("facility-photos").remove([photo.path]);
      }
      await load();
      if (editing) {
        const fresh = rows.find((r) => r.id === editing.id);
        if (fresh) resetEditor(fresh);
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete photo.");
    }
  }

  // --- NEW: drag & drop handlers for orderedPhotos ---
  function onDragStart(index: number) {
    setDragIndex(index);
  }
  function onDragEnter(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    setOrderedPhotos((prev) => {
      const arr = prev.slice();
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(index, 0, moved);
      setDragIndex(index);
      return arr;
    });
  }
  function onDragEnd() {
    setDragIndex(null);
  }

  async function savePhotoOrder() {
    if (!editing?.id) return;
    try {
      const p_ids = orderedPhotos.map((p) => p.id);
      const { error } = await supabase.rpc("facility_photos_reorder", {
        p_facility: editing.id,
        p_ids,
      });
      if (error) throw error;
      await load();
      const fresh = rows.find((r) => r.id === editing.id);
      if (fresh) resetEditor(fresh);
    } catch (e: any) {
      alert(e?.message ?? "Failed to save order.");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Facilities (Admin)</h1>
        <Button onClick={onCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Facility
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>All Facilities</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No facilities yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Today’s Hours</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => {
                  const { open, today } = isOpenNow(f.facility_hours);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell>
                        <Badge variant={open ? "default" : "secondary"}>
                          {open ? "Open" : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {today}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(f.facility_photos?.length ?? 0)} images
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(f.updated_at).toLocaleString("en-PH")}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => onEdit(f)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Editor */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Facility" : "New Facility"}</DialogTitle>
            <DialogDescription>
              Add details, set weekly hours, upload photos; drag photos to reorder.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveFacility} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Basics + Photos */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    className="mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Barangay Gym"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    className="mt-1"
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this facility…"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">New images (max 10)</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
                    />
                    <Badge variant="secondary">{files.length} to upload</Badge>
                  </div>

                  {/* Existing images with drag & drop */}
                  {orderedPhotos.length > 0 && (
                    <>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {orderedPhotos.map((p, idx) => (
                          <div
                            key={p.id}
                            className={`relative rounded border overflow-hidden bg-gray-50 ${
                              dragIndex === idx ? "opacity-70 ring-2 ring-sky-500" : ""
                            }`}
                            draggable
                            onDragStart={() => onDragStart(idx)}
                            onDragEnter={() => onDragEnter(idx)}
                            onDragEnd={onDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                            title="Drag to reorder"
                          >
                            <img
                              src={p.url}
                              alt=""
                              className="w-full h-28 object-cover"
                              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                            />
                            <div className="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
                              {idx + 1}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-1 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => removePhoto(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Tip: drag cards to change the display order.
                        </span>
                        <Button
                          type="button"
                          variant={orderChanged ? "default" : "outline"}
                          disabled={!orderChanged || !editing?.id}
                          onClick={savePhotoOrder}
                        >
                          {orderChanged ? "Save order" : "Order saved"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Weekly Hours */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Weekly Hours</label>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {hours.map((h) => (
                    <div key={h.dow} className="flex items-center gap-3 rounded border bg-white p-2">
                      <div className="w-12 shrink-0 text-sm font-medium">{DOW_LABEL[h.dow]}</div>
                      <Input
                        type="time"
                        value={h.open_time?.slice(0,5) ?? ""}
                        onChange={(e) => handleHourChange(h.dow, "open_time", e.target.value ? e.target.value + ":00" : "")}
                        className="w-28"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={h.close_time?.slice(0,5) ?? ""}
                        onChange={(e) => handleHourChange(h.dow, "close_time", e.target.value ? e.target.value + ":00" : "")}
                        className="w-28"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="ml-auto h-8 px-2 text-xs"
                        onClick={() => {
                          handleHourChange(h.dow, "open_time", "");
                          handleHourChange(h.dow, "close_time", "");
                        }}
                      >
                        Closed
                      </Button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Leave a day “Closed” by clearing both times. Overnight (e.g., 20:00–02:00) is supported.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
