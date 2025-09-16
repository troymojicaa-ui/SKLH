import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Plus, Upload, Trash2, Save, Clock, Image as ImageIcon } from "lucide-react";

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
  // Current time in Asia/Manila
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function isOpenNow(hours: FacilityHour[] | undefined): { open: boolean; today: string } {
  if (!hours || hours.length === 0) return { open: false, today: "Closed" };
  const manila = getManilaNow();
  const dow = manila.getDay(); // 0=Sun
  const h = hours.find((x) => x.dow === dow);
  if (!h || !h.open_time || !h.close_time) return { open: false, today: "Closed" };

  const [oh, om] = h.open_time.split(":").map(Number);
  const [ch, cm] = h.close_time.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;

  const curMin = manila.getHours() * 60 + manila.getMinutes();

  // Support overnight: if close < open, treat as crossing midnight
  const openNow =
    closeMin >= openMin
      ? curMin >= openMin && curMin < closeMin
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
    // Ensure all dows exist
    const map = new Map(base.map((x) => [x.dow, x]));
    const full = Array.from({ length: 7 }, (_, dow) => map.get(dow) ?? ({
      facility_id: f?.id ?? "",
      dow,
      open_time: null,
      close_time: null,
    }));
    setHours(full);
    setFiles([]);
  }

  async function onCreate() {
    resetEditor(null);
    setEditing({} as any); // open editor
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
        // Create facility
        const { data, error } = await supabase
          .from("facilities")
          .insert({ name, description: description || null })
          .select("id")
          .single();
        if (error) throw error;
        facilityId = data!.id as string;
      } else {
        // Update facility
        const { error } = await supabase
          .from("facilities")
          .update({ name, description: description || null })
          .eq("id", facilityId);
        if (error) throw error;
      }

      // Upsert 7 rows of hours
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
          sort_order: i,
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
      // Delete DB row first (RLS admin-only)
      const { error } = await supabase.from("facility_photos").delete().eq("id", photo.id);
      if (error) throw error;
      // Then storage (best effort)
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

      {/* Editor */}
      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editing?.id ? "Edit Facility" : "New Facility"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveFacility} className="space-y-5">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  className="mt-1"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this facility…"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Weekly Hours</label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hours.map((h) => (
                    <div key={h.dow} className="flex items-center gap-3">
                      <div className="w-16 text-sm">{DOW_LABEL[h.dow]}</div>
                      <Input
                        type="time"
                        value={h.open_time?.slice(0,5) ?? ""}
                        onChange={(e) => handleHourChange(h.dow, "open_time", e.target.value ? e.target.value + ":00" : "")}
                      />
                      <span className="text-sm">to</span>
                      <Input
                        type="time"
                        value={h.close_time?.slice(0,5) ?? ""}
                        onChange={(e) => handleHourChange(h.dow, "close_time", e.target.value ? e.target.value + ":00" : "")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => handleHourChange(h.dow, "open_time", "") || handleHourChange(h.dow, "close_time", "")}
                      >
                        Closed
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Leave a day “Closed” by clearing both times. Overnight (e.g., 20:00–02:00) is supported.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Images (max 10)</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))}
                  />
                  <Badge variant="secondary">
                    {files.length} to upload
                  </Badge>
                </div>

                {/* Existing images */}
                {editing?.facility_photos && editing.facility_photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {editing.facility_photos
                      .sort((a,b) => a.sort_order - b.sort_order)
                      .map((p) => (
                        <div key={p.id} className="relative rounded border overflow-hidden">
                          <img
                            src={p.url}
                            alt=""
                            className="w-full h-32 object-cover bg-gray-50"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                          />
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
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
