// src/pages/admin/Reports.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import { format } from "date-fns";
import {
  CheckCircle2,
  Check,
  MapPin,
  RefreshCcw,
  Filter,
  Rows,
  Table as TableIcon,
} from "lucide-react";

/* ---------- Types (match DB) ---------- */
type ReportStatus = "pending" | "reviewed" | "resolved";

type Report = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;           // ISO
  status: ReportStatus;
  edited: boolean;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  address?: string | null;      // 👈 used for human-readable location
};

/* ---------- Map helpers ---------- */
const LOYOLA_CENTER: LatLngExpression = [14.6415, 121.0745];
const DEFAULT_ZOOM = 15;

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const BlueIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
const OrangeIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
const GreenIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function iconFor(r: Report, selected: boolean) {
  if (selected) return BlueIcon;
  if (r.status === "reviewed") return OrangeIcon;
  if (r.status === "resolved") return GreenIcon;
  return DefaultIcon; // pending
}

function FlyTo({ center }: { center: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, DEFAULT_ZOOM, { duration: 0.5 });
  }, [center, map]);
  return null;
}

/* ---------- UI bits ---------- */
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

function StatusSelect({
  value,
  onChange,
}: {
  value: ReportStatus;
  onChange: (v: ReportStatus) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ReportStatus)}>
      <SelectTrigger className="w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="reviewed">Reviewed</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
      </SelectContent>
    </Select>
  );
}

/* ---------- Page ---------- */
export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filters + view mode
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [view, setView] = useState<"listmap" | "table">("listmap");

  // list/map state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id,user_id,title,description,created_at,status,edited,lat,lng,photo_url,address"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReports((data ?? []) as Report[]);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Optional realtime refresh
  useEffect(() => {
    const ch = supabase
      .channel("admin-reports-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return reports.filter((r) => {
      const passStatus = statusFilter === "all" ? true : r.status === statusFilter;
      const passQ =
        !term ||
        r.title.toLowerCase().includes(term) ||
        (r.description ?? "").toLowerCase().includes(term);
      return passStatus && passQ;
    });
  }, [reports, q, statusFilter]);

  const selectedReport = useMemo(
    () => filtered.find((r) => r.id === (hoverId ?? selectedId)) ?? null,
    [filtered, selectedId, hoverId]
  );

  async function updateStatus(id: string, next: ReportStatus) {
    const prev = reports;
    setReports((list) => list.map((r) => (r.id === id ? { ...r, status: next } : r)));
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: next })
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;
    } catch (e: any) {
      setReports(prev);
      alert(e?.message ?? "Failed to update status. Are you an admin?");
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports (Admin)</h1>
          <p className="text-sm text-muted-foreground">
            Search, filter, and update status. Switch layouts anytime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button
            variant={view === "listmap" ? "default" : "outline"}
            onClick={() => setView("listmap")}
          >
            <Rows className="h-4 w-4 mr-2" />
            List + Map
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            onClick={() => setView("table")}
          >
            <TableIcon className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ReportStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Body */}
      {loading ? (
        <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>
      ) : err ? (
        <Card className="p-4 text-sm text-red-600">{err}</Card>
      ) : filtered.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No reports found.</Card>
      ) : view === "table" ? (
        <>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{filtered.length} results</Badge>
          </div>
          <Card className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Location</TableHead> {/* 👈 renamed */}
                  <TableHead>Status</TableHead>
                  <TableHead>Edited</TableHead>
                  <TableHead className="w-[220px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const loc =
                    r.address ??
                    (r.lat != null && r.lng != null
                      ? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`
                      : "—");
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{format(new Date(r.created_at), "PPp")}</TableCell>
                      <TableCell title={loc}>
                        {loc}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>{r.edited ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusSelect value={r.status} onChange={(v) => updateStatus(r.id, v)} />
                          <Button variant="outline" size="sm" onClick={load}>
                            Refresh
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      ) : (
        // LIST + MAP view
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{filtered.length} results</Badge>
            </div>
            {filtered.map((r) => {
              const active = r.id === (hoverId ?? selectedId);
              const lat = r.lat ?? null;
              const lng = r.lng ?? null;

              const locationDisplay =
                r.address ??
                (lat != null && lng != null
                  ? `${lat.toFixed(3)}, ${lng.toFixed(3)}`
                  : "Location unavailable");

              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoverId(r.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => setSelectedId(r.id)}
                  className={`rounded-lg border bg-white p-4 shadow-sm cursor-pointer transition
                    ${active ? "ring-2 ring-primary/40" : "hover:shadow"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {/* Title only (pin moves to meta line) */}
                      <h3 className="font-medium truncate">{r.title}</h3>

                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {r.description || "—"}
                      </p>

                      {/* Meta: address (or coords) • date • status */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1" title={locationDisplay}>
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[40ch]">{locationDisplay}</span>
                        </span>
                        <span>•</span>
                        <span>{format(new Date(r.created_at), "PPp")}</span>
                        <StatusBadge status={r.status} />
                        {r.edited && <span>• edited</span>}
                      </div>
                    </div>

                    {/* Hover actions */}
                    <div
                      className={`flex gap-2 ${active ? "opacity-100" : "opacity-0"} transition-opacity`}
                    >
                      {r.status !== "reviewed" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(r.id, "reviewed");
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" /> Reviewed
                        </Button>
                      )}
                      {r.status !== "resolved" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(r.id, "resolved");
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: map */}
          <div className="lg:col-span-3 h-[70vh] rounded-lg overflow-hidden border bg-white">
            <MapContainer
              center={LOYOLA_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(m) => (mapRef.current = m)}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FlyTo
                center={
                  selectedReport && selectedReport.lat != null && selectedReport.lng != null
                    ? [selectedReport.lat, selectedReport.lng]
                    : null
                }
              />

              {filtered
                .filter((r) => r.lat != null && r.lng != null)
                .map((r) => {
                  const active = r.id === (hoverId ?? selectedId);
                  const icon = iconFor(r, active);

                  const popupLoc =
                    r.address ??
                    (r.lat != null && r.lng != null
                      ? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`
                      : "Location unavailable");

                  return (
                    <Marker key={r.id} position={[r.lat as number, r.lng as number]} icon={icon}>
                      <Popup>
                        <div className="space-y-1">
                          <div className="font-medium">{r.title}</div>
                          <div className="text-xs text-muted-foreground">{popupLoc}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "PPp")}
                          </div>
                          <div className="pt-1">
                            <StatusBadge status={r.status} />
                          </div>
                          {r.photo_url && (
                            <div className="mt-2 rounded border overflow-hidden">
                              <img
                                src={r.photo_url}
                                alt={r.title}
                                className="w-full h-auto"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
