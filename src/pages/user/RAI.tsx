import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvent,
} from "react-leaflet";
import L, { LatLngExpression, Map as LeafletMap } from "leaflet";
import { format } from "date-fns";
import { ImageIcon, MapPin } from "lucide-react";

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

// -------- Map helpers --------
// Loyola Heights approximate center
const LOYOLA_CENTER: LatLngExpression = [14.6415, 121.0745];
const DEFAULT_ZOOM = 15;

// Fix Leaflet default icon in Vite
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
(L.Marker.prototype as any).options.icon = DefaultIcon;

const BlueIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const OrangeIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet-color-markers@1.0.0/img/marker-icon-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function iconFor(r: Report, selected: boolean) {
  if (r.status === "solved") return null; // hidden
  if (selected) return BlueIcon;
  if (r.status === "working") return OrangeIcon;
  return DefaultIcon; // new
}

// -------- Mock API (swap to Django later) --------
const USE_MOCK = true;

let mockReports: Report[] = [
  {
    id: "r1",
    title: "Fallen tree on sidewalk",
    description: "Along Xavierville Ave. Blocking part of the road.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: "new",
    location: { lat: 14.6437, lng: 121.0714 },
    address: "Xavierville Ave, Loyola Heights",
    user: { name: "Ana C." },
    image_url: null,
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
    image_url: null,
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
    image_url: null,
  },
];

async function apiListReports(): Promise<Report[]> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 120));
    return mockReports;
  }
  const res = await fetch("/api/reports/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load reports");
  return res.json();
}

async function apiCreateReport(
  data: Omit<Report, "id" | "created_at" | "status"> & { image?: File | null }
): Promise<Report> {
  if (USE_MOCK) {
    // Mock image upload: object URL (replace with Django upload)
    const image_url = data.image ? URL.createObjectURL(data.image) : null;
    const created: Report = {
      id: String(Date.now()),
      title: data.title,
      description: data.description,
      created_at: new Date().toISOString(),
      status: "new",
      location: data.location,
      address: data.address,
      user: data.user,
      image_url,
    };
    mockReports = [created, ...mockReports];
    await new Promise((r) => setTimeout(r, 180));
    return created;
  }

  const form = new FormData();
  form.append("title", data.title);
  if (data.description) form.append("description", data.description);
  form.append("lat", String(data.location.lat));
  form.append("lng", String(data.location.lng));
  if (data.address) form.append("address", data.address);
  if (data.image) form.append("image", data.image);

  const res = await fetch("/api/reports/", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create report");
  return res.json();
}

// -------- Map helpers --------
function FlyTo({ center }: { center: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, DEFAULT_ZOOM, { duration: 0.5 });
  }, [center, map]);
  return null;
}

