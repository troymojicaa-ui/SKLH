import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import { format } from "date-fns";
import { CheckCircle2, Clock, MapPin } from "lucide-react";

// -------- Types --------
type ReportStatus = "new" | "working" | "solved";

type Report = {
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

// -------- Mock / API --------
const USE_MOCK = true;

const mockReports: Report[] = [
  {
    id: "r1",
    title: "Fallen tree on sidewalk",
    description: "Along Xavierville Ave. Blocking part of the road.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: "new",
    location: { lat: 14.6437, lng: 121.0714 },
    address: "Xavierville Ave, Loyola Heights",
    user: { name: "Ana C." },
  },
  {
    id: "r2",
    title: "Street light not working",
    description: "Near the barangay hall entrance.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    status: "working",
    location: { lat: 14.6399, lng: 121.0741 },
    address: "Barangay Hall, Loyola Heights",
    user: { name: "Miguel R." },
  },
  {
    id: "r3",
    title: "Clogged drainage",
    description: "Water backing up after rain.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    status: "solved",
    location: { lat: 14.6421, lng: 121.0772 },
    address: "Esteban Abada St, Loyola Heights",
    user: { name: "Leah D." },
  },
];

async function apiListReports(): Promise<Report[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 150));
    return mockReports;
  }
  const res = await fetch("/api/reports/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load reports");
  return res.json();
}

async function apiUpdateReportStatus(id: string, status: ReportStatus): Promise<void> {
  if (USE_MOCK) {
    const r = mockReports.find((x) => x.id === id);
    if (r) r.status = status;
    await new Promise((r) => setTimeout(r, 120));
    return;
  }
  const res = await fetch(`/api/reports/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
}

// -------- Map helpers --------
// Loyola Heights approximate center
const LOYOLA_CENTER: LatLngExpression = [14.6415, 121.0745];
const DEFAULT_ZOOM = 15;

// Fix Leaflet default icon in Vite
const DefaultIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const BlueIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-blue.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const OrangeIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-orange.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const GreenIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-green.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function iconFor(r: Report, selected: boolean) {
  if (selected) return BlueIcon;
  if (r.status === "working") return OrangeIcon;
  if (r.status === "solved") return GreenIcon;
  return DefaultIcon;
}

// Fly map to a point when selection changes
function FlyTo({ center }: { center: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, DEFAULT_ZOOM, { duration: 0.5 });
  }, [center, map]);
  return null;
}

// -------- UI --------
export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await apiListReports();
        setReports(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === (hoverId ?? selectedId)) ?? null,
    [reports, selectedId, hoverId]
  );

  const setStatus = async (id: string, status: ReportStatus) => {
    // optimistic
    setReports((arr) => arr.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await apiUpdateReportStatus(id, status);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Badge variant="secondary" className="uppercase">Admin</Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: list */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <Card className="p-4 text-sm text-muted-foreground">Loading reports…</Card>
          ) : reports.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">No reports yet.</Card>
          ) : (
            reports.map((r) => {
              const active = r.id === (hoverId ?? selectedId);
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
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <h3 className="font-medium truncate">{r.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {r.description || "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(r.created_at), "PPp")}
                        </span>
                        {r.address && <span className="text-muted-foreground">• {r.address}</span>}
                        {r.user?.name && <span className="text-muted-foreground">• by {r.user.name}</span>}
                        <StatusBadge status={r.status} />
                      </div>
                    </div>

                    {/* Hover actions */}
                    <div className={`flex gap-2 ${active ? "opacity-100" : "opacity-0"} transition-opacity`}>
                      {r.status !== "working" && (
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setStatus(r.id, "working"); }}>
                          <Clock className="h-4 w-4 mr-1" /> Working
                        </Button>
                      )}
                      {r.status !== "solved" && (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); setStatus(r.id, "solved"); }}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Solved
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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

            <FlyTo center={selectedReport ? [selectedReport.location.lat, selectedReport.location.lng] : null} />

            {reports.map((r) => {
              const active = r.id === (hoverId ?? selectedId);
              const icon = iconFor(r, active);
              return (
                <Marker key={r.id} position={[r.location.lat, r.location.lng]} icon={icon}>
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-medium">{r.title}</div>
                      {r.address && <div className="text-xs text-muted-foreground">{r.address}</div>}
                      <div className="text-xs text-muted-foreground">{format(new Date(r.created_at), "PPp")}</div>
                      <div className="pt-1"><StatusBadge status={r.status} /></div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

// Small status pill
function StatusBadge({ status }: { status: ReportStatus }) {
  const style =
    status === "new"
      ? "bg-blue-100 text-blue-700"
      : status === "working"
      ? "bg-amber-100 text-amber-700"
      : "bg-green-100 text-green-700";
  const label =
    status === "new" ? "New" : status === "working" ? "Working on it" : "Solved";
  return <span className={`px-2 py-0.5 rounded text-[11px] ${style}`}>{label}</span>;
}
