// src/pages/admin/Reports.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import { format } from "date-fns";
import { CheckCircle2, Check, MapPin, X, CalendarClock } from "lucide-react";

type ReportStatus = "pending" | "reviewed" | "resolved";

type Report = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  status: ReportStatus;
  edited: boolean;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  address?: string | null;
};

const LOYOLA_CENTER: LatLngExpression = [14.6445, 121.0795];
const DEFAULT_ZOOM = 16;

const STATUS_UI_LABEL: Record<ReportStatus, string> = {
  pending: "Pending",
  reviewed: "In Progress",
  resolved: "Resolved",
};

function svgPin(color: string, accent = "#ffffff") {
  return `
<svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
  <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 25 13 25s13-15.25 13-25C26 5.82 20.18 0 13 0z" fill="${color}"/>
  <circle cx="13" cy="13" r="5.2" fill="${accent}"/>
</svg>`;
}

function divIcon(color: string, selected: boolean) {
  const html = svgPin(selected ? "#2563eb" : color);
  return L.divIcon({
    html,
    className: "sk-div-pin",
    iconSize: [26, 38],
    iconAnchor: [13, 38],
  });
}

function iconFor(r: Report, selected: boolean) {
  if (r.status === "resolved") return divIcon("#22c55e", selected);
  if (r.status === "reviewed") return divIcon("#f59e0b", selected);
  return divIcon("#334155", selected);
}

function FlyTo({ center }: { center: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, DEFAULT_ZOOM, { duration: 0.4 });
  }, [center, map]);
  return null;
}