// Capture clicks to open create modal with lat/lng
function ClickToCreate({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvent("click", (e) => {
    onPick(e.latlng.lat, e.latlng.lng);
  });
  return null;
}

// -------- Modals --------
function CreateReportModal({
  open,
  onClose,
  latLng,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  latLng: { lat: number; lng: number } | null;
  onCreated: (r: Report) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // reset when re-opening
    if (open) {
      setTitle("");
      setDesc("");
      setImage(null);
      setPreview(null);
    }
  }, [open]);

  const submit = async () => {
    if (!latLng) return;
    if (!title.trim()) {
      alert("Please provide a report title.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiCreateReport({
        title: title.trim(),
        description: desc.trim(),
        location: latLng,
        address: undefined, // could be reverse-geocoded on backend
        user: { name: "You" }, // derive from session later
        image,
      });
      onCreated(created);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      {/* Left-anchored panel; high z-index so it sits above Leaflet */}
      <DialogContent
        className="
          fixed top-1/2 left-[30%] -translate-y-1/2
          z-[10000] w-[360px] sm:w-[420px] max-w-none
          bg-white border rounded-xl shadow-2xl
          p-0
        "
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Report an incident</DialogTitle>
          <DialogDescription>
            Clicked at:{" "}
            {latLng ? `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}` : "—"}
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
                setPreview(file ? URL.createObjectURL(file) : null);
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
          <Button onClick={submit} disabled={saving}>
            {saving ? "Submitting…" : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailsModal({
  report,
  onClose,
}: {
  report: Report | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!report} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>{report?.title}</DialogTitle>
          <DialogDescription>
            {report &&
              `${format(new Date(report.created_at), "PPp")} • ${report.location.lat.toFixed(
                5
              )}, ${report.location.lng.toFixed(5)}`}
          </DialogDescription>
        </DialogHeader>

        {report?.image_url ? (
          <div className="rounded border overflow-hidden">
            <img src={report.image_url} alt={report.title} className="w-full h-auto" />
          </div>
        ) : (
          <div className="rounded border p-4 text-sm text-muted-foreground flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> No photo attached
          </div>
        )}

        {report?.description && (
          <div className="pt-2 text-sm">{report.description}</div>
        )}

        <div className="pt-2">
          <StatusBadge status={report?.status ?? "new"} />
        </div>
      </DialogContent>
    </Dialog>
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
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] ${style}`}>{label}</span>
  );
}

// -------- Page --------
export default function RAI() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLatLng, setCreateLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const [detailsOpenId, setDetailsOpenId] = useState<string | null>(null);

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

  const visiblePins = reports.filter((r) => r.status !== "solved");

  // When user clicks on map, open create modal
  const onMapPick = (lat: number, lng: number) => {
    setCreateLatLng({ lat, lng });
    setCreateOpen(true);
  };

  // After creation, update local list (admin page will also see it when wired to real API)
  const handleCreated = (r: Report) => {
    setReports((arr) => [r, ...arr]);
    mapRef.current?.flyTo([r.location.lat, r.location.lng], DEFAULT_ZOOM, {
      duration: 0.5,
    });
  };

  return (
    <div className="mx-auto max-w-7xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Report an Incident</h1>
        <Badge variant="secondary" className="uppercase">
          User
        </Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: list (read-only) */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <Card className="p-4 text-sm text-muted-foreground">
              Loading reports…
            </Card>
          ) : reports.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">
              No reports yet. Click on the map to create one.
            </Card>
          ) : (
            reports.map((r) => {
              const active = r.id === (hoverId ?? selectedId);
              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoverId(r.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => setDetailsOpenId(r.id)}
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
                        {r.address && (
                          <span className="text-muted-foreground">
                            • {r.address}
                          </span>
                        )}
                        <StatusBadge status={r.status} />
                      </div>
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

            {/* Click to create */}
            <ClickToCreate onPick={onMapPick} />

            {/* Fly to hover/selected */}
            <FlyTo
              center={
                selectedReport
                  ? [selectedReport.location.lat, selectedReport.location.lng]
                  : null
              }
            />

            {/* Pins (hide solved) */}
            {visiblePins.map((r) => {
              const active = r.id === (hoverId ?? selectedId);
              const icon = iconFor(r, active);
              if (!icon) return null;
              return (
                <Marker
                  key={r.id}
                  position={[r.location.lat, r.location.lng]}
                  icon={icon}
                  eventHandlers={{
                    mouseover: () => setHoverId(r.id),
                    mouseout: () => setHoverId(null),
                    click: () => setDetailsOpenId(r.id),
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <div className="font-medium">{r.title}</div>
                      {r.address && (
                        <div className="text-xs text-muted-foreground">
                          {r.address}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "PPp")}
                      </div>
                      <div className="pt-1">
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Create report modal */}
      <CreateReportModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        latLng={createLatLng}
        onCreated={handleCreated}
      />

      {/* Details modal */}
      <DetailsModal
        report={reports.find((r) => r.id === detailsOpenId) ?? null}
        onClose={() => setDetailsOpenId(null)}
      />
    </div>
  );
}
