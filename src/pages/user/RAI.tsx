// src/pages/user/RAI.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthProvider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { format } from "date-fns";
import { ImageIcon, MapPin, ShieldAlert } from "lucide-react";

/* 🗺️ Mini map deps */
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { Map as LeafletMap } from "leaflet";

/* ---------------- Types (match DB) ---------------- */
type ReportStatus = "pending" | "reviewed" | "resolved";

type Report = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ReportStatus;
  edited: boolean;
  created_at: string; // ISO
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  address?: string | null;
};

/* ---------- Small status pill ---------- */
function StatusBadge({ status }: { status: ReportStatus }) {
  const style =
    status === "pending"
      ? "bg-blue-100 text-blue-700"
      : status === "reviewed"
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700";
  const label =
    status === "pending" ? "Pending" : status === "reviewed" ? "Reviewed" : "Resolved";
  return <span className={`px-2 py-0.5 rounded text-[11px] ${style}`}>{label}</span>;
}

/* ---------- Edit-once dialog ---------- */
function EditOnceDialog({
  open,
  onOpenChange,
  report,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  report: Report | null;
  onSave: (title: string, description: string) => void;
  saving?: boolean;
}) {
  const [title, setTitle] = useState(report?.title ?? "");
  const [description, setDescription] = useState(report?.description ?? "");
  useEffect(() => {
    setTitle(report?.title ?? "");
    setDescription(report?.description ?? "");
  }, [report]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit report (you can do this once)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={5}
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button onClick={() => onSave(title, description)} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Swipeable carousel (scroll-snap) ---------- */
function SwipeCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);
  const slides = React.Children.toArray(children);
  const count = slides.length;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIdx(i);
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth rounded border bg-white
                   [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {slides.map((child, i) => (
          <div key={i} className="snap-start shrink-0 w-full">
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
          {slides.map((_, i) => (
            <span
              key={i}
              className={
                "rounded-full transition-all " +
                (i === idx ? "w-4 h-1.5 bg-black/70" : "w-1.5 h-1.5 bg-black/40")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Mini map (NON-interactive preview) ---------- */
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MiniMap({
  lat,
  lng,
  address,
  height = 280,
}: {
  lat: number;
  lng: number;
  address?: string | null;
  height?: number;
}) {
  const mapRef = useRef<LeafletMap | null>(null);

  // Ensure tiles lay out correctly when shown in a carousel
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded" style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{
          height: "100%",
          width: "100%",
          pointerEvents: "none", // 🔒 do not capture swipes or touches
        }}
        whenCreated={(m) => {
          mapRef.current = m;
          // Disable everything just in case
          m.dragging.disable();
          // @ts-ignore
          m.touchZoom.disable();
          m.scrollWheelZoom.disable();
          m.doubleClickZoom.disable();
          m.boxZoom.disable();
          m.keyboard.disable();
        }}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon}>
          <Popup>{address ?? `${lat.toFixed(3)}, ${lng.toFixed(3)}`}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

/* ------------------ Page ------------------ */
export default function RAI() {
  const { session } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [editing, setEditing] = useState<Report | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadReports() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id,user_id,title,description,status,edited,created_at,lat,lng,photo_url,address"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReports((data ?? []) as Report[]);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("reports-rt-connect")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => loadReports()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === (hoverId ?? expandedId)) ?? null,
    [reports, expandedId, hoverId]
  );

  async function saveEditOnce(title: string, description: string) {
    if (!session || !editing) return;
    setSavingEdit(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .update({
          title,
          description: description || null,
          edited: true,
        })
        .eq("id", editing.id)
        .eq("user_id", session.user.id)
        .eq("edited", false)
        .select(
          "id,user_id,title,description,status,edited,created_at,lat,lng,photo_url,address"
        )
        .single();

      if (error) throw error;
      setReports((prev) => prev.map((r) => (r.id === editing.id ? (data as Report) : r)));
      setEditing(null);
    } catch (e: any) {
      alert(e?.message ?? "Failed to update. You might have already used your one edit.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="relative mx-auto max-w-2xl p-4">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Badge variant="secondary" className="uppercase">
          {reports.length} total
        </Badge>
      </header>

      {/* List */}
      {loading ? (
        <Card className="p-4 text-sm text-muted-foreground">Loading reports…</Card>
      ) : errorMsg ? (
        <Card className="p-4 text-sm text-red-600">{errorMsg}</Card>
      ) : reports.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No reports yet. Tap the red button below to create one.
        </Card>
      ) : (
        <Accordion
          type="single"
          collapsible
          value={expandedId ?? ""}
          onValueChange={(v) => setExpandedId(v || null)}
          className="space-y-3"
        >
          {reports.map((r) => {
            const active = r.id === (hoverId ?? expandedId);
            const isOwner = session?.user.id === r.user_id;
            const locationDisplay =
              r.address ??
              (r.lat != null && r.lng != null
                ? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`
                : "No location");

            return (
              <AccordionItem
                key={r.id}
                value={r.id}
                className={`rounded-xl border bg-white overflow-hidden ${
                  active ? "ring-2 ring-primary/40" : ""
                }`}
              >
                <AccordionTrigger
                  className="px-4 py-3 hover:no-underline"
                  onMouseEnter={() => setHoverId(r.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  <div className="flex w-full items-center gap-3 text-left">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        r.status === "pending"
                          ? "bg-blue-500"
                          : r.status === "reviewed"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1" title={locationDisplay}>
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[40ch]">{locationDisplay}</span>
                        </span>
                        <span>•</span>
                        <span>{format(new Date(r.created_at), "PPp")}</span>
                        {r.edited && (
                          <>
                            <span>•</span>
                            <span>edited</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span>
                      <StatusBadge status={r.status} />
                    </span>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4 pt-1">
                  <div className="space-y-4">
                    {r.description ? (
                      <p className="text-sm leading-relaxed">{r.description}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        No description provided.
                      </p>
                    )}

                    {/* 🖼️⬅️ swipe ➡️🗺️  */}
                    {(r.photo_url || (r.lat != null && r.lng != null)) ? (
                      <SwipeCarousel>
                        {/* Slide 1: Photo (if any) */}
                        {r.photo_url && (
                          <div className="w-full h-[280px] rounded overflow-hidden bg-black/5">
                            <img
                              src={r.photo_url}
                              alt={r.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                        )}
                        {/* Slide 2: Map (read-only preview) */}
                        {r.lat != null && r.lng != null && (
                          <MiniMap lat={r.lat} lng={r.lng} address={r.address} height={280} />
                        )}
                      </SwipeCarousel>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        No photo or location.
                      </div>
                    )}

                    {/* Owner: edit once */}
                    <div className="flex gap-2">
                      {isOwner && !r.edited && (
                        <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                          Edit once
                        </Button>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Spacer so last item isn't covered by FAB */}
      <div className="h-24" />

      {/* Floating create button */}
      <Link
        to="/dashboard/report/new"
        className="
          fixed left-1/2 -translate-x-1/2 bottom-6 z-40
          inline-flex h-14 w-14 items-center justify-center
          rounded-full bg-rose-600 text-white shadow-lg
          hover:bg-rose-700 active:scale-95 transition
        "
        aria-label="Report an Incident"
      >
        <ShieldAlert className="h-6 w-6" />
      </Link>

      {/* Edit dialog */}
      <EditOnceDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditing(null)}
        report={editing}
        onSave={saveEditOnce}
        saving={savingEdit}
      />
    </div>
  );
}