function StatusPill({ status }: { status: ReportStatus }) {
  const style =
    status === "pending"
      ? "bg-blue-100 text-blue-700"
      : status === "reviewed"
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700";
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${style}`}>
      {STATUS_UI_LABEL[status]}
    </span>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const style =
    status === "pending"
      ? "bg-blue-100 text-blue-700"
      : status === "reviewed"
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700";
  return <span className={`px-2 py-0.5 rounded text-[11px] ${style}`}>{STATUS_UI_LABEL[status]}</span>;
}

function StatusSelect({ value, onChange }: { value: ReportStatus; onChange: (v: ReportStatus) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ReportStatus)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border shadow-md">
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="reviewed">In Progress</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
      </SelectContent>
    </Select>
  );
}

/* ---------- Reverse-geocode helper (UI-only backfill) ---------- */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  try {
    const res = await fetch(
      `${base}/functions/v1/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      { headers: { Accept: "application/json", Authorization: `Bearer ${anon}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

function SideModal({
  open,
  report,
  onClose,
}: {
  open: boolean;
  report: Report | null;
  onClose: () => void;
}) {
  const images: string[] = useMemo(() => {
    if (!report) return [];
    return [report.photo_url as string].filter(Boolean);
  }, [report]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-full sm:w-[520px] bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            {report ? <StatusPill status={report.status} /> : null}
            <h3 className="text-base font-semibold truncate">{report?.title ?? "Report"}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-57px)]">
          <div className="grid grid-cols-[20px,1fr] items-start gap-x-3 gap-y-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">{report ? format(new Date(report.created_at), "PPp") : ""}</div>
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground break-words">
              {/* address shown via injected prop below (computed in parent), fallback to coords */}
              {(report as any)?.__displayAddress ??
                (report?.lat != null && report?.lng != null
                  ? `${report.lat.toFixed(6)}, ${report.lng.toFixed(6)}`
                  : "No location")}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Details</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report?.description || "—"}</p>
          </div>

          {images.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Photo</h4>
              <div className="rounded-xl overflow-hidden border">
                <img
                  src={images[0]}
                  alt="Report photo"
                  className="w-full h-[320px] sm:h-[360px] object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [view] = useState<"listmap" | "table">("listmap");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [expandedCards] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // UI cache for reverse-geocoded addresses of rows that lack address
  const [addrCache, setAddrCache] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id,user_id,title,description,created_at,status,edited,lat,lng,photo_url,address")
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

  useEffect(() => {
    const ch = supabase
      .channel("admin-reports-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Backfill UI address for rows missing it (does not mutate DB)
  useEffect(() => {
    let cancelled = false;
    const targets = reports.filter(
      (r) => !r.address && typeof r.lat === "number" && typeof r.lng === "number" && !addrCache[r.id]
    );
    if (targets.length === 0) return;

    (async () => {
      for (const r of targets) {
        if (cancelled) break;
        const addr = await reverseGeocode(r.lat as number, r.lng as number);
        if (cancelled) break;
        if (addr) setAddrCache((m) => ({ ...m, [r.id]: addr }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reports, addrCache]);

  const filtered = useMemo(() => {
    return reports.filter((r) => (statusFilter === "all" ? true : r.status === statusFilter));
  }, [reports, statusFilter]);

  const selectedReport = useMemo(
    () => filtered.find((r) => r.id === (hoverId ?? selectedId)) ?? null,
    [filtered, selectedId, hoverId]
  );

  // Compute display address from saved address or cache; fall back to precise coords
  const getDisplayAddress = (r: Report) =>
    r.address || addrCache[r.id] || (r.lat != null && r.lng != null ? `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}` : "Location unavailable");

  async function updateStatus(id: string, next: ReportStatus) {
    const prev = reports;
    setReports((list) => list.map((r) => (r.id === id ? { ...r, status: next } : r)));
    try {
      const { error } = await supabase.from("reports").update({ status: next }).eq("id", id).select("id").single();
      if (error) throw error;
    } catch (e: any) {
      setReports(prev);
      alert(e?.message ?? "Failed to update status. Are you an admin?");
    }
  }

  return (
    // LOCK page height to viewport minus header (assumed 64px) and prevent body scrolling here
    <div className="h-[calc(100vh-64px)] p-6 space-y-4 overflow-hidden flex flex-col">
      <style>{`
        .no-scrollbar { scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

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
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Edited</TableHead>
                  <TableHead className="w-[220px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const loc = getDisplayAddress(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{format(new Date(r.created_at), "PPp")}</TableCell>
                      <TableCell title={loc}>{loc}</TableCell>
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
        // MAIN GRID fills remaining height; children can size with min-h-0
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
          {/* LEFT: sticky filter + scrollable list */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* Sticky filter/header row */}
            <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-2">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{filtered.length}</span> results
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter by status:</span>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReportStatus | "all")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-md">
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scrollable list only on the left */}
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-3">
              {filtered.map((r) => {
                const active = r.id === (hoverId ?? selectedId);
                const locationDisplay = getDisplayAddress(r);
                const reviewedActive = r.status === "reviewed";
                const resolvedActive = r.status === "resolved";
                return (
                  <div
                    key={r.id}
                    onMouseEnter={() => setHoverId(r.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => {
                      setSelectedId(r.id);
                      setModalOpen(true);
                    }}
                    className={`rounded-xl bg-white p-4 shadow-sm cursor-pointer transition border-2 ${
                      active ? "border-primary/60 shadow-md" : "border-transparent hover:shadow"
                    }`}
                  >
                    <div className="mb-2">
                      <StatusPill status={r.status} />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{r.title}</h3>
                        <p className={`text-xs text-muted-foreground mt-1 ${expandedCards ? "" : "line-clamp-2"}`}>
                          {r.description || "—"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" title={locationDisplay}>
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
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={resolvedActive ? "default" : "outline"}
                          disabled={resolvedActive}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!resolvedActive) updateStatus(r.id, "resolved");
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolved
                        </Button>
                        <Button
                          size="sm"
                          variant={reviewedActive ? "default" : "outline"}
                          disabled={reviewedActive}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!reviewedActive) updateStatus(r.id, "reviewed");
                          }}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          In&nbsp;Progress
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: map fills the rest, no page scrolling */}
          <div className="lg:col-span-3 h-full rounded-lg overflow-hidden border bg-white">
            <MapContainer
              center={LOYOLA_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: "100%", width: "100%" }}
              whenCreated={(m) => (mapRef.current = m)}
              scrollWheelZoom
              className="z-0"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap &copy; CARTO"
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                errorTileUrl="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
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
                  // Marker uses EXACT stored lat/lng (no rounding) for precision
                  return (
                    <Marker
                      key={r.id}
                      position={[r.lat as number, r.lng as number]}
                      icon={icon}
                      eventHandlers={{
                        click: () => {
                          setSelectedId(r.id);
                          setModalOpen(true);
                        },
                        mouseover: () => setHoverId(r.id),
                        mouseout: () => setHoverId(null),
                      }}
                    />
                  );
                })}
            </MapContainer>
          </div>

          {/* inject computed display address into modal without altering DB */}
          <SideModal
            open={modalOpen}
            report={
              selectedReport
                ? ({ ...selectedReport, __displayAddress: getDisplayAddress(selectedReport) } as any)
                : null
            }
            onClose={() => setModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
